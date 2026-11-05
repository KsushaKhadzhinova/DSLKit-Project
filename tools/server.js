import * as nodeFs from 'node:fs';
import { createServer } from 'node:http';
import { handleAi } from './ai-api.js';
import { handleApi } from './render-api.js';
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
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
};

// Headers for every answer, the same that a real host should send. The pages have no inline scripts, so scripts come from this site only.
// Styles may be inline, because the drawings from the rendering service carry style attributes (the SVG is cleaned before it enters the page).
// Drawings are fetched from Kroki, nothing else leaves the site.
export const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://kroki.io; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export const staticServer = (rootDir, fs = nodeFs) => {
  const root = resolve(rootDir);
  const send = (req, res, status, file, headers = {}) => {
    const page = join(root, 'errors', `${status}.html`);
    const target = file ?? (fs.existsSync(page) ? page : null);
    res.writeHead(status, {
      ...SECURITY_HEADERS,
      'Content-Type': target ? (TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream') : 'text/plain; charset=utf-8',
      ...headers,
    });
    if (req.method === 'HEAD' || status === 304) return res.end();
    if (!target) return res.end(String(status));
    return fs
      .createReadStream(target)
      .on('error', () => res.end())
      .pipe(res);
  };
  const httpServer = createServer((req, res) => {
    if (req.url === '/api' || req.url.startsWith('/api/') || req.url.startsWith('/api?')) {
      Object.entries(SECURITY_HEADERS).forEach(([name, value]) => res.setHeader(name, value));
      // A path that only looks like the API (for example /api/../index.html) is not answered by it and goes on to the files.
      // handleApi answers every error itself and never rejects.
      handleAi(req, res)
        .then((handled) => handled || handleApi(req, res))
        .then((handled) => handled || serve(req, res));
      return;
    }
    serve(req, res);
  });
  // A request whose headers are too long (or otherwise malformed) never reaches the listener above: Node's
  // HTTP parser rejects it first and emits this event with the raw socket instead of a request/response pair.
  // Without a handler the connection gets a bare numeric status with no page; this answers with the matching error page.
  httpServer.on('clientError', (err, socket) => {
    const status = err.code === 'HPE_HEADER_OVERFLOW' ? 431 : 400;
    const page = join(root, 'errors', `${status}.html`);
    const body = fs.existsSync(page) ? fs.readFileSync(page) : Buffer.from(String(status));
    const reason = status === 431 ? 'Request Header Fields Too Large' : 'Bad Request';
    socket.end(`HTTP/1.1 ${status} ${reason}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n${body}`);
  });
  return httpServer;
  function serve(req, res) {
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
      const isDir = fs.existsSync(file) && fs.statSync(file).isDirectory();
      // A trailing slash on a path that is not really a directory (e.g. /app/dashboard.html/) would otherwise serve the
      // file but leave every relative script and style tag pointing under the fake directory, so it is a plain 404 instead.
      if (path.length > 1 && path.endsWith('/') && !isDir) return send(req, res, 404);
      if (isDir) file = join(file, 'index.html');
      // Browsers ask for /favicon.ico on their own even though every page links its own SVG icon; answer with that
      // icon instead of a bare 404 so the request does not show up as console noise.
      if (!fs.existsSync(file) && path === '/favicon.ico') file = join(root, 'images', 'favicon.svg');
      if (!fs.existsSync(file)) return send(req, res, 404);
      // The browser may keep a file but must ask again before it uses it: a weak ETag from the size and the time of the change answers 304 when nothing changed.
      const stat = fs.statSync(file);
      const headers = { ETag: `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`, 'Cache-Control': 'no-cache' };
      return send(req, res, req.headers['if-none-match'] === headers.ETag ? 304 : 200, file, headers);
    } catch {
      return send(req, res, 500);
    }
  }
};
