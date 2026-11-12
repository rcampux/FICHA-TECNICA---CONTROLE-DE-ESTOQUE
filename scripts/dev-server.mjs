import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import nutritionSearchHandler from "../api/nutrition-search.js";
import productSearchHandler from "../api/product-search.js";

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function resolveRequestPath(url) {
  const requestedPath = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const pathname = requestedPath === "/"
    ? "/public/index.html"
    : requestedPath === "/release.json"
      ? "/public/release.json"
      : requestedPath === "/src/config/env.js"
        ? "/public/src/config/env.js"
      : requestedPath;
  const filePath = normalize(join(root, pathname));

  if (!filePath.startsWith(root)) {
    return null;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    return join(filePath, "index.html");
  }

  return filePath;
}

const apiHandlers = new Map([
  ["/api/nutrition-search", nutritionSearchHandler],
  ["/api/product-search", productSearchHandler],
]);

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url || "/", `http://localhost:${port}`).pathname;
  const apiHandler = apiHandlers.get(pathname);
  if (apiHandler) {
    await apiHandler(req, res);
    return;
  }

  const filePath = resolveRequestPath(req.url || "/");

  if (!filePath || !existsSync(filePath)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "cache-control": "no-store",
    "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
  });

  const stream = createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    }
    res.end("Server error");
  });
  stream.pipe(res);
});

server.on("clientError", (_error, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

process.on("uncaughtException", (error) => {
  console.error(error);
});

server.listen(port, () => {
  console.log(`FichaTec prototype: http://localhost:${port}/public/index.html`);
});
