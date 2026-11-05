import { createRequire } from 'node:module';
import path from 'node:path';
const puppeteer = createRequire(process.env.LAB7_DIR)('puppeteer-core');
const root = path.resolve('e-current');
const views = [['desktop', 1280, 800, 'light'], ['mobile', 375, 812, 'light'], ['desktop-dark', 1280, 800, 'dark']];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
for (const f of ['editor', 'dashboard', 'welcome']) for (const [n, w, h, s] of views) {
  await page.setViewport({ width: w, height: h });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: s }]);
  await page.goto(`file:///${root.split(path.sep).join('/')}/app/${f}.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `e-current/shots/${f}-${n}.png` });
}
await browser.close();
