import { promises as fs } from "fs";
import path from "path";
import { throwError } from "./compiler/utils.js";

export async function getChocolaConfig(__rootdir) {
    try {
        const config = await fs.readFile(path.join(__rootdir, "chocola.config.json"), "utf-8");
        return JSON.parse(config);
    } catch(err) {
        throwError("An error occurred while fetching the Chocola config file:\n" + err);
    }
}