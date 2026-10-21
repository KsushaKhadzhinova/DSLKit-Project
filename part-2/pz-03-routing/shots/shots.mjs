// Makes the screenshots of lab PZ3 (routing): starts the Vite dev server, drives the page in headless Chrome and saves PNGs to figures/.
// Run from the lab folder: node shots/shots.mjs. puppeteer-core is not a dependency of the lab: install it somewhere
// (npm i --no-save puppeteer-core) or point NODE_PATH at a folder that has it; CHROME_PATH selects the browser.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const lab = fileURLToPath(new URL('..', import.meta.url));
const out = path.join(lab, 'figures');
mkdirSync(out, { recursive: true });

const browsers = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
const executablePath = browsers.find((p) => existsSync(p));
if (!executablePath) throw new Error('No Chrome or Edge found, set CHROME_PATH');

const PORT = 5176;
const APP = `http://localhost:${PORT}`;
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: lab, shell: true, stdio: 'ignore' });
const pause = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
for (let i = 0; i < 80; i += 1) {
  try {
    await fetch(APP);
    break;
  } catch {
    await pause(500);
  }
}

const browser = await puppeteer.launch({ executablePath, headless: true });
const page = await browser.newPage();
const shot = (name) => page.screenshot({ path: path.join(out, `${name}.png`) });
const toList = () => page.evaluate(() => document.querySelector('#list').scrollIntoView());
const scheme = (value) => page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value }]);

await page.setViewport({ width: 1280, height: 800 });
await scheme('light');
const go = async (p) => page.goto(APP + p, { waitUntil: 'networkidle0' });
await go('/');
await shot('01-home');
await go('/catalog');
await shot('02-catalog');
await go('/catalog/2');
await shot('03-catalog-item');
await go('/catalog/999');
await shot('04-not-found-id');
await go('/no/such/page');
await shot('05-not-found');
await go('/dashboard');
await shot('06-redirect-to-login');
await page.click('button[type=submit]');
await pause(200);
await shot('07-login-validation');
await page.type('input[autocomplete=username]', 'Ксения');
await page.click('button[type=submit]');
await pause(400);
await shot('08-dashboard-after-login');
await go('/catalog?q=UML&sort=title');
await shot('12-catalog-filter');
await go('/admin');
await shot('13-forbidden');
await page.setViewport({ width: 375, height: 812, isMobile: true });
await go('/catalog');
await shot('09-catalog-mobile');
await page.click('label.burger__button');
await pause(200);
await shot('10-menu-mobile');
await page.setViewport({ width: 1280, height: 800 });
await scheme('dark');
await go('/catalog');
await shot('11-catalog-dark');
await browser.close();
server.kill();
spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { shell: true, stdio: 'ignore' });
console.log('Screenshots saved to', out);
process.exit(0);
