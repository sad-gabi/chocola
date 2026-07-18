import { JSDOM } from "jsdom";
import { extractContextFromElement } from "./dom-processor.js";
import { genRandomId, incrementAlfabet, throwError } from "./utils.js";
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
      const innerScoped = processBlock(inner);

      if (header.trim().startsWith("@")) {
        out += header + "{" + innerScoped + "}";
      } else {
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

function interpolateNode(node, ctxProxy) {
  if (node.nodeType === 3) {
    node.textContent = node.textContent.replace(/\{([^}]+)\}/g, (_, expr) => {
      try {
        return Function("ctx", `with(ctx) { return (${expr}); }`)(ctxProxy);
      } catch {
        return "";
      }
    });
  } else {
    node.childNodes.forEach(child => interpolateNode(child, ctxProxy));
  }
}

function validateChainStructure(parent, sourceFile, sourceContent, parentContent) {
  const children = [...parent.children];
  let chainActive = false;
  const outerCounts = {};

  for (const child of children) {
    const hasIf = child.hasAttribute("if");
    const hasDelIf = child.hasAttribute("del-if");
    const hasElif = child.hasAttribute("elif");
    const hasElse = child.hasAttribute("else");

    if (hasElif || hasElse) {
      if (!chainActive) {
        const tag = child.tagName.toLowerCase();
        const attr = hasElif ? "elif" : "else";
        let loc = sourceFile;
        if (sourceContent && parentContent) {
          const outer = child.outerHTML;
          outerCounts[outer] = (outerCounts[outer] || 0) + 1;
          let searchIdx = 0;
          let hits = 0;
          while ((searchIdx = parentContent.indexOf(outer, searchIdx)) !== -1) {
            hits++;
            if (hits === outerCounts[outer]) {
              let line = parentContent.substring(0, searchIdx).split("\n").length;
              if (sourceContent !== parentContent) {
                const anchor = parentContent.trim().slice(0, 80);
                const vars = [
                  anchor,
                  anchor.replace(/=""/g, ' '),
                  anchor.replace(/=""/g, ''),
                  anchor.replace(/="/g, "='").replace(/"/g, "'"),
                ];
                let anchorIdx = -1;
                for (const v of vars) {
                  anchorIdx = sourceContent.indexOf(v);
                  if (anchorIdx !== -1) break;
                }
                if (anchorIdx !== -1) {
                  const offset = sourceContent.substring(0, anchorIdx).split("\n").length;
                  line = offset + line - 1;
                }
              }
              loc = `${sourceFile}:${line}`;
              break;
            }
            searchIdx += outer.length;
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
  const compName = tagName + ".js";
  const instance = loadedComponents.get(compName);

  if (!instance || instance === undefined) return false;
  if (renderChain && renderChain.includes(compName)) return false;

  let ctx;
  if (staticCtxRegistry && staticCtxRegistry.has(element)) {
    ctx = staticCtxRegistry.get(element);
  } else {
    ctx = extractContextFromElement(element);
    staticCtxRegistry && staticCtxRegistry.set(element, ctx);
  }
  const srcInnerHtml = element.innerHTML;

  const ctxProxy = new Proxy(ctx, {
    has() { return true; },
    get(target, key) { return target[key]; }
  });

  if (instance.body) {
    let body = instance.body;

    const fragment = JSDOM.fragment(body);

    const slotFragment = JSDOM.fragment(srcInnerHtml);
    if (sourceFile) {
      validateChainStructure(slotFragment, sourceFile, sourceContent, srcInnerHtml);
    }
    validateChainStructure(fragment, instance.__sourceFile || compName, body, body);
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
      const hasDelIf = child.hasAttribute("del-if");
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
            const fn = new Function("ctx", `with(ctx) { return (${expr}); }`);
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
          const attr = hasIf ? "if" : "del-if";
          const expr = child.getAttribute(attr).slice(1, -1);
          const fn = new Function("ctx", `with(ctx) { return (${expr}); }`);
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

      const reservedAttrs = ["if", "del-if", "elif", "else"];

      Array.from(child.attributes).forEach(attribute => {
        if (!attribute || attribute === undefined) return;
        if (reservedAttrs.includes(attribute.name)) return;
        attribute.value = attribute.value.replace(
          /\{([^}]+)\}/g,
          (_, expr) => {
            try {
              return Function("ctx", `with(ctx) { return (${expr}); }`)(ctxProxy);
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
        instance.__sourceFile || compName,
        body
      );

      if (hasIf) {
        const expr = child.getAttribute("if").slice(1, -1);
        const fn = new Function("ctx", `with(ctx) { return (${expr}); }`);
        condChain.active = true;
        if (fn(ctxProxy)) {
          condChain.rendered = true;
        } else {
          child.style.display = "none";
          condChain.rendered = false;
        }
        child.removeAttribute("if");
      } else if (hasDelIf) {
        const expr = child.getAttribute("del-if").slice(1, -1);
        const fn = new Function("ctx", `with(ctx) { return (${expr}); }`);
        condChain.active = true;
        if (fn(ctxProxy)) {
          condChain.rendered = true;
        } else {
          child.remove();
          condChain.rendered = false;
        }
        child.removeAttribute("del-if");
      } else if (hasElif) {
        const expr = child.getAttribute("elif").slice(1, -1);
        const fn = new Function("ctx", `with(ctx) { return (${expr}); }`);
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

    const firstChild = fragment.firstChild;

    if (firstChild && firstChild.nodeType === 1) {
      if (instance.script || instance.effects) {
        const compId = "chid-" + genRandomId(compIdColl);
        firstChild.setAttribute("chid", compId);

        let script = instance.script && instance.script.toString();

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
        script = script.replace(ctxRegex, "ctx");
        script = script.replace(/RUNTIME\([^)]*\)\s*{/, match => match + "\n" + ctxDef);

        let letterEntry = runtimeMap && runtimeMap.get(compName);
        let letter;
        if (!letterEntry) {
          letter = getNextLetter(letterState);
          script = script.replace(/RUNTIME/g, `${letter}RUNTIME`);
          runtimeChunks.push(script);
          runtimeMap && runtimeMap.set(compName, { letter });
        } else {
          letter = letterEntry.letter;
        }

        runtimeChunks.push(`${letter}RUNTIME(document.querySelector('[chid="${compId}"]'), ${JSON.stringify(ctx)});`);
      }
    }

    let style = instance.styles && instance.styles.toString();
    if (style) {
      let cssId = cssScopesMap && cssScopesMap.get(compName);
      if (!cssId) {
        cssId = genRandomId(cssScopes, 8, true);
        cssScopesMap.set(compName, cssId);
      }
      if (fragment.firstChild && fragment.firstChild.nodeType === 1) {
        fragment.firstChild.classList.add(cssId);
      }
      style = scopeCss(style, cssId);
      scopedStyles.push(style);
    }
    element.replaceWith(fragment);
    return true;
  }

  console.warn(chalk.yellow(`${compName} component could not be loaded`));
  return false;
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
