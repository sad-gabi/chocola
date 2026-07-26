import { JSDOM } from "jsdom";
import { protectCurlyBraces } from "../utils.js";
import { genRandomId, incrementAlfabet, throwError, deterministicHash } from "./utils.js";
import {
  extractPropsDefaults, extractRuntime, extractTopLevelFunctions,
  extractContextFromElement, hasDelIfAttr, getDelIfAttr, removeDelIfAttr,
  reservedAttrs, validateChainStructure, applyConditionalToElement, interpolateNode,
  scopeCss, compileExpression,
} from "../parser/index.js";
import chalk from "./chalk.js";



class ProcessContext {
  constructor(loadedComponents, runtimeChunks, compIdColl, letterState, runtimeMap, cssScopes, cssScopesMap, scopedStyles, staticCtxRegistry) {
    this.loadedComponents = loadedComponents;
    this.runtimeChunks = runtimeChunks;
    this.compIdColl = compIdColl;
    this.letterState = letterState;
    this.runtimeMap = runtimeMap;
    this.cssScopes = cssScopes;
    this.cssScopesMap = cssScopesMap;
    this.scopedStyles = scopedStyles;
    this.staticCtxRegistry = staticCtxRegistry;
  }
}



export function processComponentElement(
  element,
  cx,
  renderChain = [],
  sourceFile,
  sourceContent,
  persistentCssMap = {},
  usedComponents = null
) {
  const tagName = element.tagName.toLowerCase();
  const compName = tagName + ".html";
  let instance = cx.loadedComponents.get(compName);

  if (!instance || instance === undefined) return false;
  if (renderChain && renderChain.includes(compName)) return false;

  instance = protectCurlyBraces(instance);
  const dom = new JSDOM(instance);
  const doc = dom.window.document;
  let script = doc.querySelector("script")?.innerHTML;
  let template = doc.querySelector("template")?.innerHTML;
  let styles = doc.querySelector("style")?.innerHTML;

  if (!template) {
    console.warn(chalk.yellow(`${compName} — component is missing a <template>`));
    return false;
  }

  const compProps = extractPropsDefaults(script);

  let ctx;
  if (cx.staticCtxRegistry && cx.staticCtxRegistry.has(element)) {
    ctx = cx.staticCtxRegistry.get(element);
  } else {
    ctx = extractContextFromElement(element);
    cx.staticCtxRegistry && cx.staticCtxRegistry.set(element, ctx);
  }

  if (compProps.length > 0) {
    compProps.forEach(({ name, defaultValue }) => {
      if (defaultValue !== undefined && !(name in ctx)) {
        try {
          ctx[name] = compileExpression(defaultValue, false)();
        } catch {
          ctx[name] = defaultValue;
        }
      }
    });
  }

  const topFuncSrc = extractTopLevelFunctions(script || "", RUNTIME_KW);
  for (const src of topFuncSrc) {
    try {
      const fn = (0, eval)("(" + src + ")");
      const name = fn.name;
      if (name && !(name in ctx)) ctx[name] = fn;
    } catch {}
  }

  const elInnerHtml = element.innerHTML;

  const ctxProxy = new Proxy(ctx, {
    has() { return true; },
    get(target, key) { return target[key]; }
  });

  const fragment = JSDOM.fragment(template);

  const slotFragment = JSDOM.fragment(elInnerHtml);
  if (sourceFile) {
    validateChainStructure(slotFragment, sourceFile, sourceContent, elInnerHtml);
  }
  validateChainStructure(fragment, instance.__sourceFile || compName, instance, template);
  Array.from(fragment.querySelectorAll("slot")).forEach(slot => {
    slot.replaceWith(slotFragment);
  });

  const childEntries = Array.from(fragment.querySelectorAll("*")).map(el => ({
    el,
    parent: el.parentNode
  }));
  const condChains = new Map();
  const bindings = [];
  const elBindIds = new Map();
  let bindCounter = 0;

  childEntries.forEach(({ el: child, parent }) => {
    if (!condChains.has(parent)) {
      condChains.set(parent, { active: false, rendered: false });
    }
    const condChain = condChains.get(parent);

    const hasIf = child.hasAttribute("if");
    const hasDelIf = hasDelIfAttr(child);
    const hasElif = child.hasAttribute("elif");
    const hasElse = child.hasAttribute("else");

    if (hasElif || hasElse) {
      if (!condChain.active) {
        throwError(`${instance.__sourceFile || compName}: <${child.tagName.toLowerCase()}> has ${hasElif ? "elif" : "else"} without a preceding if/del-if sibling`);
      }
      if (condChain.rendered) {
        child.remove();
        if (hasElse) {
          condChain.active = false;
        }
        return;
      }
    }

    if (child.tagName.toLowerCase() === "void") {
      if (hasElif || hasElse) {
        if (hasElif) {
          const expr = child.getAttribute("elif").slice(1, -1);
          const fn = compileExpression(expr, true);
          if (!fn(ctxProxy)) {
            child.remove();
            return;
          }
        }
        child.replaceWith(...child.children);
        condChain.rendered = true;
        if (hasElse) {
          condChain.active = false;
        }
      } else if (hasIf || hasDelIf) {
        const raw = hasIf ? child.getAttribute("if") : getDelIfAttr(child);
        const expr = raw.slice(1, -1);
        const fn = compileExpression(expr, true);
        condChain.active = true;
        if (fn(ctxProxy)) {
          child.replaceWith(...child.children);
          condChain.rendered = true;
        } else {
          child.remove();
          condChain.rendered = false;
        }
      } else {
        child.replaceWith(...child.children);
        condChain.active = false;
        condChain.rendered = false;
      }
      return;
    }

    Array.from(child.attributes).forEach(attribute => {
      if (!attribute || attribute === undefined) return;
      if (reservedAttrs.includes(attribute.name)) return;

      if (attribute.name.startsWith("bind:")) {
        const prop = attribute.name.slice(5);
        const varName = attribute.value;
        let bindId = elBindIds.get(child);
        if (!bindId) {
          bindId = "b" + (bindCounter++);
          elBindIds.set(child, bindId);
          child.setAttribute("data-chbind-" + bindId, "");
        }
        bindings.push({ prop, varName, bindId });
        child.removeAttribute(attribute.name);
        return;
      }

      attribute.value = attribute.value.replace(
        /\{([^}]+)\}/g,
        (_, expr) => {
          try {
            return compileExpression(expr, true)(ctxProxy);
          } catch {
            return "";
          }
        }
      );
    });

    processComponentElement(
      child,
      cx,
      renderChain.concat(compName),
      compName,
      template,
      persistentCssMap,
      usedComponents
    );

    applyConditionalToElement(child, ctxProxy, condChain, hasIf, hasDelIf, hasElif, hasElse);

    interpolateNode(child, ctxProxy)
  });

  const firstChild = fragment.children[0];

  if (firstChild && firstChild.nodeType === 1) {
    if (script) {
      const compId = "chid-" + genRandomId(cx.compIdColl);
      firstChild.setAttribute("chid", compId);

      const ctxRegex = /ctx\s*=\s*({.*?})/;
      const ctxMatch = script.match(ctxRegex);
      let runtimeCtx = {};
      if (ctxMatch) {
        try {
          runtimeCtx = JSON.parse(ctxMatch[1].replace(/(\w+):/g, '"$1":'));
        } catch (e) {
          runtimeCtx = {};
        }
      }
      const ctxDefParts = [];
      const declared = new Set();
      for (const [key, value] of Object.entries(runtimeCtx)) {
        ctxDefParts.push(`let ${key} = ctx.${key}||${JSON.stringify(value)};\n`);
        declared.add(key);
      }

      for (const { name, defaultValue } of compProps) {
        if (declared.has(name)) continue;
        if (defaultValue !== undefined) {
          ctxDefParts.push(`let ${name} = ctx.${name}||${defaultValue};\n`);
        } else {
          ctxDefParts.push(`let ${name} = ctx.${name};\n`);
        }
      }

      const ctxDef = ctxDefParts.join("");

      script = script.replace(ctxRegex, "ctx");

      let runtime = extractRuntime(script, compName);

      if (runtime) {
        let letterEntry = cx.runtimeMap && cx.runtimeMap.get(compName);
        let letter;
        if (!letterEntry) {
          letter = getNextLetter(cx.letterState);
          const topFuncs = topFuncSrc;

          let injectCode = ctxDef;
          if (bindings.length > 0) {
            injectCode += "\n" + bindings.map(b => {
              const accessor = b.prop === "self" ? "" : "." + b.prop;
              return "let " + b.varName + " = self.querySelector('[data-chbind-" + b.bindId + "]')" + accessor + ";";
            }).join("\n") + "\n";
          }
          if (topFuncs.length > 0) {
            injectCode += "\n" + topFuncs.join("\n\n") + "\n";
          }
          runtime = runtime.replace(/\$runtime\([^)]*\)\s*\{/, match => match + "\n" + injectCode);

          runtime = runtime.replace(`${RUNTIME_KW}()`, `${letter}r(self, ctx)`);
          cx.runtimeChunks.push(runtime);
          cx.runtimeMap && cx.runtimeMap.set(compName, { letter });
        } else {
          letter = letterEntry.letter;
        }

        cx.runtimeChunks.push(`${letter}r(document.querySelector('[chid="${compId}"]'), ${JSON.stringify(ctx)});`);
      }
    }
  }

  if (styles) {
    let cssId = cx.cssScopesMap && cx.cssScopesMap.get(compName);
    if (!cssId) {
      cssId = persistentCssMap[compName];
      if (!cssId) {
        cssId = deterministicHash(compName, 8);
      }
      cx.cssScopesMap.set(compName, cssId);
    }
    if (usedComponents) usedComponents.add(compName);
    if (fragment.children.length === 1 && firstChild.nodeType === 1) {
      firstChild.classList.add(cssId);
    }
    styles = scopeCss(styles, cssId);
    cx.scopedStyles.push(styles);
  }

  element.replaceWith(fragment);
  return true;
}

export function processAllComponents(appElements, loadedComponents, pageSourceFile, pageSourceContent, persistentCssMap = {}) {
  const usedComponents = new Set();
  const cx = new ProcessContext(
    loadedComponents, [], [], { value: null }, new Map(), [], new Map(), [], new Map()
  );

  appElements.forEach(el => {
    if (!el.isConnected) return;
    processComponentElement(el, cx, [], pageSourceFile, pageSourceContent, persistentCssMap, usedComponents);
  });
  const runtimeScript = cx.runtimeChunks.join("\n");
  const hasComponents = cx.runtimeChunks.length > 0;
  const scopesCss = cx.scopedStyles.join("\n");

  return { runtimeScript, hasComponents, scopesCss, usedComponents, cssScopesMap: cx.cssScopesMap };
}

function getNextLetter(letterState) {
  if (!letterState.value) {
    letterState.value = "a";
  } else {
    letterState.value = incrementAlfabet(letterState.value);
  }
  return letterState.value;
}

const RUNTIME_KW = "$runtime";
