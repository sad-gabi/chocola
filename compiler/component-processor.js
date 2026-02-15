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
  letterState
) {
  const tagName = element.tagName.toLowerCase();
  const compName = tagName + ".js";
  const ctx = extractContextFromElement(element);

  const instance = loadedComponents.get(compName);
  if (!instance || instance === undefined) return false;

  if (instance && instance.body) {
    let body = instance.body;
    body = body.replace(/\{ctx\.(\w+)\}/g, (_, key) => ctx[key] || "");
    const fragment = JSDOM.fragment(body);
    const firstChild = fragment.firstChild;

    if (firstChild && firstChild.nodeType === 1) {
      if (instance.script || instance.effects) {
        const compId = "chid-" + genRandomId(compIdColl);
        firstChild.setAttribute("chid", compId);

        let script = instance.script && instance.script.toString();
        const letter = getNextLetter(letterState);

        const ctxRegex = /ctx\s*=\s*({.*?})/;
        const ctxMatch = script.match(ctxRegex);
        let runtimeCtx = {};
        if (ctxMatch) {
          runtimeCtx = JSON.parse(ctxMatch[1].replace(/(\w+):/g, '"$1":'));
        }
        let ctxDef = "";
        for (const [key, value] of Object.entries(runtimeCtx)) {
          ctxDef += `ctx.${key} = ctx.${key}||${JSON.stringify(value)};\n`;
        }
        script = script.replace(ctxRegex, "ctx");
        script = script.replace(/RUNTIME\([^)]*\)\s*{/, match => match + "\n" + ctxDef);

        script = script.replace(/RUNTIME/g, `${letter}RUNTIME`);

        runtimeChunks.push(`
const ${letter} = document.querySelector('[chid="${compId}"]');
${script}
${letter}RUNTIME(${letter}, ${JSON.stringify(ctx)});`);
      }
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
 * }}
 */
export function processAllComponents(appElements, loadedComponents) {
  const runtimeChunks = [];
  const compIdColl = [];
  const letterState = { value: null };

  appElements.forEach(el => {
    processComponentElement(el, loadedComponents, runtimeChunks, compIdColl, letterState);
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
