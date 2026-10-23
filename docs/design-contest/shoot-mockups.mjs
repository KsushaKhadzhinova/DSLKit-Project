// Editor mockups: every notation x every rendering engine x RU/EN, each with and without a tooltip.
// Usage: node docs/design-contest/shoot-mockups.mjs <outDir> [notation,notation] [engine,engine]
// The site must be served on http://localhost:5173 (node tools/serve.js site 5173). Kroki engines need the internet.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(process.env.LAB7_DIR ?? new URL('../../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');

const out = process.argv[2] ?? 'docs/design-contest/mockups';
const NOTATIONS = (process.argv[3] ?? 'idef0,idef1,idef1x,idef3,idef4,idef5,dfd,erd,bpmn,petri,gost,graph,dag,uml-class,uml-object,uml-component,uml-composite,uml-deployment,uml-package,uml-profile,uml-usecase,uml-activity,uml-state,uml-sequence,uml-communication,uml-timing,uml-overview').split(',');
const ENGINES = (process.argv[4] ?? 'graphviz,mermaid,plantuml,local').split(',');
const LANGS = { ru: '/app/editor.html', en: '/en/app/editor.html' };

mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const settle = (page) =>
  page
    .waitForFunction(() => !document.querySelector('.canvas')?.hasAttribute('aria-busy') || document.querySelector('.canvas').getAttribute('aria-busy') === 'false', { timeout: 12000 })
    .catch(() => {});

for (const [lang, path] of Object.entries(LANGS)) {
  for (const engine of ENGINES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluateOnNewDocument((id) => {
      localStorage.setItem('dslkit.settings', JSON.stringify({ 'diagram-engine': id }));
    }, engine);
    await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle2' });
    for (const notation of NOTATIONS) {
      await page.select('[data-notation-select]', notation);
      await new Promise((resolve) => setTimeout(resolve, 250));
      await settle(page);
      await new Promise((resolve) => setTimeout(resolve, 350));
      const base = `${out}/${lang}-${engine}-${notation}`;
      await page.mouse.move(5, 5);
      await page.screenshot({ path: `${base}.png` });
      const tip = await page.$('.editor-toolbar__row [data-tip]');
      if (tip) {
        await tip.hover();
        await new Promise((resolve) => setTimeout(resolve, 250));
        await page.screenshot({ path: `${base}-tooltip.png` });
      }
    }
    await page.close();
    console.log('done', lang, engine);
  }
}
await browser.close();
