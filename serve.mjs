// Static dev server for the project root at http://localhost:3000.
// SPA-friendly: extensionless paths fall back to index.html (react-router).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function tryFile(path) {
  try {
    const s = await stat(path);
    if (s.isDirectory()) return tryFile(join(path, 'index.html'));
    return path;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  // block path traversal
  const safe = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  let file = await tryFile(join(ROOT, safe));

  // SPA fallback: no file + no extension → index.html
  if (!file && !extname(safe)) file = await tryFile(join(ROOT, 'index.html'));

  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('500 Internal Server Error');
  }
});

server.listen(PORT, () => console.log(`serving ${ROOT} at http://localhost:${PORT}`));
