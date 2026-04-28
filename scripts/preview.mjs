import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const requestedPath = path.join(dist, cleanPath || "index.html");
  const filePath = await resolveFile(requestedPath);
  const ext = path.extname(filePath);
  const body = await readFile(filePath);
  response.writeHead(200, {
    "content-type": mimeTypes[ext] || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  response.end(body);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Preview running at http://localhost:${port}`);
});

async function resolveFile(filePath) {
  try {
    const info = await stat(filePath);
    if (info.isFile()) return filePath;
  } catch {
    // Fall through to SPA fallback.
  }
  return path.join(dist, "index.html");
}
