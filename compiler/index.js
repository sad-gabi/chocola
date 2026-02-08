import path from "path";
import { promises as fs } from "fs";
import chalk from "chalk";

// Configuration
import { loadConfig, resolvePaths } from "./config.js";

// DOM Processing
import {
    createDOM,
    validateAppContainer,
    getAppElements,
    getAssetLinks,
    appendRuntimeScript,
    serializeDOM,
    writeHTMLOutput,
} from "./dom-processor.js";

// Component & Runtime Processing
import { processAllComponents } from "./component-processor.js";
import { generateRuntimeScript } from "./runtime-generator.js";

// Utilities & Pipeline
import { throwError } from "./utils.js";
import {
    copyResources,
    getComponents,
    getSrcIndex,
    processIcons,
    processStylesheet,
} from "./pipeline.js";


// ===== Logging & Banners =====

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

// ===== Directory Setup =====

async function setupOutputDirectory(outDirPath, emptyOutDir) {
    if (emptyOutDir) {
        await fs.rm(outDirPath, { recursive: true, force: true });
        await fs.mkdir(outDirPath);
    }
}

// ===== Component Loading =====

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

// ===== Asset Processing =====

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

// ===== Main Compilation Function =====

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

    // Load Configuration
    const config = await loadConfig(rootDir);
    const paths = resolvePaths(rootDir, config);
    !isHotReload && console.log(logSeparation);

    // Setup Output Directory
    await setupOutputDirectory(paths.outDir, config.emptyOutDir);

    // Load Index File
    const indexFiles = await getSrcIndex(paths.src);
    const srcIndexContent = indexFiles.srcHtmlFile || indexFiles.srcChocoFile;

    // Load Components
    const loadedComponents = await loadAndDisplayComponents(paths.components);
    !isHotReload && console.log(logSeparation);

    // Create and Validate DOM
    !isHotReload && console.log(`       BUNDLING STATIC BUILD`);
    !isHotReload && console.log(chalk.bold.green(">"), "Creating Chocola static build in directory", chalk.green.underline(paths.outDir) + "\n");
    !isHotReload && console.log(logSeparation);

    const dom = createDOM(srcIndexContent);
    const doc = dom.window.document;
    const appContainer = validateAppContainer(doc);
    const appElements = getAppElements(appContainer);

    // Process Components
    const { runtimeScript } = processAllComponents(appElements, loadedComponents);

    // Generate Runtime File
    const runtimeFilename = await generateRuntimeScript(runtimeScript, paths.outDir);

    // Process Assets (stylesheets, icons)
    await processAssets(doc, rootDir, config.srcDir, paths.outDir);

    // Finalize HTML
    appendRuntimeScript(doc, runtimeFilename);
    const html = await serializeDOM(dom);
    await writeHTMLOutput(html, paths.outDir);

    // Copy Resources
    await copyResources(rootDir, config.srcDir, paths.outDir);

    // Success Message
    !isHotReload && logSuccess(paths.outDir);
    isHotReload && console.log("Dev server updated");
}