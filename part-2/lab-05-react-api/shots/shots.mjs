// Makes the report screenshots of lab 5: starts the lab 3 API on a temporary SQLite file and the Vite client,
// drives the page in headless Chrome and saves PNGs to figures/. Run from the lab folder: node shots/shots.mjs
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const lab = fileURLToPath(new URL('..', import.meta.url));
const server = path.resolve(lab, '../lab-03-auth');
const out = path.join(lab, 'figures');
mkdirSync(out, { recursive: true });
const tmp = mkdtempSync(path.join(tmpdir(), 'lab5-'));

const browsers = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
const executablePath = browsers.find((p) => existsSync(p));
if (!executablePath) throw new Error('No Chrome or Edge found, set CHROME_PATH');

const API = 'http://localhost:3000';
const APP = 'http://localhost:5178';
const env = { ...process.env, SQLITE_STORAGE: path.join(tmp, 'lab5.sqlite'), DATABASE_URL: '', JWT_SECRET: 'x'.repeat(48), PORT: '3000', CORS_ORIGIN: APP };
const children = [];
const run = (cwd, cmd, args, extra = {}) => {
  const child = spawn(cmd, args, { cwd, env: { ...env, ...extra }, shell: true, stdio: 'ignore' });
  children.push(child);
  return child;
};
const waitFor = async (url) => {
  for (let i = 0; i < 80; i += 1) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`No answer from ${url}`);
};
const pause = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// Ports must be free, otherwise old servers with old data would answer.
for (const url of [API, APP]) {
  if (await fetch(url).then(() => true, () => false)) throw new Error(`${url} is already in use, stop that server first`);
}

await new Promise((resolve) => run(server, 'npx', ['sequelize-cli', 'db:migrate']).on('exit', resolve));
run(server, 'node', ['server.js']);
run(lab, 'npx', ['vite', '--port', '5178', '--strictPort'], { VITE_API_URL: API });
await waitFor(`${API}/x`);
await waitFor(APP);

const credentials = { email: 'kate@example.com', password: 'correct horse 42' };
const post = (url, body, token) =>
  fetch(API + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: JSON.stringify(body) });
await post('/auth/register', credentials);
const { token } = await (await post('/auth/login', credentials)).json();
for (const [title, notation] of [['Order processing', 'IDEF0'], ['Billing schema', 'ERD'], ['Login flow', 'UML']]) {
  await post('/diagrams', { title, notation: notation === 'IDEF0' ? 'IDEF0' : notation, sourceCode: 'a -> b', priority: 'normal' }, token);
  // Records created in different seconds show different creation times.
  await pause(1100);
}

const browser = await puppeteer.launch({ executablePath, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 1000 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
// The whole page is shot: the window is made as high as the page for a moment, so no band appears under the footer.
const HEIGHT = 1000;
const shot = async (name) => {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewport({ width: 1200, height: Math.max(height, HEIGHT) });
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  await page.setViewport({ width: 1200, height: HEIGHT });
};

// The request filter lets a shot be taken while a request is slow or while the server is "down".
let mode = { delay: {}, down: false };
await page.setRequestInterception(true);
page.on('request', async (request) => {
  const url = request.url();
  if (!url.startsWith(API)) return request.continue();
  if (mode.down) return request.abort('connectionrefused');
  const wait = mode.delay[request.method()] ?? 0;
  if (wait) await pause(wait);
  return request.continue();
});

await page.goto(APP, { waitUntil: 'networkidle0' });
await shot('01-login');
await page.evaluate((value) => localStorage.setItem('token', value), token);

mode = { delay: { GET: 3000 }, down: false };
const loading = page.goto(APP);
await pause(900);
await shot('02-loading');
await loading;
await page.waitForSelector('.cards .card');
mode = { delay: {}, down: false };
await pause(400);
await shot('03-list');

mode = { delay: { POST: 2500 }, down: false };
await page.type('#new-title', 'Hiring flow');
await page.type('#new-code', 'start -> hire');
await shot('04-add-before');
await page.click('form[aria-label="Новая диаграмма"] button[type=submit]');
await pause(600);
await shot('05-add-optimistic');
await pause(2600);
await shot('06-add-after');
mode = { delay: {}, down: false };

await page.click('button[aria-label="Удалить: Login flow"]');
await pause(500);
await shot('07-delete');

await page.type('#search', 'order');
await pause(1200);
await shot('08-search');

mode = { delay: {}, down: true };
await page.goto(APP, { waitUntil: 'networkidle0' });
await pause(600);
await shot('09-error');

await browser.close();
// shell: true starts a cmd wrapper, so the whole process tree is stopped (child.kill would leave the servers running).
children.forEach((child) => (process.platform === 'win32' ? spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']) : child.kill()));
console.log('Screenshots saved to', out);
process.exit(0);
