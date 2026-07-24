import { promises as fs } from "fs";
import chalk from "chalk";
import { loadConfig, resolvePaths } from "./config.js";
import {
  createDOM,
  validateAppContainer,
  getAppElements,
  getAssetLinks,
  appendRuntimeScript,
  appendStylesheetLink,
  serializeDOM,
  writeHTMLOutput,
  writeCSSOutput,
} from "./dom-processor.js";
import { processAllComponents } from "./component-processor.js";
import { generateRuntimeScript } from "./runtime-generator.js";
import { genRandomId, throwError, compileExpression } from "./utils.js";
import {
  copyResources,
  copyStaticDir,
  getComponents,
  getSrcIndex,
  processIcons,
  processStylesheet,
} from "./pipeline.js";


const logSeparation = chalk.yellow(`
________________________________________________________________________
========================================================================
        `);

function logBanner() {
  console.log(chalk.bold.hex("#945e33")(`\n                     RUNNING CHOCOLA BUNDLER`));
  console.log(logSeparation);
  console.log(
    chalk.hex("#945e33")(`


     ▄████▄   ██░ ██  ▒█████   ▄████▄   ▒█████   ██▓    ▄▄▄      
     ▒██▀ ▀█  ▓██░ ██▒▒██▒  ██▒▒██▀ ▀█  ▒██▒  ██▒▓██▒   ▒████▄    
     ▒▓█    ▄ ▒██▀▀██░▒██░  ██▒▒▓█    ▄ ▒██░  ██▒▒██░   ▒██  ▀█▄  
     ▒▓▓▄ ▄██▒░▓█ ░██ ▒██   ██░▒▓▓▄ ▄██▒▒██   ██░▒██░   ░██▄▄▄▄██ 
     ▒ ▓███▀ ░░▓█▒░██▓░ ████▓▒░▒ ▓███▀ ░░ ████▓▒░░██████▒▓█   ▓██▒
     ░ ░▒ ▒  ░ ▒ ░░▒░▒░ ▒░▒░▒░ ░ ░▒ ▒  ░░ ▒░▒░▒░ ░ ▒░▓  ░▒▒   ▓▒█░
     ░  ▒    ▒ ░▒░ ░  ░ ░ ▒ ▒░   ░  ▒     ░ ░ ▒░ ░ ░ ▒  ░ ░   ▒▒ ░
     ░         ░  ░░ ░░ ░ ░ ░ ▒  ░        ░ ░ ░ ░ ▒    ░ ░    ░   ▒   
     ░ ░       ░  ░  ░    ░ ░  ░ ░          ░ ░      ░  ░     ░  ░
     ░                         ░                                  


        `)
  );
}

function logSuccess(outDirPath) {
  console.log(`
              ▄▄  ▄▄▄  ▄▄▄▄    ▄▄▄▄   ▄▄▄  ▄▄  ▄▄ ▄▄▄▄▄  ██ 
              ██ ██▀██ ██▄██   ██▀██ ██▀██ ███▄██ ██▄▄   ██ 
            ▄▄█▀ ▀███▀ ██▄█▀   ████▀ ▀███▀ ██ ▀██ ██▄▄▄  ▄▄ 
                                                
        `);
  console.log(
    chalk.bold.green(">"),
    "Project bundled succesfully at",
    chalk.green.underline(outDirPath) + "\n\n"
  );
}

async function setupOutputDirectory(outDirPath, emptyOutDir) {
  if (emptyOutDir) {
    await fs.rm(outDirPath, { recursive: true, force: true });
    await fs.mkdir(outDirPath);
  }
}

async function loadAndDisplayComponents(srcComponentsPath) {
  const foundComponents = await getComponents(srcComponentsPath);
  const { loadedComponents, notDefComps, componentsLib } = foundComponents;

  console.log(`       LOADING COMPONENTS`);
  console.log(chalk.bold.green(">"), "Components found in", chalk.green.underline(srcComponentsPath) + ":");
  console.log("   ", componentsLib, "\n");

  if (notDefComps.length > 0) {
    console.warn(chalk.bold.yellow("WARNING!"), "The following components don't include a default export:");
    console.log("   ", notDefComps);
  }

  return loadedComponents;
}

async function processAssets(doc, rootDir, srcDir, outDirPath) {
  const { stylesheets, icons } = getAssetLinks(doc);
  const fileIds = [];
  let cssContents = [];

  for (const link of stylesheets) {
    const css = await processStylesheet(link, rootDir, srcDir, outDirPath, fileIds);
    cssContents.push(css);
  }

  for (const link of icons) {
    await processIcons(link, rootDir, srcDir, outDirPath);
  }
  return cssContents
}

/**
 * Compiles a static build of your Chocola project from the directory provided.
 * @param {import("fs").PathLike} rootDir
 * @param {Object<{
 * isHotReload?: boolean
 * }
 * >} config
 */
export default async function runtime(rootDir, buildConfig) {
  const isHotReload = buildConfig?.isHotReload || null;
  !isHotReload && logBanner();

  const config = await loadConfig(rootDir);
  const paths = resolvePaths(rootDir, config);
  !isHotReload && console.log(logSeparation);

  await setupOutputDirectory(paths.outDir, config.emptyOutDir);

  const indexFiles = await getSrcIndex(paths.src);
  const srcIndexContent = indexFiles.srcHtmlFile;
  const pageSourcePath = indexFiles.srcPath;

  const loadedComponents = await loadAndDisplayComponents(paths.components);
  !isHotReload && console.log(logSeparation);
  !isHotReload && console.log(`       BUNDLING STATIC BUILD`);
  !isHotReload && console.log(chalk.bold.green(">"), "Creating Chocola static build in directory", chalk.green.underline(paths.outDir) + "\n");
  !isHotReload && console.log(logSeparation);

  const dom = createDOM(srcIndexContent);
  const doc = dom.window.document;
  const appContainer = validateAppContainer(doc);

  function hasDelIfAttr(el) {
    return el.hasAttribute("del:if");
  }
  function getDelIfAttr(el) {
    return el.getAttribute("del:if");
  }
  function removeDelIfAttr(el) {
    el.removeAttribute("del:if");
  }

  function processPageConditionals(parent) {
    const children = [...parent.children];
    let chainActive = false;
    let chainRendered = false;

    for (const child of children) {
      const hasIf = child.hasAttribute("if");
      const hasDelIf = hasDelIfAttr(child);
      const hasElif = child.hasAttribute("elif");
      const hasElse = child.hasAttribute("else");

      if (hasElif || hasElse) {
        if (!chainActive) continue;
        if (chainRendered) { child.remove(); continue; }
      }

      if (hasIf) {
        const raw = child.getAttribute("if");
        const expr = raw.startsWith("{") ? raw.slice(1, -1) : raw;
        const fn = compileExpression(expr, false);
        const result = fn();
        chainActive = true;
        if (result) {
          chainRendered = true;
        } else {
          child.remove();
          chainRendered = false;
        }
        child.removeAttribute("if");
      } else if (hasDelIf) {
        const raw = getDelIfAttr(child);
        const expr = raw.startsWith("{") ? raw.slice(1, -1) : raw;
        const fn = compileExpression(expr, false);
        const result = fn();
        chainActive = true;
        if (result) {
          chainRendered = true;
        } else {
          child.remove();
          chainRendered = false;
        }
        removeDelIfAttr(child);
      } else if (hasElif) {
        const raw = child.getAttribute("elif");
        const expr = raw.startsWith("{") ? raw.slice(1, -1) : raw;
        const fn = compileExpression(expr, false);
        const result = fn();
        if (result) {
          chainRendered = true;
        } else {
          child.remove();
        }
        child.removeAttribute("elif");
      } else if (hasElse) {
        chainRendered = true;
        chainActive = false;
        child.removeAttribute("else");
      } else {
        chainActive = false;
        chainRendered = false;
      }

      if (child.parentNode) {
        processPageConditionals(child);
      }
    }
  }
  processPageConditionals(appContainer);

  const appElements = getAppElements(appContainer);
  const { runtimeScript, scopesCss } = processAllComponents(appElements, loadedComponents, pageSourcePath, srcIndexContent);
  const runtimeFilename = await generateRuntimeScript(runtimeScript, paths.outDir);
  const globalCss = (await processAssets(doc, rootDir, config.srcDir, paths.outDir)).join("\n");

  if (scopesCss) {
    const fileName = "sc-" + genRandomId(null, 6) + ".css";
    await writeCSSOutput(scopesCss, paths.outDir, fileName);
    appendStylesheetLink(doc, fileName);
  };

  appendRuntimeScript(doc, runtimeFilename);
  const html = await serializeDOM(dom);
  await writeHTMLOutput(html, paths.outDir);

  try {
    if (config.assetImport === "static") {
      await copyStaticDir(paths.src, paths.outDir);
    } else {
      await copyResources(rootDir, scopesCss, globalCss, config.srcDir, paths.outDir);
    }
  } catch (err) {
    throwError(err.message || err);
  }

  !isHotReload && logSuccess(paths.outDir);
  isHotReload && console.log("Dev server updated");
}

/**
 * An intrinsic object that contains the Chocola App methods.
 */
export const app = {
  /**
 *  Initializes your Chocola App using a root directory.
 * 
 * ```js
 * import { app } from "chocola/compiler"
 import path from "path";
 import { fileURLToPath } from "url";
 
 const __filename = fileURLToPath(import.meta.url);
 const __dirname = path.dirname(__filename);
 
 app.build(__dirname);
 ```
 * @example
 * @param {PathLike} __rootdir the directory where your Chocola App is
 */
  async build(__rootdir) { return runtime(__rootdir) }
};
