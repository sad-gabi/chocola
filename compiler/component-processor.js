import { JSDOM } from "jsdom";
import { extractContextFromElement } from "./dom-processor.js";
import { genRandomId, incrementAlfabet } from "./utils.js";
import chalk from "chalk";
import beautify from "js-beautify";

function scopeCss(cssString, cssId) {
  return cssString.replace(/(^|\})([^{}]+)\{/g, (match, before, selector) => {
    if (selector.trim().startsWith("@")) {
      return match;
    }
    const scoped = selector
      .split(",")
      .map(sel => `.${cssId} ${sel.trim()}`)
      .join(", ");
    return `${before}${scoped}{`;
  });
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
  scopedStyles
) {
  const tagName = element.tagName.toLowerCase();
  const compName = tagName + ".js";
  const ctx = extractContextFromElement(element);
  const srcInnerHtml = element.innerHTML;

  const ctxProxy = new Proxy(ctx, {
    has() { return true; },
    get(target, key) { return target[key]; }
  });

  const instance = loadedComponents.get(compName);
  if (!instance || instance === undefined) return false;

  if (instance.body) {
    let body = instance.body;

    const fragment = JSDOM.fragment(body);
    const children = Array.from(fragment.querySelectorAll("*"));

    children.forEach(child => {
      const reservedAttrs = ["if", "del-if"];
      Array.from(child.attributes).forEach(attribute => {
        if (!attribute || attribute === undefined) return;
        if (reservedAttrs.includes(attribute.name)) return;
        attribute.value = attribute.value.replace(
          /\{([^}]+)\}/g,
          ctx[attribute.value.slice(1, -1)]
        );
      });

      ["if", "del-if"].forEach(statement => {
        const statAtt = child.getAttribute(statement);
        if (!statAtt) return;
        const expr = statAtt.slice(1, -1);
        const eva = ctxProxy[expr] ? ctxProxy[expr].slice(1, -1) : null;
        const fn = new Function("ctx", `with(ctx) { return (${eva}); }`)(ctxProxy)
        if (!fn) {
          if (statement === "if") child.style.display = "none";
          if (statement === "del-if") child.remove();
        }
        child.removeAttribute(statement);
      });

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

    const slotFragment = JSDOM.fragment(srcInnerHtml);
    Array.from(fragment.querySelectorAll("slot")).forEach(slot => {
      slot.replaceWith(slotFragment);
    });

    let style = instance.styles && instance.styles.toString();
    if (style) {
      let cssId = cssScopesMap && cssScopesMap.get(compName);
      if (!cssId) {
        cssId = genRandomId(cssScopes, 8, true);
        cssScopesMap.set(compName, cssId);
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
export function processAllComponents(appElements, loadedComponents) {
  let runtimeChunks = [];
  let compIdColl = [];
  let letterState = { value: null };
  let runtimeMap = new Map();
  let cssScopes = [];
  let cssScopesMap = new Map();
  let scopedStyles = [];

  appElements.forEach(el => {
    processComponentElement(el, loadedComponents, runtimeChunks, compIdColl, letterState, runtimeMap, cssScopes, cssScopesMap, scopedStyles);
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
