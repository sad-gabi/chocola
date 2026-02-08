import { promises as fs } from "fs";
import { throwError } from "./utils.js";

/**
 * Reads a file and returns its contents as a UTF-8 string
 * @param {import("fs").PathLike} filePath - Path to the file
 * @returns {Promise<string>} - File contents
 * @throws {Error} - If file cannot be read
 */
export async function readMyFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return data;
  } catch (error) {
    throwError(`Got an error trying to read the file: ${error.message}`);
  }
}

/**
 * Checks if a file exists
 * @param {import("fs").PathLike} filePath - Path to check
 * @returns {Promise<boolean>} - True if file exists, false otherwise
 */
export async function checkFile(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}