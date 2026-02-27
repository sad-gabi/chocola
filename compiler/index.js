import path from "path";
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
import { genRandomId, throwError } from "./utils.js";
import {
    copyResources,
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

    for (const link of stylesheets) {
        await processStylesheet(link, rootDir, srcDir, outDirPath, fileIds);
    }

    for (const link of icons) {
        await processIcons(link, rootDir, srcDir, outDirPath, fileIds);
    }
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
    const srcIndexContent = indexFiles.srcHtmlFile || indexFiles.srcChocoFile;

    const loadedComponents = await loadAndDisplayComponents(paths.components);
    !isHotReload && console.log(logSeparation);
    !isHotReload && console.log(`       BUNDLING STATIC BUILD`);
    !isHotReload && console.log(chalk.bold.green(">"), "Creating Chocola static build in directory", chalk.green.underline(paths.outDir) + "\n");
    !isHotReload && console.log(logSeparation);

    const dom = createDOM(srcIndexContent);
    const doc = dom.window.document;
    const appContainer = validateAppContainer(doc);
    const appElements = getAppElements(appContainer);

    const { runtimeScript, scopesCss } = processAllComponents(appElements, loadedComponents);
    const runtimeFilename = await generateRuntimeScript(runtimeScript, paths.outDir);
    await processAssets(doc, rootDir, config.srcDir, paths.outDir);

    if (scopesCss) {
        const fileName = "sc-" + genRandomId(null, 6) + ".css";
        await writeCSSOutput(scopesCss, paths.outDir, fileName);
        appendStylesheetLink(doc, fileName);
    };

    appendRuntimeScript(doc, runtimeFilename);
    const html = await serializeDOM(dom);
    await writeHTMLOutput(html, paths.outDir);

    await copyResources(rootDir, scopesCss, config.srcDir, paths.outDir);

    !isHotReload && logSuccess(paths.outDir);
    isHotReload && console.log("Dev server updated");
}