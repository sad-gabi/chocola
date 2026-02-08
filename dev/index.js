import http from "http";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import compile from "../compiler/index.js";
import { getChocolaConfig } from "../utils.js";

export async function serve(__rootdir) {
  await compile(__rootdir);

  let __outdir = "dist";
  let __config = {
    hostname: "localhost",
    port: 3000,
  }

  const config = await getChocolaConfig(__rootdir);
  const devConfig = config.dev;

  if (devConfig.hostname) { __config.hostname = devConfig.hostname }
  else { console.warn(chalk.bold.yellow("WARNING!"), `hostname not defined in chocola.config.json file: using default ${__config.hostname} hostname.`) }

  if (devConfig.port) { __config.port = devConfig.port }
  else { console.warn(chalk.bold.yellow("WARNING!"), `port not defined in chocola.config.json file: using default ${__config.port} port.`) }

  const server = http.createServer((req, res) => {
    let filePath = path.join(
      __outdir,
      req.url === "/" ? "index.html" : req.url
    );

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
      ".html": "text/html",
      ".htm": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".csv": "text/csv",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpg",
      ".jpeg": "image/jpeg",
      ".bmp": "image/bmp",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".icon": "image/vnd.microsoft.icon",
      ".pdf": "application/pdf",
      ".mp3": "audio/mpeg",
      ".md": "text/markdown",
      ".mp4": "video/mp4",
      ".mpeg": "video/mpeg",
      ".oga": "audio/ogg",
      ".ogv": "video/ogg",
      ".php": "application/x-httpd-php",
      ".rar": "application/vnd.rar",
      ".tar": "application/x-tar",
      ".ttf": "font/ttf",
      ".txt": "text/plain",
      ".wav": "audio/wav",
      ".weba": "audio/webm",
      ".webm": "video/webm",
      ".webmanifest": "application/manifest+json",
      ".webp": "image/webp",
      ".xhtml": "application/xhtml+xml",
      ".xml": "application/xml",
      ".zip": "application/zip"
    };

    const contentType = mimeTypes[extname] || "application/octet-stream";

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === "ENOENT") {
          res.writeHead(404, { "Content-Type": "text/html" });
          res.end("<h1>404 Not Found</h1>", "utf-8");
        } else {
          res.writeHead(500);
          res.end("Error interno: " + error.code);
        }
      } else {
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content, "utf-8");
      }
    });
  });

  server.listen(__config.port, __config.hostname, () => {
    console.log(`Chocola App running at http://${__config.hostname}:${__config.port}/`);
  });
}