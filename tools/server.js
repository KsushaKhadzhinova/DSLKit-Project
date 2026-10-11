import * as nodeFs from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

export const staticServer = (rootDir, fs = nodeFs) => {
  const root = resolve(rootDir);
  const send = (req, res, status, file, headers = {}) => {
    const page = join(root, 'errors', `${status}.html`);
    const target = file ?? (fs.existsSync(page) ? page : null);
    res.writeHead(status, { 'Content-Type': target ? (TYPES[extname(target)] ?? 'application/octet-stream') : 'text/plain; charset=utf-8', ...headers });
    if (req.method === 'HEAD') return res.end();
    if (!target) return res.end(String(status));
    return fs
      .createReadStream(target)
      .on('error', () => res.end())
      .pipe(res);
  };
  return createServer((req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(req, res, 405, null, { Allow: 'GET, HEAD' });
      let path;
      try {
        path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      } catch {
        return send(req, res, 400);
      }
      let file = resolve(join(root, path));
      if (file !== root && !file.startsWith(root + sep)) return send(req, res, 403);
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = join(file, 'index.html');
      return fs.existsSync(file) ? send(req, res, 200, file) : send(req, res, 404);
    } catch {
      return send(req, res, 500);
    }
  });
};
