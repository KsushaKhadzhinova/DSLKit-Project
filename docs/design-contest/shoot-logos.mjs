// Screenshot of a logo gallery. Usage: node docs/design-contest/shoot-logos.mjs <set number> <out.png>
import { createRequire } from 'node:module';
const require = createRequire(process.env.LAB7_DIR ?? new URL('../../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');
const [set, out] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: Number(set) === 1 ? 1100 : 900, height: 900 });
await page.goto(new URL(`logos/set-${set}/index.html`, import.meta.url).href);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
