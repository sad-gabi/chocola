import { promises as fs } from "fs";
import path from "path";
import { throwError } from "./compiler/utils.js";

/**
 * Returns `chocola.config.json` as an object.
 * @param {import("fs").PathLike} __rootdir 
 * @returns {Object}
 */
export async function getChocolaConfig(__rootdir) {
    try {
        const config = await fs.readFile(path.join(__rootdir, "chocola.config.json"), "utf-8");
        return JSON.parse(config);
    } catch(err) {
        throwError("An error ocurred while fetching the Chocola config file:\n" + err);
    }
}