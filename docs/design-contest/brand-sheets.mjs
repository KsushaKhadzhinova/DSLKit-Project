// Builds one approval sheet per mockup variant (desktop light, dark, mobile of the editor, the list and the states) into brand-sheets/.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(process.env.LAB7_DIR);
const puppeteer = require('puppeteer-core');
const root = path.resolve('.');
mkdirSync('brand-sheets', { recursive: true });
const variants = [['a-calm', 'A. Спокойный'], ['b-command', 'B. Командный'], ['c-canvas', 'C. Холст'], ['d-guided', 'D. По шагам'], ['e-current', 'E. Текущий сайт (с новым лого и шрифтами)']];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1900, height: 1200 });
for (const [dir, title] of variants) {
  const shots = (n) => `file:///${root.split(path.sep).join('/')}/${dir}/shots/${n}.png`;
  const cells = [['Редактор', 'editor-desktop'], ['Список проектов', 'dashboard-desktop'], ['Состояния с маскотом', 'states-desktop'], ['Редактор, тёмная тема', 'editor-desktop-dark'], ['Состояния, тёмная тема', 'states-desktop-dark'], ['Телефон: редактор, список, состояния', null]]
    .map(([t, n]) => ({ t, n }))
    .filter((c) => c.n === null || existsSync(`${dir}/shots/${c.n}.png`));
  const mobile = ['editor-mobile', 'dashboard-mobile', 'states-mobile'].filter((n) => existsSync(`${dir}/shots/${n}.png`));
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:24px;background:#e5e7eb;font:16px system-ui}h1{margin:0 0 16px}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}figure{margin:0;background:#fff;padding:8px;border-radius:8px}figcaption{font-weight:700;margin-bottom:6px}img{width:100%;display:block}.m{display:flex;gap:8px}.m img{width:32%}</style><h1>${title}</h1><div class="g">${cells
    .map((c) => `<figure><figcaption>${c.t}</figcaption>${c.n ? `<img src="${shots(c.n)}">` : `<div class="m">${mobile.map((n) => `<img src="${shots(n)}">`).join('')}</div>`}</figure>`)
    .join('')}</div>`;
  writeFileSync(`brand-sheets/${dir}.html`, html);
  await page.goto(`file:///${root.split(path.sep).join('/')}/brand-sheets/${dir}.html`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `brand-sheets/${dir}.png`, fullPage: true });
}
await browser.close();
console.log('sheets done');
