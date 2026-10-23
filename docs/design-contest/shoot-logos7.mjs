// Screenshot of the logo gallery. Usage: node docs/design-contest/shoot-logos.mjs <out.png>
import { createRequire } from 'node:module';
const require = createRequire(process.env.LAB7_DIR ?? new URL('../../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 900 });
await page.goto(new URL('../../site/images/logo-options-7/index.html', import.meta.url).href);
await page.screenshot({ path: process.argv[2], fullPage: true });
await browser.close();
