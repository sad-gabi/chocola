import { JSDOM } from "jsdom";
import { extractContextFromElement } from "./dom-processor.js";
import { genRandomId, incrementAlfabet } from "./utils.js";
import chalk from "chalk";

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
  runtimeMap
) {
  const tagName = element.tagName.toLowerCase();
  const compName = tagName + ".js";
  const ctx = extractContextFromElement(element);
  const srcInnerHtml = element.innerHTML;

  const instance = loadedComponents.get(compName);
  if (!instance || instance === undefined) return false;

  if (instance && instance.body) {
    let body = instance.body;
    body = body.replace(
      /(?<!\b(?:if|del-if)=)\{(\w+)\}/g,
      (_, key) => ctx[key] || ""
    );
    const fragment = JSDOM.fragment(body);
    const children = Array.from(fragment.querySelectorAll("*"));
    children.forEach(child => {
      if (child.hasAttribute("if")) {
        const expr = child.getAttribute("if").slice(1, -1);
        const fn = new Function("ctx", `if (ctx.${expr} === true) {return true} else {return ctx.${expr} === '{true}'}`);
        if (!fn(ctx)) child.style.display = "none";
      }
      if (child.hasAttribute("del-if")) {
        const expr = child.getAttribute("del-if").slice(1, -1);
        const fn = new Function("ctx", `if (ctx.${expr} === true) {return true} else {return ctx.${expr} === '{true}'}`);
        if (!fn(ctx)) child.remove();
      }
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
 * }}
 */
export function processAllComponents(appElements, loadedComponents) {
  const runtimeChunks = [];
  const compIdColl = [];
  const letterState = { value: null };
  const runtimeMap = new Map();

  appElements.forEach(el => {
    processComponentElement(el, loadedComponents, runtimeChunks, compIdColl, letterState, runtimeMap);
  });

  const runtimeScript = runtimeChunks.join("\n");
  const hasComponents = runtimeChunks.length > 0;

  return { runtimeScript, hasComponents };
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
