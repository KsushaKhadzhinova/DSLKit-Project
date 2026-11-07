// Принимает результаты замеров из страницы и сохраняет их в файлы: node save-server.mjs (порт 5178)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') { res.writeHead(200); res.end('ok'); return; }
  const name = path.basename(new URL(req.url, 'http://x').searchParams.get('name') || 'out.json');
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => { fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks)); res.writeHead(200); res.end('saved ' + name); });
}).listen(5178, '127.0.0.1', () => console.log('save server on 5178'));
