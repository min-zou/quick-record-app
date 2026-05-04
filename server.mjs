import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 4173);

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function resolveRequestPath(url) {
  const parsed = new URL(url, `http://127.0.0.1:${port}`);
  const pathname = decodeURIComponent(parsed.pathname);
  const target = pathname === '/' ? '/index.html' : pathname;
  const filePath = normalize(join(root, target));

  if (!filePath.startsWith(root)) {
    return null;
  }

  if (existsSync(filePath)) {
    return filePath;
  }

  return join(root, 'index.html');
}

const server = createServer((req, res) => {
  const filePath = resolveRequestPath(req.url || '/');

  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const type = types[extname(filePath)] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'no-store'
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`Quick Record is running at http://127.0.0.1:${port}`);
});
