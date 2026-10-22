// Screenshots of the editor and an error page at three widths: node docs/design-contest/shoot-fixes.mjs <outDir>
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire('E:/DSLKit-Project/.claude/worktrees/part2-ws-work-ee9b7b/part-2/lab-07-websocket/');
const puppeteer = require('puppeteer-core');
const out = process.argv[2] ?? 'docs/design-contest/fixes';
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const sizes = { desktop: [1440, 900], tablet: [820, 1100], mobile: [390, 844] };
const pages = { 'editor-ru': '/app/editor.html', 'editor-en': '/en/app/editor.html', 'error-403': '/errors/403.html', 'error-404': '/errors/404.html' };
for (const [name, path] of Object.entries(pages)) {
  for (const [size, [width, height]] of Object.entries(sizes)) {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: `${out}/${name}-${size}.png` });
    if (name.startsWith('editor') && size === 'desktop') {
      await page.evaluate(() => document.querySelector('.editor-toolbar__row details.editor-menu')?.setAttribute('open', ''));
      await page.screenshot({ path: `${out}/${name}-menu-open.png` });
    }
    await page.close();
  }
}
await browser.close();
