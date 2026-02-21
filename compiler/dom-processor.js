import { JSDOM } from "jsdom";
import { promises as fs } from "fs";
import path from "path";
import { throwError } from "./utils.js";
import { readMyFile } from "./fs.js";

/**
 * Creates a JSDOM instance from source index file
 * @param {string} srcIndexContent
 * @returns {JSDOM}
 */
export function createDOM(srcIndexContent) {
  return new JSDOM(srcIndexContent);
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
    ctx[key] = attr.value;
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
  const finalHtml = dom.serialize();
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
