import compile from "./compiler/index.js";
import * as development from "./dev/index.js";

/**
 * An intrinsic object that contains the Chocola App methods.
 */
export const app = {
    /**
     *  Initializes your Chocola App using a root directory and a source directory.
     * 
     * ```js
     * import { app } from "chocola"
     import path from "path";
     import { fileURLToPath } from "url";
     
     const __filename = fileURLToPath(import.meta.url);
     const __dirname = path.dirname(__filename);
     
     app.build(__dirname, "src");
     ```
     * @example
     * @param {PathLike} __rootdir the directory where your Chocola App is
     * @param {PathLike} __srcdir the directory where your app sources files are
     * @returns {Object}
     */
    build(__rootdir, __srcdir) { compile(__rootdir, __srcdir) }
}

export const dev = {
    server(__rootdir, __srcdir, port) { development.serve(__rootdir, __srcdir, port) }
};