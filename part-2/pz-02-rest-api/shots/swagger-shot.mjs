// Makes figures 15 and 16 of practical 2: the Swagger UI page of the real OpenAPI document (GET /api/openapi.json
// of the running server on port 3963), drawn by swagger-ui-dist in a real browser. Run from the folder of the work:
//   node shots/swagger-shot.mjs
// The server sends no CORS headers, so the document is fetched here and handed to Swagger UI as an object.
// Swagger UI itself is loaded from a CDN with a fixed version, so the script needs a network connection.
import http from 'node:http';
import path from 'node:path';
import { ensureDir, here, isUp, launch, pause, start, waitFor } from './lib.mjs';

const VERSION = '5.17.14';
const CDN = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${VERSION}`;
const work = here(import.meta.url);
const out = ensureDir(path.join(work, 'figures'));
const ORIGIN = 'http://localhost:3963';
if (await isUp(ORIGIN)) throw new Error(`${ORIGIN} is already in use, stop that server first`);

const server = start(work, ['src/server.js'], { PORT: '3963' });
await waitFor(`${ORIGIN}/health`);
const spec = await (await fetch(`${ORIGIN}/api/openapi.json`)).json();
server.stop();
await server.exited;
spec.servers = [{ url: `${ORIGIN}/api` }];

const html = `<!doctype html><meta charset="utf-8"><title>Swagger UI</title>
<link rel="stylesheet" href="${CDN}/swagger-ui.css">
<style>:root{color-scheme:light} body{background:#fff}</style>
<div id="ui"></div>
<script src="${CDN}/swagger-ui-bundle.js"></script>
<script>window.ui = SwaggerUIBundle({ spec: ${JSON.stringify(spec).replace(/</g, '\u003c')}, dom_id: '#ui', docExpansion: 'list', defaultModelsExpandDepth: -1 });</script>`;

// Swagger UI builds URLs against the address of the page, so the page is served from a local address, not set as about:blank.
const pageServer = http.createServer((req, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html));
await new Promise((resolve) => pageServer.listen(3964, '127.0.0.1', resolve));
const browser = await launch();
try {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.setViewport({ width: 1100, height: 800 });
  await page.goto('http://127.0.0.1:3964/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.opblock-summary', { timeout: 30000 });
  const fit = async (file) => {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewport({ width: 1100, height: Math.min(Math.max(height, 300), 2400) });
    await pause(300);
    await page.screenshot({ path: file });
  };
  await fit(path.join(out, '15-swagger-ui.png'));
  // Opens the operation "POST /users": its request body, the allowed values and the response codes.
  await page.evaluate(() => {
    const block = [...document.querySelectorAll('.opblock-post')].find((b) => b.querySelector('.opblock-summary-path')?.textContent.trim() === '/users');
    block.querySelector('.opblock-summary-control').click();
  });
  await page.waitForSelector('.opblock-post.is-open .responses-wrapper', { timeout: 10000 });
  await fit(path.join(out, '16-swagger-ui-post.png'));
  console.log('Saved figures 15 and 16 (Swagger UI', VERSION + ')');
} finally {
  await browser.close();
  pageServer.close();
}
