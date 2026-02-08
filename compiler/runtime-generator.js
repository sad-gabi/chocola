import { promises as fs } from "fs";
import path from "path";
import { genRandomId } from "./utils.js";

/**
 * Generates a runtime script file and returns its filename
 * @param {string} runtimeScript - The JavaScript code for runtime
 * @param {import("fs").PathLike} outDirPath
 * @returns {Promise<string>} - filename of the generated runtime script
 */
export async function generateRuntimeScript(runtimeScript, outDirPath) {
  const fileIds = [];
  const runtimeFilename = "run-" + genRandomId(fileIds, 6) + ".js";
  const runtimeFileContents = `document.addEventListener("DOMContentLoaded", () => {${runtimeScript}})`;

  await fs.writeFile(path.join(outDirPath, runtimeFilename), runtimeFileContents);

  return runtimeFilename;
}
