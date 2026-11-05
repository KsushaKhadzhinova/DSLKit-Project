// Screenshots of the editor features: the tour, the menu with export and import, a block dragged on the canvas.
// Usage: node docs/design-contest/shoot-editor-features.mjs <outDir>   (the site must run on http://localhost:5173)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(process.env.LAB7_DIR ?? new URL('../../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');

const out = process.argv[2] ?? 'docs/design-contest/editor-features';
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const open = async (settings) => {
  await page.evaluateOnNewDocument((values) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.clear();
      Object.entries(values).forEach(([key, value]) => localStorage.setItem(`dslkit.${key}`, JSON.stringify(value)));
      sessionStorage.setItem('seeded', '1');
    }
  }, settings);
  await page.goto('http://localhost:5173/app/editor.html', { waitUntil: 'networkidle0' });
};

// 1. The tour for a new visitor.
await open({ settings: { 'diagram-engine': 'local' } });
await new Promise((resolve) => setTimeout(resolve, 800));
await page.screenshot({ path: `${out}/01-tour.png` });

// 2. The menu with export and import (the tour is already seen).
await page.evaluate(() => {
  localStorage.setItem('dslkit.tour-done', 'true');
  location.reload();
});
await page.waitForNavigation({ waitUntil: 'networkidle0' });
await page.select('[data-notation-select]', 'bpmn');
await new Promise((resolve) => setTimeout(resolve, 600));
await page.click('.editor-menu__summary');
await new Promise((resolve) => setTimeout(resolve, 300));
await page.screenshot({ path: `${out}/02-menu-export-import.png` });
await page.click('.editor-menu__summary');

// 3. A block dragged on the canvas: before and after, with the code line that changed.
await page.screenshot({ path: `${out}/03-before-drag.png` });
const box = await page.evaluate(() => {
  const rect = document.querySelector('.notation__node[data-id="t2"]').getBoundingClientRect();
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
});
await page.mouse.move(box.x, box.y);
await page.mouse.down();
await page.mouse.move(box.x + 20, box.y + 70, { steps: 8 });
await page.mouse.up();
await new Promise((resolve) => setTimeout(resolve, 600));
await page.screenshot({ path: `${out}/04-after-drag.png` });
await browser.close();
