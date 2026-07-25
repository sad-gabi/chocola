import { promises as fs } from "fs";
import { throwError, genRandomId } from "./utils.js";
import { readMyFile, checkFile } from "./fs.js";
import path from "path";

export async function getComponents(libDir) {
  try {
    let componentsLib = [];
    let loadedComponents = new Map();
    let emptyComps = [];

    const components = await fs.readdir(libDir);

    if (!components) {
      throw Error(`The specified components folder ${libDir} could not be found.`);
    }

    for (const comp of components) {
      if (!comp.endsWith(".html")) continue;

      componentsLib.push(comp);

      try {
        const compPath = path.join(libDir, comp);
        const instance = await fs.readFile(compPath, "utf-8");

        if (instance === "" || instance.trim().length === 0) emptyComps.push(comp);

        loadedComponents.set(comp.toLowerCase(), instance);
      } catch (err) {
        throwError(`Failed to load component "${comp}": ${err.message || err}`);
      }
    }

    return { componentsLib, loadedComponents, emptyComps };
  } catch (err) {
    throwError(`Failed to load components from ${libDir}: ${err.message}`);
  }
}

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

export async function copyStaticDir(srcPath, outDirPath) {
  const staticSrc = path.join(srcPath, "static");
  const staticDest = path.join(outDirPath, "static");
  try {
    await fs.access(staticSrc);
    await fs.cp(staticSrc, staticDest, { recursive: true, force: true });
  } catch {
  }
}
