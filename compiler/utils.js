import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import chalk from "chalk";

export function throwError(err) {
  console.log(chalk.red.bold("Error!"), "A fatal error has occurred:\n");
  throw new Error(err);
}

export function genRandomId(collection = null, length = 10, lettersOnly = false) {
  let id;
  if (lettersOnly) {
    id = Array.from({ length }, () => ID_LETTERS[Math.floor(Math.random() * ID_LETTERS.length)]).join("");
  } else {
    id = Math.random().toString(36).substring(2, length + 2);
  }
  if (!collection) return id;
  if (collection.includes(id)) {
    return genRandomId(collection, length, lettersOnly);
  } else {
    collection.push(id);
    return id;
  }
}

export function incrementAlfabet(letters) {
  let arr = letters.split("");
  let i = arr.length - 1;

  while (i >= 0) {
    let pos = arr[i].charCodeAt(0) - 97;
    if (pos < 25) {
      arr[i] = String.fromCharCode(pos + 97 + 1);
      return arr.join("");
    } else {
      arr[i] = "a";
      i--;
    }
  }

  return "a" + arr.join("");
}

export function isWebLink(str) {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (e) {
    return false;
  }
}

const LBRACE_PH = "_%%CHOCOLA-LBRACE%%_";
const RBRACE_PH = "_%%CHOCOLA-RBRACE%%_";

export function protectCurlyBraces(html) {
  return html
    .replace(/&(?:lbrace|#123|#x7B);/gi, LBRACE_PH)
    .replace(/&(?:rcub|#125|#x7D);/gi, RBRACE_PH);
}

export function restoreCurlyBraces(html) {
  return html
    .replace(/_%%CHOCOLA-LBRACE%%_/g, "{")
    .replace(/_%%CHOCOLA-RBRACE%%_/g, "}");
}

const ID_LETTERS = "abcdefghijklmnopqrstuvwxyz";
const compiledCache = new Map();
export function compileExpression(expr, useCtx) {
  const key = useCtx ? `ctx:${expr}` : `raw:${expr}`;
  let fn = compiledCache.get(key);
  if (!fn) {
    fn = useCtx
      ? new Function("ctx", `with(ctx) { return (${expr}); }`)
      : new Function(`"use strict"; return (${expr})`);
    compiledCache.set(key, fn);
  }
  return fn;
}
