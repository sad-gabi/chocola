import { JSDOM } from "jsdom";
import { extractContextFromElement } from "./dom-processor.js";
import { genRandomId, incrementAlfabet, throwError, protectCurlyBraces, compileExpression } from "./utils.js";
import chalk from "chalk";
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

function hasDelIfAttr(el) {
  return el.hasAttribute("del:if");
}
function getDelIfAttr(el) {
  return el.getAttribute("del:if");
}
function removeDelIfAttr(el) {
  el.removeAttribute("del:if");
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
        if (sourceContent && sourceContent === parentContent) {
          const idx = parentContent.indexOf(child.outerHTML);
          if (idx !== -1) {
            loc = `${sourceFile}:${parentContent.substring(0, idx).split("\n").length}`;
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

/**
 * Processes a single component element and inserts it into the DOM
 * @param {Element} element
 * @param {Map} loadedComponents
 * @param {Array} runtimeChunks
 * @param {Array} compIdColl
 * @param {object} letterState - { value: string }
 * @returns {boolean} - true if component was processed, false if not found
 */
export function processComponentElement(
  element,
  loadedComponents,
  runtimeChunks,
  compIdColl,
  letterState,
  runtimeMap,
  cssScopes,
  cssScopesMap,
  scopedStyles,
  renderChain = [],
  staticCtxRegistry,
  sourceFile,
  sourceContent
) {
  const tagName = element.tagName.toLowerCase();
  const compName = tagName + ".html";
  let instance = loadedComponents.get(compName);

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

  // Extract props with defaults from component script
  const compProps = extractPropsDefaults(script);

  let ctx;
  if (staticCtxRegistry && staticCtxRegistry.has(element)) {
    ctx = staticCtxRegistry.get(element);
  } else {
    ctx = extractContextFromElement(element);
    staticCtxRegistry && staticCtxRegistry.set(element, ctx);
  }

  // Apply default values for props not provided on the element
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
  validateChainStructure(fragment, instance.__sourceFile || compName, template, template);
  Array.from(fragment.querySelectorAll("slot")).forEach(slot => {
    slot.replaceWith(slotFragment);
  });

  const childEntries = Array.from(fragment.querySelectorAll("*")).map(el => ({
    el,
    parent: el.parentNode
  }));
  const condChains = new Map();

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

    const reservedAttrs = ["if", "del:if", "elif", "else"];

    Array.from(child.attributes).forEach(attribute => {
      if (!attribute || attribute === undefined) return;
      if (reservedAttrs.includes(attribute.name)) return;
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
      loadedComponents,
      runtimeChunks,
      compIdColl,
      letterState,
      runtimeMap,
      cssScopes,
      cssScopesMap,
      scopedStyles,
      renderChain.concat(compName),
      staticCtxRegistry,
      compName,
      template
    );

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

    interpolateNode(child, ctxProxy)
  });

  const firstChild = fragment.children[0];

  if (firstChild && firstChild.nodeType === 1) {
    if (script) {
      const compId = "chid-" + genRandomId(compIdColl);
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
      let ctxDef = "";
      for (const [key, value] of Object.entries(runtimeCtx)) {
        ctxDef += `ctx.${key} = ctx.${key}||${JSON.stringify(value)};\n`;
      }
      // Add defaults from export let declarations
      for (const { name, defaultValue } of compProps) {
        if (defaultValue !== undefined) {
          ctxDef += `ctx.${name} = ctx.${name}||${defaultValue};\n`;
        }
      }

      script = script.replace(ctxRegex, "ctx");

      function extractRuntime(script) {
        const startRegex = /(?:async\s+)?function\s+\$runtime\(([^)]*)\)\s*\{/;
        const match = script.match(startRegex);

        if (!match) return null;

        const startIndexBrace = match.index + match[0].length - 1;

        let bracesCount = 0;
        let closingBraceIndex = -1;

        for (let i = startIndexBrace; i < script.length; i++) {
          if (script[i] === "{") {
            bracesCount++;
          } else if (script[i] === "}") {
            bracesCount--;
            if (bracesCount === 0) {
              closingBraceIndex = i;
              break;
            }
          }
        }

        if (closingBraceIndex === -1) {
          throw new Error(`${compName} $runtime function has unclosed curly braces.`);
        }

        const fullMatch = script.substring(match.index, closingBraceIndex + 1);

        return fullMatch;
      }

      let runtime = extractRuntime(script);

      if (runtime) {
        for (const { name } of compProps) {
          console.log(`${compName} replacing prop: ${name}`)
          runtime = runtime.replace(name, `ctx.${name}`);
        }

        // Inject ctxDef after props replacement so ctxDef lines aren't double-replaced
        runtime = runtime.replace(/\$runtime\([^)]*\)\s*\{/, match => match + "\n" + ctxDef);

        console.log(runtime)

        let letterEntry = runtimeMap && runtimeMap.get(compName);
        let letter;
        if (!letterEntry) {
          letter = getNextLetter(letterState);
          runtime = runtime.replace(`${RUNTIME_KW}()`, `${letter}r(self, ctx)`);
          runtimeChunks.push(runtime);
          runtimeMap && runtimeMap.set(compName, { letter });
        } else {
          letter = letterEntry.letter;
        }

        runtimeChunks.push(`${letter}r(document.querySelector('[chid="${compId}"]'), ${JSON.stringify(ctx)});`);
      }
    }
  }

  if (styles) {
    let cssId = cssScopesMap && cssScopesMap.get(compName);
    if (!cssId) {
      cssId = genRandomId(cssScopes, 8, true);
      cssScopesMap.set(compName, cssId);
    }
    if (fragment.children.length === 1 && firstChild.nodeType === 1) {
      firstChild.classList.add(cssId);
    }
    styles = scopeCss(styles, cssId);
    scopedStyles.push(styles);
  }

  if (fragment.children.length === 1 && firstChild.nodeType === 1) {
    firstChild.setAttribute("data-ch-source", compName);
  }

  element.replaceWith(fragment);
  return true;
}

/**
 * Processes all components in the app container
 * @param {Element[]} appElements
 * @param {Map} loadedComponents
 * @returns {{
 *   runtimeScript: string,
 *   hasComponents: boolean
 *   scopesCss: CSSString
 * }}
 */
export function processAllComponents(appElements, loadedComponents, pageSourceFile, pageSourceContent) {
  let runtimeChunks = [];
  let compIdColl = [];
  let letterState = { value: null };
  let runtimeMap = new Map();
  let cssScopes = [];
  let cssScopesMap = new Map();
  let scopedStyles = [];
  let staticCtxRegistry = new Map();

  appElements.forEach(el => {
    if (!el.isConnected) return;
    processComponentElement(el, loadedComponents, runtimeChunks, compIdColl, letterState, runtimeMap, cssScopes, cssScopesMap, scopedStyles, [], staticCtxRegistry, pageSourceFile, pageSourceContent);
  });
  const runtimeScript = runtimeChunks.join("\n");
  const hasComponents = runtimeChunks.length > 0;
  const scopesCss = beautify.css(scopedStyles.join("\n"));

  return { runtimeScript, hasComponents, scopesCss };
}

/**
 * Gets the next letter in sequence or starts with 'a'
 * @param {object} letterState - { value: string }
 * @returns {string}
 */
function getNextLetter(letterState) {
  if (!letterState.value) {
    letterState.value = "a";
  } else {
    letterState.value = incrementAlfabet(letterState.value);
  }
  return letterState.value;
}

const RUNTIME_KW = "$runtime";
const RUNTIME_REGEX = new RegExp(RUNTIME_KW, "g");
