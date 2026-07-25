import { promises as fs } from "fs";
import path from "path";
import { genRandomId } from "./utils.js";

export async function generateRuntimeScript(runtimeScript, outDirPath) {
  const fileIds = [];
  const runtimeFilename = "run-" + genRandomId(fileIds, 6) + ".js";
  const runtimeFileContents = `document.addEventListener("DOMContentLoaded", () => {${runtimeScript}})`;

  await fs.writeFile(path.join(outDirPath, runtimeFilename), runtimeFileContents);

  return runtimeFilename;
}
