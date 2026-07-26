import { JSDOM } from "jsdom";
import { extractContextFromElement } from "./dom-processor.js";
import { genRandomId, incrementAlfabet, throwError, protectCurlyBraces, compileExpression, hasDelIfAttr, getDelIfAttr, removeDelIfAttr } from "./utils.js";
import chalk from "./chalk.js";
import beautify from "js-beautify";

function hasCombinator(sel) {
  let depth = 0;
  for (const ch of sel) {
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    else if (depth === 0 && (ch === ' ' || ch === '>' || ch === '+' || ch === '~')) return true;
  }
  return false;
}

function scopeSelector(sel, cssId) {
  const s = sel.trim();
  if (s.startsWith("." + cssId)) return s;
  if (hasCombinator(s)) return `.${cssId} ${s}`;
  return `.${cssId}${s}, .${cssId} ${s}`;
}

function scopeCss(cssString, cssId) {
  const keyframeRegex = /@(-webkit-)?keyframes\s+(\S+)/gi;
  const animNames = new Set();
  let match;
  while ((match = keyframeRegex.exec(cssString))) {
    animNames.add(match[2]);
  }

  if (animNames.size > 0) {
    const sorted = [...animNames].sort((a, b) => b.length - a.length);
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const name of sorted) {
      cssString = cssString.replace(
        new RegExp(`(@(?:-webkit-)?keyframes\\s+)${esc(name)}`, "gi"),
        `$1${name}-${cssId}`
      );
      cssString = cssString.replace(
        new RegExp(`((?:animation|animation-name)\\s*:\\s*[^;{]*?)\\b${esc(name)}\\b`, "gi"),
        `$1${name}-${cssId}`
      );
    }
  }

  function findMatchingBrace(s, openIndex) {
    let depth = 0;
    for (let i = openIndex; i < s.length; i++) {
      const ch = s[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return s.length - 1;
  }

  const scopeInnerAtRules = new Set(["@media", "@supports", "@container", "@layer"]);

  function processBlock(str) {
    str = str.replaceAll(":root", `.${cssId}`);

    let out = "";
    let i = 0;
    while (i < str.length) {
      const braceIndex = str.indexOf('{', i);
      if (braceIndex === -1) {
        out += str.slice(i);
        break;
      }
      const header = str.substring(i, braceIndex);
      const endBrace = findMatchingBrace(str, braceIndex);
      const inner = str.substring(braceIndex + 1, endBrace);

      if (header.trim().startsWith("@")) {
        const atKeyword = header.trim().split(/\s+/)[0].toLowerCase();
        if (scopeInnerAtRules.has(atKeyword)) {
          out += header + "{" + processBlock(inner) + "}";
        } else {
          out += header + "{" + inner + "}";
        }
      } else {
        const innerScoped = processBlock(inner);
        const selectors = header
          .split(",")
          .map(s => s.trim())
          .filter(Boolean);
        const scopedHeader = selectors.length > 0
          ? selectors.map(sel => scopeSelector(sel, cssId)).join(", ")
          : header;
        out += scopedHeader + "{" + innerScoped + "}";
      }

      i = endBrace + 1;
    }
    return out;
  }

  return processBlock(cssString);
}

function extractPropsDefaults(script) {
  if (!script) return [];
  const propsRegex = /export\s+let\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*(?:=\s*([^;]+))?;/g;
  let props = [];
  let match;
  while ((match = propsRegex.exec(script)) !== null) {
    props.push({ name: match[1].trim(), defaultValue: match[2]?.trim() });
  }
  return props;
}

function interpolateNode(root, ctxProxy) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (node.nodeType === 3) {
      node.textContent = node.textContent.replace(/\{([^}]+)\}/g, (_, expr) => {
        try {
          return compileExpression(expr, true)(ctxProxy);
        } catch {
          return "";
        }
      });
    } else {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        stack.push(node.childNodes[i]);
      }
    }
  }
}

function getLineNumber(sourceContent, parentContent, idxInParent) {
  if (sourceContent === parentContent) {
    return parentContent.substring(0, idxInParent).split("\n").length;
  }
  const templateStartMatch = sourceContent.match(/<template[^>]*>/);
  if (templateStartMatch) {
    const contentStart = templateStartMatch.index + templateStartMatch[0].length;
    const beforeContent = sourceContent.substring(0, contentStart);
    const linesInBefore = beforeContent.split("\n").length;
    const linesInTemplate = parentContent.substring(0, idxInParent).split("\n").length;
    return linesInBefore + linesInTemplate - 1;
  }
  return null;
}

function validateChainStructure(parent, sourceFile, sourceContent, parentContent) {
  const children = [...parent.children];
  let chainActive = false;

  for (const child of children) {
    const hasIf = child.hasAttribute("if");
    const hasDelIf = hasDelIfAttr(child);
    const hasElif = child.hasAttribute("elif");
    const hasElse = child.hasAttribute("else");

    if (hasElif || hasElse) {
      if (!chainActive) {
        const tag = child.tagName.toLowerCase();
        const attr = hasElif ? "elif" : "else";
        let loc = sourceFile;
        if (sourceContent && parentContent) {
          const idx = parentContent.indexOf(child.outerHTML);
          if (idx !== -1) {
            const lineNum = getLineNumber(sourceContent, parentContent, idx);
            if (lineNum !== null) loc = `${sourceFile}:${lineNum}`;
          }
        }
        throwError(`${loc}\n    <${tag}> has ${attr} without a preceding if/del-if sibling`);
      }
      if (hasElse) {
        chainActive = false;
      }
    }

    if (hasIf || hasDelIf) {
      chainActive = true;
    } else if (!hasElif && !hasElse) {
      chainActive = false;
    }

    validateChainStructure(child, sourceFile, sourceContent, parentContent);
  }
}

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

const reservedAttrs = ["if", "del:if", "elif", "else"];

function extractTopLevelFunctions(script, excludeName) {
  const funcs = [];
  let i = 0;
  let depth = 0;
  let inStr = false;
  let strChar = null;

  while (i < script.length) {
    const ch = script[i];

    if (inStr) {
      if (ch === '\\') i++;
      else if (ch === strChar) inStr = false;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = true;
      strChar = ch;
      i++;
      continue;
    }

    if (ch === '{') { depth++; i++; continue; }
    if (ch === '}') { depth--; i++; continue; }

    if (depth === 0) {
      const rest = script.slice(i);
      const m = rest.match(/^(?:async\s+)?function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(/);
      if (m) {
        const name = m[1];
        const pastParen = i + m[0].length;

        let parenDepth = 1;
        let p = pastParen;
        while (p < script.length && parenDepth > 0) {
          if (script[p] === '(') parenDepth++;
          if (script[p] === ')') parenDepth--;
          p++;
        }

        while (p < script.length && script[p] !== '{') p++;
        if (p >= script.length) { i++; continue; }

        let bDepth = 1;
        let bodyStr = false;
        let bodyStrChar = null;
        let end = p + 1;
        while (end < script.length && bDepth > 0) {
          const c = script[end];
          if (bodyStr) {
            if (c === '\\') end++;
            else if (c === bodyStrChar) bodyStr = false;
            end++;
            continue;
          }
          if (c === '"' || c === "'" || c === '`') {
            bodyStr = true;
            bodyStrChar = c;
            end++;
            continue;
          }
          if (c === '{') bDepth++;
          if (c === '}') bDepth--;
          end++;
        }

        if (name !== excludeName) {
          funcs.push(script.slice(i, end));
        }
        i = end;
        continue;
      }
    }
    i++;
  }

  return funcs;
}

function extractRuntime(script, compName) {
  const startRegex = /(?:async\s+)?function\s+\$runtime\(([^)]*)\)\s*\{/;
  const match = script.match(startRegex);
  if (!match) return null;

  const startIndexBrace = match.index + match[0].length - 1;
  let bracesCount = 0;
  let inString = false;
  let stringChar = null;

  for (let i = startIndexBrace; i < script.length; i++) {
    const ch = script[i];

    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === stringChar) inString = false;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }

    if (ch === '{') {
      bracesCount++;
    } else if (ch === '}') {
      bracesCount--;
      if (bracesCount === 0) {
        return script.substring(match.index, i + 1);
      }
    }
  }

  throw new Error(`${compName} $runtime function has unclosed curly braces.`);
}

function applyConditionalToElement(child, ctxProxy, condChain, hasIf, hasDelIf, hasElif, hasElse) {
  if (hasIf) {
    const expr = child.getAttribute("if").slice(1, -1);
    const fn = compileExpression(expr, true);
    condChain.active = true;
    if (fn(ctxProxy)) {
      condChain.rendered = true;
    } else {
      child.style.display = "none";
      condChain.rendered = false;
    }
    child.removeAttribute("if");
  } else if (hasDelIf) {
    const expr = getDelIfAttr(child).slice(1, -1);
    const fn = compileExpression(expr, true);
    condChain.active = true;
    if (fn(ctxProxy)) {
      condChain.rendered = true;
    } else {
      child.remove();
      condChain.rendered = false;
    }
    removeDelIfAttr(child);
  } else if (hasElif) {
    const expr = child.getAttribute("elif").slice(1, -1);
    const fn = compileExpression(expr, true);
    if (fn(ctxProxy)) {
      condChain.rendered = true;
    } else {
      child.remove();
    }
    child.removeAttribute("elif");
  } else if (hasElse) {
    condChain.rendered = true;
    condChain.active = false;
    child.removeAttribute("else");
  } else {
    condChain.active = false;
    condChain.rendered = false;
  }
}

export function processComponentElement(
  element,
  cx,
  renderChain = [],
  sourceFile,
  sourceContent
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
        const bindId = "b" + (bindCounter++);
        child.setAttribute("data-chbind", bindId);
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
      template
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
          const topFuncs = extractTopLevelFunctions(script, RUNTIME_KW);

          let injectCode = ctxDef;
          if (bindings.length > 0) {
            injectCode += "\n" + bindings.map(b => {
              const accessor = b.prop === "self" ? "" : "." + b.prop;
              return "let " + b.varName + " = self.querySelector('[data-chbind=\"" + b.bindId + "\"]')" + accessor + ";";
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
      cssId = genRandomId(cx.cssScopes, 8, true);
      cx.cssScopesMap.set(compName, cssId);
    }
    if (fragment.children.length === 1 && firstChild.nodeType === 1) {
      firstChild.classList.add(cssId);
    }
    styles = scopeCss(styles, cssId);
    cx.scopedStyles.push(styles);
  }

  if (fragment.children.length === 1 && firstChild.nodeType === 1) {
    firstChild.setAttribute("data-ch-source", compName);
  }

  element.replaceWith(fragment);
  return true;
}

export function processAllComponents(appElements, loadedComponents, pageSourceFile, pageSourceContent) {
  const cx = new ProcessContext(
    loadedComponents, [], [], { value: null }, new Map(), [], new Map(), [], new Map()
  );

  appElements.forEach(el => {
    if (!el.isConnected) return;
    processComponentElement(el, cx, [], pageSourceFile, pageSourceContent);
  });
  const runtimeScript = cx.runtimeChunks.join("\n");
  const hasComponents = cx.runtimeChunks.length > 0;
  const scopesCss = beautify.css(cx.scopedStyles.join("\n"));

  return { runtimeScript, hasComponents, scopesCss };
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
