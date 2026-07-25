import { JSDOM } from "jsdom";
import { promises as fs } from "fs";
import path from "path";
import { throwError, protectCurlyBraces, restoreCurlyBraces, compileExpression } from "./utils.js";
import { readMyFile } from "./fs.js";

export function createDOM(srcIndexContent) {
  return new JSDOM(protectCurlyBraces(srcIndexContent));
}

export function validateAppContainer(doc) {
  const appContainer = doc.querySelector("app");
  if (!appContainer) {
    throwError("Index page must have an <app> element");
  }
  return appContainer;
}

export function getAppElements(appContainer) {
  return Array.from(appContainer.querySelectorAll("*"));
}

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

export async function serializeDOM(dom) {
  const beautify = (await import("js-beautify")).default;
  const finalHtml = restoreCurlyBraces(dom.serialize());
  return beautify.html(finalHtml, { indent_size: 2 });
}

export async function writeHTMLOutput(html, outDirPath) {
  await fs.writeFile(path.join(outDirPath, "index.html"), html);
}

export function getAssetLinks(doc) {
  const docLinks = Array.from(doc.querySelectorAll("link"));
  const stylesheets = docLinks.filter(link => link.rel === "stylesheet");
  const icons = docLinks.filter(link => link.rel === "icon");
  return { stylesheets, icons };
}

export async function writeCSSOutput(css, outDirPath, filename = "scopes.css") {
  await fs.writeFile(path.join(outDirPath, filename), css);
}

export function appendStylesheetLink(doc, filename) {
  const linkEl = doc.createElement("link");
  linkEl.rel = "stylesheet";
  linkEl.href = "./" + filename;
  doc.head.appendChild(linkEl);
}

export function getScriptElements(doc) {
  return Array.from(doc.querySelectorAll("script[src]"));
}

export function appendRuntimeScript(doc, filename) {
  const runtimeScriptEl = doc.createElement("script");
  runtimeScriptEl.type = "module";
  runtimeScriptEl.src = "./" + filename;
  doc.body.appendChild(runtimeScriptEl);
}
