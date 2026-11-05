// Screenshots of the two chosen logos in the site header and in the editor. Usage: node docs/design-contest/shoot-final-logos.mjs <outDir>
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(process.env.LAB7_DIR ?? new URL('../../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');
const out = process.argv[2] ?? 'docs/design-contest/logos/final';
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 640 });
await page.evaluateOnNewDocument(() => localStorage.setItem('dslkit.tour-done', 'true'));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
await page.screenshot({ path: `${out}/header-light.png`, clip: { x: 0, y: 0, width: 1280, height: 120 } });
await page.goto('http://localhost:5173/app/editor.html', { waitUntil: 'networkidle0' });
await page.screenshot({ path: `${out}/editor.png`, clip: { x: 0, y: 0, width: 1280, height: 120 } });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
await page.screenshot({ path: `${out}/header-dark.png`, clip: { x: 0, y: 0, width: 1280, height: 120 } });
await browser.close();
