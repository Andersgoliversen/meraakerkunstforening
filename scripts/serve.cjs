// Local-only preview of the same public files that are uploaded to the host.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!/^(?:[\w-]+\.(?:html|css|js)|images\/[\w./-]+\.(?:webp|jpg|png))$/.test(relative)) throw new Error('Not a public asset');
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep)) throw new Error('Outside site');
    const data = await fs.readFile(target);
    response.writeHead(200, { 'Content-Type': types[path.extname(target)], 'Cache-Control': 'no-store' });
    response.end(data);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${port}`));
