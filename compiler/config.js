import path from "path";
import chalk from "chalk";
import { getChocolaConfig } from "../utils.js";

/**
 * Loads and merges Chocola configuration with defaults
 * @param {import("fs").PathLike} rootDir
 * @returns {Promise<{
 *   srcDir: string,
 *   outDir: string,
 *   libDir: string,
 *   emptyOutDir: boolean
 * }>}
 */
export async function loadConfig(rootDir) {
  const config = await getChocolaConfig(rootDir);
  const bundleConfig = config.bundle || {};

  const srcDir = bundleConfig.srcDir || "src";
  const outDir = bundleConfig.outDir || "dist";
  const libDir = bundleConfig.libDir || "lib";
  const emptyOutDir = bundleConfig.emptyOutDir !== false;

  logConfigWarnings(bundleConfig, emptyOutDir);

  return { srcDir, outDir, libDir, emptyOutDir };
}

function logConfigWarnings(bundleConfig, emptyOutDir) {
  if (!bundleConfig.srcDir) {
    console.warn(
      chalk.bold.yellow("WARNING!"),
      'srcDir not defined in chocola.config.json file: using default "src" directory.'
    );
  }

  if (!bundleConfig.outDir) {
    console.warn(
      chalk.bold.yellow("WARNING!"),
      'outDir not defined in chocola.config.json file: using default "dist" directory.'
    );
  }

  if (!bundleConfig.libDir) {
    console.warn(
      chalk.bold.yellow("WARNING!"),
      'libDir not defined in chocola.config.json file: using default "lib" directory.'
    );
  }

  console.log(`> using emptyOutDir = ${emptyOutDir}`);
}

/**
 * Resolves all path directories based on configuration
 * @param {import("fs").PathLike} rootDir
 * @param {object} config
 * @returns {object}
 */
export function resolvePaths(rootDir, config) {
  return {
    outDir: path.join(rootDir, config.outDir),
    src: path.join(rootDir, config.srcDir),
    components: path.join(rootDir, config.srcDir, config.libDir),
  };
}
