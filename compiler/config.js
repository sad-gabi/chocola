import path from "path";
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

  return { srcDir, outDir, libDir, emptyOutDir };
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
