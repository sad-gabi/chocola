import { promises as fs } from "fs";
import { loadWithAssets, throwError, genRandomId } from "./utils.js";
import { readMyFile, checkFile } from "./fs.js";
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

      let module;
      try {
        module = await loadWithAssets(path.join(libDir, comp));

        if (typeof module.default !== "function") {
          notDefComps.push(comp);
          continue;
        }

        const instance = module.default();
        const compPath = path.join(libDir, comp);
        instance.__sourceFile = compPath;

        loadedComponents.set(comp.toLowerCase(), instance);
      } catch (err) {
        throwError(`Failed to load component "${comp}": ${err.message || err}`);
      }
    }

    return { componentsLib, loadedComponents, notDefComps };
  } catch (err) {
    throwError(`Failed to load components from ${libDir}: ${err.message}`);
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

  const htmlExists = await checkFile(srcHtmlPath);

  let srcHtmlFile = null;

  if (htmlExists) {
    try {
      srcHtmlFile = await readMyFile(srcHtmlPath);
      return { srcHtmlFile, srcPath: srcHtmlPath };
    } catch (err) {
      throwError(err);
    }
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
    if (href.startsWith("http://") || href.startsWith("https://")) return;
    const stylesheetPath = path.join(rootDir, srcDir, href);
    const css = await fs.readFile(stylesheetPath, { encoding: "utf8" });
    const cssFileName = "css-" + genRandomId(fileIds, 6) + ".css";

    await fs.writeFile(path.join(outDirPath, cssFileName), css);
    link.setAttribute("href", "./" + cssFileName);

    return css;
  } catch (err) {
    throwError(`Failed to process stylesheet: ${err}`);
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
    if (href.startsWith("http://") || href.startsWith("https://")) return;
    const iconPath = path.join(rootDir, srcDir, href);
    await fs.copyFile(iconPath, path.join(outDirPath, href));
  } catch (err) {
    throwError(`Failed to copy icon: ${err}`);
  }
}

/**
 * Copies the static/ directory from source to output.
 * The entire static/ directory tree is copied recursively.
 * Silently skips if static/ does not exist.
 * @param {import("fs").PathLike} srcPath - Source directory path
 * @param {import("fs").PathLike} outDirPath - Output directory path
 */
export async function copyStaticDir(srcPath, outDirPath) {
  const staticSrc = path.join(srcPath, "static");
  const staticDest = path.join(outDirPath, "static");
  try {
    await fs.access(staticSrc);
    await fs.cp(staticSrc, staticDest, { recursive: true, force: true });
  } catch {
    // static/ directory doesn't exist — nothing to copy
  }
}
