import { JSDOM } from "jsdom";
import { promises as fs } from "fs";
import path from "path";
import { throwError, protectCurlyBraces, restoreCurlyBraces, compileExpression } from "./utils.js";
import { readMyFile } from "./fs.js";

/**
 * Creates a JSDOM instance from source index file
 * @param {string} srcIndexContent
 * @returns {JSDOM}
 */
export function createDOM(srcIndexContent) {
  return new JSDOM(protectCurlyBraces(srcIndexContent));
}

/**
 * Validates that the index file has an <app> root element
 * @param {Document} doc
 * @throws {Error} if <app> element not found
 */
export function validateAppContainer(doc) {
  const appContainer = doc.querySelector("app");
  if (!appContainer) {
    throwError("Index page must have an <app> element");
  }
  return appContainer;
}

/**
 * Extracts all child elements from app container
 * @param {Element} appContainer
 * @returns {Element[]}
 */
export function getAppElements(appContainer) {
  return Array.from(appContainer.querySelectorAll("*"));
}

/**
 * Extracts context attributes from element (ctx.* attributes)
 * @param {Element} element
 * @returns {object}
 */
export function extractContextFromElement(element) {
  const ctx = {};
  for (const attr of element.attributes) {
    const key = attr.name;
    const val = attr.value;
    if (!val.includes("{")) { ctx[key] = val; continue; }
    const matches = [...val.matchAll(/\{([^}]+)\}/g)];
    if (matches.length === 1 && matches[0][0] === val) {
      try {
        ctx[key] = compileExpression(matches[0][1], false)();
        continue;
      } catch {}
    }
    ctx[key] = val;
  }
  return ctx;
}

/**
 * Serializes and formats DOM to pretty HTML
 * @param {JSDOM} dom
 * @returns {string}
 */
export async function serializeDOM(dom) {
  const beautify = (await import("js-beautify")).default;
  const finalHtml = restoreCurlyBraces(dom.serialize());
  return beautify.html(finalHtml, { indent_size: 2 });
}

/**
 * Writes the final HTML to output directory
 * @param {string} html
 * @param {import("fs").PathLike} outDirPath
 */
export async function writeHTMLOutput(html, outDirPath) {
  await fs.writeFile(path.join(outDirPath, "index.html"), html);
}

/**
 * Gets all stylesheet and icon links from document
 * @param {Document} doc
 * @returns {{stylesheets: HTMLLinkElement[], icons: HTMLLinkElement[]}}
 */
export function getAssetLinks(doc) {
  const docLinks = Array.from(doc.querySelectorAll("link"));
  const stylesheets = docLinks.filter(link => link.rel === "stylesheet");
  const icons = docLinks.filter(link => link.rel === "icon");
  return { stylesheets, icons };
}

/**
 * Writes CSS to output directory
 * @param {string} css
 * @param {import("fs").PathLike} outDirPath
 * @param {string} filename
 */
export async function writeCSSOutput(css, outDirPath, filename = "scopes.css") {
  await fs.writeFile(path.join(outDirPath, filename), css);
}

/**
 * Appends a stylesheet link element to document head
 * @param {Document} doc
 * @param {string} filename
 */
export function appendStylesheetLink(doc, filename) {
  const linkEl = doc.createElement("link");
  linkEl.rel = "stylesheet";
  linkEl.href = "./" + filename;
  doc.head.appendChild(linkEl);
}

/**
 * Appends a script element to document body
 * @param {Document} doc
 * @param {string} filename
 */
export function appendRuntimeScript(doc, filename) {
  const runtimeScriptEl = doc.createElement("script");
  runtimeScriptEl.type = "module";
  runtimeScriptEl.src = "./" + filename;
  doc.body.appendChild(runtimeScriptEl);
}
