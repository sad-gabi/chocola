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

const LBRACE_PH = "_%%CHOCOLA-LBRACE%%_";
const RBRACE_PH = "_%%CHOCOLA-RBRACE%%_";

export function protectCurlyBraces(html) {
  return html
    .replace(/&(?:lbrace|#123|#x7B);/gi, LBRACE_PH)
    .replace(/&(?:rcub|#125|#x7D);/gi, RBRACE_PH);
}

export function restoreCurlyBraces(html) {
  return html
    .replace(/_%%CHOCOLA-LBRACE%%_/g, "{")
    .replace(/_%%CHOCOLA-RBRACE%%_/g, "}");
}