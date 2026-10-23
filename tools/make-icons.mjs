// Makes the PNG icons of the web app from site/images/logo.svg. Run it again whenever the logo changes.
// Usage: node tools/make-icons.mjs   (needs puppeteer-core, see LAB7_DIR in docs/design-contest/shoot-mockups.mjs)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(process.env.LAB7_DIR ?? new URL('../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');

const logo = readFileSync(new URL('../site/images/logo.svg', import.meta.url), 'utf8');
const BACKGROUND = '#2563eb';
// size, file, how much of the square the logo fills (a maskable icon keeps the logo inside the safe zone of 80 percent)
const ICONS = [
  [192, 'icon-192.png', 1],
  [512, 'icon-512.png', 1],
  [512, 'maskable-512.png', 0.7],
];

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
for (const [size, file, fill] of ICONS) {
  await page.setViewport({ width: size, height: size });
  const inner = Math.round(size * fill);
  await page.setContent(
    `<body style="margin:0;background:${fill < 1 ? BACKGROUND : 'transparent'};display:grid;place-items:center;width:${size}px;height:${size}px">${logo.replace('width="32" height="32"', `width="${inner}" height="${inner}"`)}</body>`,
  );
  await page.screenshot({ path: new URL(`../site/images/icons/${file}`, import.meta.url).pathname.slice(1), omitBackground: fill === 1 });
}
await browser.close();
