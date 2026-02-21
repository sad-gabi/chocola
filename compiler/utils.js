import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import chalk from "chalk";

/**
 * Throws a formatted error message and exits
 * @param {string|Error} err - Error message or Error object
 * @throws {Error}
 */
export function throwError(err) {
  console.log(chalk.red.bold("Error!"), "A fatal error has occurred:\n");
  throw new Error(err);
}

/**
 * Loads a JavaScript module and inlines asset imports (HTML/CSS files)
 * This allows components to import external template files as strings
 * @param {import("fs").PathLike} filePath - Path to the JavaScript file
 * @returns {Promise<object>} - The imported module
 * @example
 * // Component with asset import
 * import template from "./button.html";
 * export default function Button() { return { body: template }; }
 */
export async function loadWithAssets(filePath) {
  let code = await fs.readFile(filePath, "utf8");

  const importRegex = /import\s+(\w+)\s+from\s+["'](.+?\.(html|css))["'];?/g;

  let match;
  while ((match = importRegex.exec(code))) {
    const varName = match[1];
    const relPath = match[2];

    const absPath = path.resolve(path.dirname(filePath), relPath);
    let content = await fs.readFile(absPath, "utf8");

    const replacement = `const ${varName} = ${JSON.stringify(content)};`;
    code = code.replace(match[0], replacement);
  }

  const dataUrl =
    "data:text/javascript;base64," +
    Buffer.from(code).toString("base64");

  const mod = await import(dataUrl);
  return mod;
}

/**
 * Generates a random ID string
 * @param {Array} collection - Array to track used IDs (prevents duplicates)
 * @param {number} length - Desired length of the ID (default: 10)
 * @returns {string} - Unique random ID
 */
export function genRandomId(collection, length = 10) {
  const id = Math.random().toString(36).substring(2, length + 2);
  if (collection.includes(id)) {
    return genRandomId(collection, length);
  } else {
    collection.push(id);
    return id;
  }
}

/**
 * Increments a letter or sequence of letters like Excel columns (a → b, z → aa)
 * @param {string} letters - Letter(s) to increment
 * @returns {string} - Incremented letter(s)
 * @example
 * incrementAlfabet("a") // "b"
 * incrementAlfabet("z") // "aa"
 */
export function incrementAlfabet(letters) {
  const alfabet = "abcdefghijklmnopqrstuvwxyz";
  let arr = letters.split("");
  let i = arr.length - 1;

  while (i >= 0) {
    let pos = alfabet.indexOf(arr[i]);
    if (pos < 25) {
      arr[i] = alfabet[pos + 1];
      return arr.join("");
    } else {
      arr[i] = "a";
      i--;
    }
  }

  return "a" + arr.join("");
}

/**
 * Checks if a string is a valid HTTP/HTTPS URL
 * @param {string} str - String to check
 * @returns {boolean} - True if valid web link, false otherwise
 */
export function isWebLink(str) {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (e) {
    return false;
  }
}
