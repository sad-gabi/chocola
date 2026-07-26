import { promises as fs } from "fs";
import path from "path";
import { genRandomId } from "./utils.js";

export async function generateRuntimeScript(runtimeScript, outDirPath, csrSource, csrClasses) {
  const fileIds = [];
  const filenames = [];

  if (csrSource) {
    const name = "run-" + genRandomId(fileIds, 6) + ".js";
    const source = csrSource.replace(/^export\s+\{?\s*[^}]+\s*}?\s*;?\s*$/m, "");
    await fs.writeFile(path.join(outDirPath, name), source);
    filenames.push(name);
  }

  if (csrClasses) {
    const name = "run-" + genRandomId(fileIds, 6) + ".js";
    await fs.writeFile(path.join(outDirPath, name), csrClasses);
    filenames.push(name);
  }

  if (runtimeScript) {
    const name = "run-" + genRandomId(fileIds, 6) + ".js";
    const content = `document.addEventListener("DOMContentLoaded", () => {${runtimeScript}})`;
    await fs.writeFile(path.join(outDirPath, name), content);
    filenames.push(name);
  }

  return filenames;
}
