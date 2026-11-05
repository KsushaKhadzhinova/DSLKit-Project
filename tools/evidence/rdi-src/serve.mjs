import http from 'node:http';
import { readFileSync } from 'node:fs';
const types = { '.html': 'text/html', '.js': 'text/javascript' };
http.createServer((req, res) => {
  const p = req.url.split('?')[0].replace(/^\/$/, '/index.html');
  try { const body = readFileSync('dist' + p); res.setHeader('content-type', types[p.slice(p.lastIndexOf('.'))] || 'text/plain'); res.end(body); } catch { res.statusCode = 404; res.end('no'); }
}).listen(5190);
