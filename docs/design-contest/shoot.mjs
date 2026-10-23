// Usage: node shoot.mjs <folder with html files>
// Saves PNG screenshots to <folder>/shots: every *.html at desktop 1280x800, tablet 768x1024 and mobile 375x812 (light),
// plus desktop dark. Not full page: one screen each, as the user sees it.
import { createRequire } from 'node:module';
import { readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(process.env.LAB7_DIR ?? new URL('../../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');
const dir = path.resolve(process.argv[2]);
const out = path.join(dir, 'shots');
mkdirSync(out, { recursive: true });
const files = readdirSync(dir).filter((f) => f.endsWith('.html'));
const views = [['desktop', 1280, 800, 'light'], ['tablet', 768, 1024, 'light'], ['mobile', 375, 812, 'light'], ['desktop-dark', 1280, 800, 'dark']];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
for (const f of files) for (const [name, w, h, scheme] of views) {
  await page.setViewport({ width: w, height: h });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await page.goto('file:///' + path.join(dir, f).split(path.sep).join('/'), { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: path.join(out, `${f.replace('.html', '')}-${name}.png`) });
}
await browser.close();
console.log('saved', files.length * views.length, 'screenshots to', out);
