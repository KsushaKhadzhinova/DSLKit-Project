// Element specification pages: every button, icon and field of the editor with its size, tooltip and label.
// Usage: node docs/design-contest/spec-elements.mjs <outDir>   (site served on http://localhost:5173)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(process.env.LAB7_DIR ?? new URL('../../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');

const out = process.argv[2] ?? 'docs/design-contest/specs';
mkdirSync(out, { recursive: true });
const pages = { ru: '/app/editor.html', en: '/en/app/editor.html' };
const TITLES = {
  ru: { h: 'Элементы редактора: размеры, подписи и подсказки', cols: ['Элемент', 'Класс', 'Подпись или подсказка', 'Ширина, px', 'Высота, px', 'Цель 44 px'], ok: 'да', no: 'нет', note: 'Размеры измерены на экране 1440 на 900 пикселей. Цель нажатия не меньше 44 на 44 пикселя (WCAG 2.2, 2.5.8 и 2.5.5).' },
  en: { h: 'Editor elements: sizes, labels and tooltips', cols: ['Element', 'Class', 'Label or tooltip', 'Width, px', 'Height, px', '44 px target'], ok: 'yes', no: 'no', note: 'Sizes are measured on a 1440 by 900 pixel screen. A touch target is at least 44 by 44 pixels (WCAG 2.2, 2.5.8 and 2.5.5).' },
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
for (const [lang, path] of Object.entries(pages)) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle2' });
  // Open every menu so the items inside have a size too.
  await page.evaluate(() => document.querySelectorAll('details.editor-menu').forEach((d) => d.setAttribute('open', '')));
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('button, a[href], select, input, summary, [role="tab"], [role="switch"]')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        const label = el.getAttribute('data-tip') || el.getAttribute('aria-label') || el.textContent.trim().replace(/\s+/g, ' ') || el.getAttribute('title') || '';
        return { tag: el.tagName.toLowerCase(), cls: (el.getAttribute('class') || '').split(' ')[0], label: label.slice(0, 70), w: Math.round(r.width), h: Math.round(r.height) };
      })
      .filter((row) => row.w > 0 && row.h > 0 && row.cls !== "skip-link"),
  );
  const t = TITLES[lang];
  const body = rows
    .map((row) => `<tr><td>${esc(row.tag)}</td><td><code>${esc(row.cls)}</code></td><td>${esc(row.label)}</td><td>${row.w}</td><td>${row.h}</td><td class="${row.w >= 44 && row.h >= 44 ? 'ok' : 'low'}">${row.w >= 44 && row.h >= 44 ? t.ok : t.no}</td></tr>`)
    .join('\n');
  const html = `<!doctype html><html lang="${lang}"><meta charset="utf-8"><title>${esc(t.h)}</title><style>
body{background:#fff;color-scheme:light;font:16px/1.5 Inter,system-ui,sans-serif;margin:2rem auto;max-width:72rem;padding:0 1rem;color:#1c1f2e}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #dde1e9;padding:.35rem .6rem;text-align:left}th{background:#e8efff}
.ok{color:#15803d;font-weight:600}.low{color:#b45309;font-weight:600}code{font-size:.85em}</style>
<h1>${esc(t.h)}</h1><p>${esc(t.note)}</p>
<table><thead><tr>${t.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></html>`;
  writeFileSync(`${out}/editor-elements-${lang}.html`, html);
  const view = await browser.newPage();
  await view.setViewport({ width: 1200, height: 900 });
  await view.setContent(html);
  await view.screenshot({ path: `${out}/editor-elements-${lang}.png`, fullPage: true });
  await view.close();
  await page.close();
  console.log(lang, rows.length, 'elements');
}
await browser.close();
