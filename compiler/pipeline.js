import { promises as fs } from "fs";
import { loadWithAssets, throwError, genRandomId, isWebLink } from "./utils.js";
import { readMyFile, checkFile } from "./fs.js";
import { JSDOM } from "jsdom";
import path from "path";

/**
 * Discovers and loads all components from a library directory.
 * Components are JavaScript files that start with an uppercase letter.
 * They must have a default export that is a function
 * @param {import("node:fs").PathLike} libDir - Directory containing component files
 * @returns {Promise<{
 *   componentsLib: string[],
 *   loadedComponents: Map<string, object>,
 *   notDefComps: string[]
 * }>}
 * @throws {Error} if libDir cannot be found
 */
export async function getComponents(libDir) {
  try {
    let componentsLib = [];
    let loadedComponents = new Map();
    let notDefComps = [];

    const components = await fs.readdir(libDir);

    if (!components) {
      throw Error(`The specified components folder ${libDir} could not be found.`);
    }

    for (const comp of components) {
      if (!comp.endsWith(".js") || comp[0] !== comp[0].toUpperCase()) continue;

      componentsLib.push(comp);

      const module = await loadWithAssets(path.join(libDir, comp));

      if (typeof module.default !== "function") {
        notDefComps.push(comp);
        continue;
      }

      const instance = module.default();

      loadedComponents.set(comp.toLowerCase(), instance);
    }

    return { componentsLib, loadedComponents, notDefComps };
  } catch (err) {
    throwError(err);
  }
}

/**
 * Loads the project index file (HTML or .choco)
 * If both HTML and .choco files exist, throws an error
 * @param {import("fs").PathLike} srcPath - Source directory
 * @returns {Promise<{
 *   srcHtmlFile: string | null,
 *   srcChocoFile: string | null
 * }>}
 * @throws {Error} if both index files exist or .choco is used (not yet supported)
 */
export async function getSrcIndex(srcPath) {
  const srcHtmlPath = path.join(srcPath, "index.html");
  const srcChocoPath = path.join(srcPath, "index.choco");

  const htmlExists = await checkFile(srcHtmlPath);
  const chocoExists = await checkFile(srcChocoPath);

  let srcHtmlFile = null;
  let srcChocoFile = null;

  if (htmlExists && chocoExists) {
    throwError(
      "Can't have both .choco and .html source index files at a time: please remove one of the two"
    );
  }

  if (htmlExists) {
    try {
      srcHtmlFile = await readMyFile(srcHtmlPath);
      return { srcHtmlFile, srcChocoFile };
    } catch (err) {
      throwError(err);
    }
  }

  if (chocoExists) {
    throwError(".choco files are not supported yet");
  }
}

/**
 * Processes stylesheet links: copies CSS files to output and updates link href
 * @param {HTMLLinkElement} link - The link element to process
 * @param {import("fs").PathLike} rootDir - Root project directory
 * @param {string} srcDir - Source directory name
 * @param {import("fs").PathLike} outDirPath - Output directory path
 * @param {Array} fileIds - Array to track used file IDs
 * @throws {Error} if stylesheet cannot be read or written
 */
export async function processStylesheet(link, rootDir, srcDir, outDirPath, fileIds) {
  try {
    const href = link.href;
    const stylesheetPath = path.join(rootDir, srcDir, href);
    const css = await fs.readFile(stylesheetPath, { encoding: "utf8" });
    const cssFileName = "css-" + genRandomId(fileIds, 6) + ".css";

    await fs.writeFile(path.join(outDirPath, cssFileName), css);
    link.setAttribute("href", "./" + cssFileName);

    return css;
  } catch (err) {
    throwError(err);
  }
}

/**
 * Processes icon links: copies icon files to output directory
 * @param {HTMLLinkElement} link - The link element to process
 * @param {import("fs").PathLike} rootDir - Root project directory
 * @param {string} srcDir - Source directory name
 * @param {import("fs").PathLike} outDirPath - Output directory path
 * @throws {Error} if icon cannot be copied
 */
export async function processIcons(link, rootDir, srcDir, outDirPath) {
  try {
    const href = link.href;
    const iconPath = path.join(rootDir, srcDir, href);
    await fs.copyFile(iconPath, path.join(outDirPath, href));
  } catch (err) {
    throwError(err);
  }
}

export function getCssAssets(css) {
  const results = new Set();

  const urlRegex = /url\(([^)]+)\)/gi;

  const importStringRegex = /@import\s+["']([^"']+)["']/gi;

  const importUrlRegex = /@import\s+url\(([^)]+)\)/gi;

  const clean = (raw) => {
    let p = raw.trim();

    if (
      (p.startsWith('"') && p.endsWith('"')) ||
      (p.startsWith("'") && p.endsWith("'"))
    ) {
      p = p.slice(1, -1);
    }

    if (p.startsWith("data:")) return null;

    return p;
  };

  let match;

  while ((match = urlRegex.exec(css))) {
    const p = clean(match[1]);
    if (p) results.add(p);
  }

  while ((match = importStringRegex.exec(css))) {
    const p = clean(match[1]);
    if (p) results.add(p);
  }

  while ((match = importUrlRegex.exec(css))) {
    const p = clean(match[1]);
    if (p) results.add(p);
  }

  return [...results];
}


/**
 * Copies all local resources (images, fonts, etc.) to output directory
 * Excludes web links and script/link tags
 * @param {import("fs").PathLike} rootDir - Root project directory
 * @param {string} srcDir - Source directory name
 * @param {import("fs").PathLike} outDirPath - Output directory path
 * @throws {Error} if resources cannot be copied
 */
export async function copyResources(rootDir, scopesCss, globalCss, srcDir, outDirPath) {
  try {
    const newIndex = await fs.readFile(path.join(outDirPath, "index.html"), "utf8");
    const newDoc = new JSDOM(newIndex);
    const newElements = Array.from(newDoc.window.document.querySelectorAll("*"));
    const inlinePathsRegex = /url\((.*?)\)/gi;

    for (const el of newElements) {
      if (el.tagName === "LINK" || el.tagName === "SCRIPT") continue;

      const src = el.getAttribute("src") || el.getAttribute("href");

      if (src && !isWebLink(src)) {
        const srcPath = path.join(rootDir, srcDir, src);
        const destPath = path.join(outDirPath, src);

        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(srcPath, destPath);
      }

      const styles = el.getAttribute("style");

      if (styles) {
        let stylesMatch;
        while ((stylesMatch = inlinePathsRegex.exec(styles)) !== null) {
          let filePath = stylesMatch[1].trim();

          if (
            (filePath.startsWith('"') && filePath.endsWith('"')) ||
            (filePath.startsWith("'") && filePath.endsWith("'"))
          ) {
            filePath = filePath.slice(1, -1);
          }

          const srcPath = path.join(rootDir, srcDir, filePath);
          const destPath = path.join(outDirPath, filePath);

          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.copyFile(srcPath, destPath);
        }
      }
    }

    const cssAssets = [...getCssAssets(scopesCss), ...getCssAssets(globalCss)];
    for (const assetPath of cssAssets) {
      try {
        const srcPath = path.join(rootDir, srcDir, assetPath);
        const destPath = path.join(outDirPath, assetPath);

        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(srcPath, destPath);
      } catch (err) {
        throwError(err)
      }
    }
  } catch (err) {
    throwError(err);
  }
}
