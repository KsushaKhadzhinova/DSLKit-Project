// Usage: node figma-files-server.mjs  (port 5191)
// Serves E:/DSLKit-Project/docs read-only with CORS headers, so a page in the browser (Figma) can fetch screenshots and drop them on the canvas.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('E:/DSLKit-Project/docs');
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Private-Network': 'true',
  'Access-Control-Allow-Headers': '*',
  'Cache-Control': 'no-store',
};

createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    return res.end();
  }
  const url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(path.join(root, url));
  if (!file.startsWith(root) || !existsSync(file)) {
    res.writeHead(404, headers);
    return res.end('not found');
  }
  if (statSync(file).isDirectory()) {
    res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(readdirSync(file)));
  }
  res.writeHead(200, { ...headers, 'Content-Type': file.endsWith('.png') ? 'image/png' : 'application/octet-stream' });
  return createReadStream(file).pipe(res);
}).listen(5191, () => console.log('http://localhost:5191'));
