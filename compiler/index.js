import { promises as fs } from "fs";
import path from "path";
import { performance } from "perf_hooks";
import chalk from "./chalk.js";
import { loadConfig, resolvePaths } from "./config.js";
import {
  createDOM,
  validateAppContainer,
  getAppElements,
  getAssetLinks,
  getScriptElements,
  appendRuntimeScript,
  appendStylesheetLink,
  serializeDOM,
  writeHTMLOutput,
  writeCSSOutput,
} from "./dom-processor.js";
import { processAllComponents } from "./component-processor.js";
import { generateRuntimeScript } from "./runtime-generator.js";
import { genRandomId, throwError } from "./utils.js";
import { compileExpr, hasMountIf, getMountIf, removeMountIf } from "../parser/index.js";
import {
  copyStaticDir,
  getComponents,
  getSrcIndex,
  processIcons,
  processScript,
  processStylesheet,
} from "./pipeline.js";
import { text } from "stream/consumers";

const GOLD_COLOR = "#D87416";
const WHITE_COLOR = "#FAFAF8";
const TEXT_FAINT = "#E7EBE1";

function logBanner() {
  console.log(
    chalk.hex(GOLD_COLOR)(`
   ┌─────────────────────────────────────────────┐
   │┌-------------------------------------------┐│
   ││                                           ││`)
  );
  console.log(
    chalk.hex(GOLD_COLOR)(`   ││            `) +
    chalk.bold.hex(WHITE_COLOR)(`{`) +
    chalk.bold.hex(GOLD_COLOR)(`  C H O C O L A  `) +
    chalk.bold.hex(WHITE_COLOR)(`}`) +
    chalk.hex(GOLD_COLOR)(`            ││\n`) +
    chalk.hex(GOLD_COLOR)(`   ││                                           ││
   ││     `) +
   chalk.hex(TEXT_FAINT)(`THE SWEETEST WAY TO BUILD THE WEB`) +
   chalk.hex(GOLD_COLOR)(`     ││
   ││                                           ││
   │└-------------------------------------------┘│
   └─────────────────────────────────────────────┘
   `)
  );
}

function logSuccess(outDirPath, durationMs) {
  console.log(
    chalk.bold.green(">"),
    "Project bundled succesfully at",
    chalk.green.underline(outDirPath));
    console.log(chalk.bold.green(`\nJOB DONE!`) + chalk.hex(TEXT_FAINT)(` (${formatDuration(durationMs)})\n`));
}

function formatDuration(ms) {
  if (ms >= 1000) return (ms / 1000).toFixed(2) + "s";
  return Math.round(ms) + "ms";
}

async function setupOutputDirectory(outDirPath, emptyOutDir) {
  if (emptyOutDir) {
    await fs.rm(outDirPath, { recursive: true, force: true });
    await fs.mkdir(outDirPath);
  }
}

async function loadAndDisplayComponents(srcComponentsPath) {
  const foundComponents = await getComponents(srcComponentsPath);
  const { loadedComponents, notDefComps: emptyComps, componentsLib } = foundComponents;

  console.log(chalk.bold.green(">"), "Components found in", chalk.green.underline(srcComponentsPath) + ":");
  console.log("   ", componentsLib, "\n\n");

  if (emptyComps?.length > 0) {
    console.warn(chalk.bold.yellow("WARNING!"), "The following component files are empty:");
    console.log("   ", emptyComps);
  }

  return loadedComponents;
}

async function processAssets(doc, rootDir, srcDir, outDirPath) {
  const { stylesheets, icons } = getAssetLinks(doc);
  const scripts = getScriptElements(doc);
  const fileIds = [];
  let cssContents = [];

  for (const link of stylesheets) {
    const css = await processStylesheet(link, rootDir, srcDir, outDirPath, fileIds);
    cssContents.push(css);
  }

  for (const link of icons) {
    await processIcons(link, rootDir, srcDir, outDirPath);
  }

  for (const script of scripts) {
    await processScript(doc, script, rootDir, srcDir, outDirPath, fileIds);
  }
  return cssContents
}

function normalizeAttributeQuotes(html) {
  return html.replace(/(\s[\w:.-]+)=(['"])([\s\S]*?)\2/g, '$1="$3"');
}

function findElementLine(sourceContent, outerHTML) {
  const source = normalizeAttributeQuotes(sourceContent);
  const candidates = [
    outerHTML,
    outerHTML.replace(/=""/g, ""),
    outerHTML.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
  ];
  for (const candidate of candidates) {
    const idx = source.indexOf(candidate);
    if (idx !== -1) {
      return source.substring(0, idx).split("\n").length;
    }
  }
  return null;
}

function processPageConditionals(parent, sourceFile, sourceContent) {
  const children = [...parent.children];
  let chainActive = false;
  let chainRendered = false;

  for (const child of children) {
    const hasIf = child.hasAttribute("if");
    const hasDelIf = hasMountIf(child);
    const hasElif = child.hasAttribute("elif");
    const hasElse = child.hasAttribute("else");

    if (hasElif || hasElse) {
      if (!chainActive) {
        const tag = child.tagName.toLowerCase();
        const attr = hasElif ? "elif" : "else";
        let loc = sourceFile;
        if (sourceContent) {
          const lineNum = findElementLine(sourceContent, child.outerHTML);
          if (lineNum !== null) loc = `${sourceFile}:${lineNum}`;
        }
        throwError(`${loc}\n    <${tag}> has ${attr} without a preceding if/mount:if sibling`);
      }
      if (chainRendered) { child.remove(); continue; }
    }

    if (hasIf) {
      const raw = child.getAttribute("if");
      const expr = raw.startsWith("{") ? raw.slice(1, -1) : raw;
      const fn = compileExpr(expr, false);
      const result = fn();
      chainActive = true;
      if (result) {
        chainRendered = true;
      } else {
        child.style.display = "none";
        chainRendered = false;
      }
      child.removeAttribute("if");
    } else if (hasDelIf) {
      const raw = getMountIf(child);
      const expr = raw.startsWith("{") ? raw.slice(1, -1) : raw;
      const fn = compileExpr(expr, false);
      const result = fn();
      chainActive = true;
      if (result) {
        chainRendered = true;
      } else {
        child.remove();
        chainRendered = false;
      }
      removeMountIf(child);
    } else if (hasElif) {
      const raw = child.getAttribute("elif");
      const expr = raw.startsWith("{") ? raw.slice(1, -1) : raw;
      const fn = compileExpr(expr, false);
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
      processPageConditionals(child, sourceFile, sourceContent);
    }
  }
}

export default async function compile(rootDir, buildConfig) {
  const isHotReload = buildConfig?.isHotReload || null;
  const startTime = performance.now();
  !isHotReload && logBanner();

  const config = await loadConfig(rootDir);
  const paths = resolvePaths(rootDir, config);

  await setupOutputDirectory(paths.outDir, config.emptyOutDir);

  const indexFiles = await getSrcIndex(paths.src);
  const srcIndexContent = indexFiles.srcHtmlFile;
  const pageSourcePath = indexFiles.srcPath;

  const loadedComponents = await loadAndDisplayComponents(paths.components);
  !isHotReload && console.log(chalk.bold.green(">"), "Creating Chocola static build in directory", chalk.green.underline(paths.outDir));

  const dom = createDOM(srcIndexContent);
  const doc = dom.document;
  const appContainer = validateAppContainer(doc);

  processPageConditionals(appContainer, pageSourcePath, dom.protectedContent);

  const appElements = getAppElements(appContainer);
  const { runtimeScript, scopesCss, hashMap, csrClasses } = processAllComponents(appElements, loadedComponents, pageSourcePath, srcIndexContent);
  const csrSource = await fs.readFile(new URL("../runtime/index.js", import.meta.url), "utf-8");
  const runtimeFilenames = await generateRuntimeScript(runtimeScript, paths.outDir, csrSource, csrClasses);
  await processAssets(doc, rootDir, config.srcDir, paths.outDir);

  if (scopesCss) {
    const fileName = "sc-" + genRandomId(null, 6) + ".css";
    await writeCSSOutput(scopesCss, paths.outDir, fileName);
    appendStylesheetLink(doc, fileName);
  };

  for (const name of runtimeFilenames) {
    appendRuntimeScript(doc, name);
  }
  const html = await serializeDOM(dom);
  await writeHTMLOutput(html, paths.outDir);

  try {
    await copyStaticDir(paths.src, paths.outDir);
  } catch (err) {
    throwError(err.message || err);
  }

  const chocolaDir = path.join(rootDir, ".chocola");
  await fs.mkdir(chocolaDir, { recursive: true });
  await fs.writeFile(path.join(chocolaDir, "hashes.json"), JSON.stringify(hashMap, null, 2) + "\n");

  const durationMs = performance.now() - startTime;

  !isHotReload && logSuccess(paths.outDir, durationMs);
  isHotReload && console.log("Dev server updated " + chalk.hex(TEXT_FAINT)(`(${formatDuration(durationMs)})`));
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
  async build(__rootdir) { return compile(__rootdir) }
};
