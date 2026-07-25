import { promises as fs } from "fs";
import { throwError } from "./utils.js";

export async function readMyFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return data;
  } catch (error) {
    throwError(`Got an error trying to read the file: ${error.message}`);
  }
}

export async function checkFile(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}