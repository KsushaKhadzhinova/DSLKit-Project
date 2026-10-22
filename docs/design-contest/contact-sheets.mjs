// Contact sheets of the editor mockups: one image per language and engine with all notations.
import { createRequire } from 'node:module';
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire('E:/DSLKit-Project/.claude/worktrees/part2-ws-work-ee9b7b/part-2/lab-07-websocket/');
const puppeteer = require('puppeteer-core');
const dir = 'E:/DSLKit-Project/docs/design-contest/mockups';
const out = 'E:/DSLKit-Project/docs/design-contest/sheets';
mkdirSync(out, { recursive: true });
const files = readdirSync(dir).filter((f) => f.endsWith('.png') && !f.endsWith('-tooltip.png'));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
for (const lang of ['ru', 'en']) for (const engine of ['graphviz', 'mermaid', 'plantuml', 'local']) {
  const list = files.filter((f) => f.startsWith(`${lang}-${engine}-`));
  const cells = list.map((f) => `<figure><img src="file:///${dir}/${f}"><figcaption>${f.replace(`${lang}-${engine}-`, '').replace('.png', '')}</figcaption></figure>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff;font:14px Inter,sans-serif;color:#1c1f2e}h1{margin:12px}main{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:10px}figure{margin:0}img{width:100%;border:1px solid #dde1e9}figcaption{font-weight:600;padding:2px 0}</style><h1>${lang.toUpperCase()} · ${engine}</h1><main>${cells}</main>`;
  const page = await browser.newPage();
  await page.setViewport({ width: 2000, height: 1000 });
  writeFileSync(`${out}/${lang}-${engine}.html`, html);
  await page.goto(`file:///${out}/${lang}-${engine}.html`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: `${out}/${lang}-${engine}.png`, fullPage: true });
  await page.close();
}
await browser.close();
