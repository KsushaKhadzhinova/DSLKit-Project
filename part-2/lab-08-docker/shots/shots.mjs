// Makes the report screenshots of lab 8 from the RUNNING stack (docker compose up --build -d, ports 8080 and 3000).
// Needs puppeteer-core (npm ci in ../lab-05-react-api) and Chrome or Edge. Run from the lab folder: node shots/shots.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const lab = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(path.join(lab, '../lab-05-react-api/package.json'));
const puppeteer = require('puppeteer-core');
const out = path.join(lab, 'figures');
mkdirSync(out, { recursive: true });

const browsers = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const executablePath = browsers.find((p) => existsSync(p));
if (!executablePath) throw new Error('No Chrome or Edge found, set CHROME_PATH');

const APP = 'http://localhost:8080';
const sh = (cmd) => execSync(cmd, { cwd: lab, encoding: 'utf8' }).trimEnd();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const browser = await puppeteer.launch({ executablePath, headless: true });
const page = await browser.newPage();

// Terminal pictures contain the real output of the commands, only drawn as a window.
const terminal = async (name, commands) => {
  const body = commands.map((cmd) => `<div class="p">$ ${esc(cmd)}</div><pre>${esc(sh(cmd))}</pre>`).join('');
  await page.setViewport({ width: 1100, height: 300 });
  await page.setContent(
    `<style>body{margin:0;background:#1e1e2e;color:#d9e0ee;font:15px/1.5 Consolas,monospace;padding:20px}.p{color:#89b4fa}pre{margin:0 0 14px;white-space:pre-wrap}</style>${body}`,
  );
  const height = await page.evaluate(() => Math.ceil(document.body.lastElementChild.getBoundingClientRect().bottom + 20));
  await page.setViewport({ width: 1100, height });
  await page.screenshot({ path: path.join(out, `${name}.png`) });
};

await terminal('01-docker-ps', ['docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"']);
await terminal('04-checks', [
  'curl -s http://localhost:8080/api/health',
  'curl -s http://localhost:3000/health',
  'docker network ls --filter name=dslkit',
  'docker volume ls --filter name=dslkit',
]);

const credentials = { email: 'kate@example.com', password: 'correct horse 42' };
const post = (url, body, token) =>
  fetch(APP + '/api' + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
  });
await post('/auth/register', credentials);
const { token } = await (await post('/auth/login', credentials)).json();
for (const [title, notation] of [
  ['Order processing', 'IDEF0'],
  ['Billing schema', 'ERD'],
  ['Login flow', 'UML'],
]) {
  await post('/diagrams', { title, notation, sourceCode: 'a -> b', priority: 'normal' }, token);
  await new Promise((resolve) => setTimeout(resolve, 1100));
}

await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
const shot = async (name) => {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewport({ width: 1200, height: Math.max(height, 800) });
  await page.screenshot({ path: path.join(out, `${name}.png`) });
};
await page.setViewport({ width: 1200, height: 800 });
await page.goto(APP, { waitUntil: 'networkidle0' });
await shot('02-app-login');
await page.evaluate((value) => localStorage.setItem('token', value), token);
await page.goto(APP, { waitUntil: 'networkidle0' });
await page.waitForSelector('.cards .card');
await shot('03-app-list');

await browser.close();
console.log('Screenshots saved to', out);
