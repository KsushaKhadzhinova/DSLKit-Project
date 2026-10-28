// Renders blind logo sheets for the independent survey. Usage: node make-sheets.mjs
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(process.env.LAB7_DIR ?? new URL('../../../../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');
const P = '#2563eb', A = '#d97706', sw = 6, r = 9;
const logo = (id, sz, w = '#fff') => {
  let s = '';
  if (id === 'smile') s = `<rect x="8" y="6" width="48" height="40" rx="${r}" fill="${P}"/><circle cx="24" cy="23" r="3.5" fill="${w}"/><circle cx="40" cy="23" r="3.5" fill="${w}"/><path d="M22 33Q32 41 42 33" fill="none" stroke="${w}" stroke-width="${sw * .7}" stroke-linecap="round"/><path d="M32 46V54" stroke="${A}" stroke-width="${sw}" stroke-linecap="round"/><circle cx="32" cy="57" r="${sw * .7}" fill="${A}"/>`;
  if (id === 'arrow') s = `<rect x="4" y="16" width="32" height="32" rx="${r}" fill="${P}"/><path d="M38 32H56M47 22L57 32L47 42" fill="none" stroke="${A}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (id === 'cursor') s = `<rect x="6" y="8" width="34" height="28" rx="${r}" fill="none" stroke="${P}" stroke-width="4" stroke-dasharray="6 5"/><rect x="18" y="20" width="34" height="28" rx="${r}" fill="${P}"/><path d="M38 34L38 60L45 53L50 62L55 60L50 51L59 51Z" fill="${A}" stroke="${w}" stroke-width="2.5" stroke-linejoin="round"/>`;
  if (id === 'mono') s = `<rect x="4" y="4" width="56" height="56" rx="${r}" fill="${P}"/><path d="M22 16V48" stroke="${w}" stroke-width="${sw}" stroke-linecap="round"/><path d="M22 34L41 16" stroke="${w}" stroke-width="${sw}" stroke-linecap="round"/><path d="M29 31L43 48" stroke="${A}" stroke-width="${sw}" stroke-linecap="round"/>`;
  if (id === 'flow') s = `<rect x="2" y="20" width="22" height="24" rx="${r * .7}" fill="${P}"/><rect x="40" y="20" width="22" height="24" rx="${r * .7}" fill="${A}"/><path d="M24 32H40" stroke="${P}" stroke-width="${sw}" stroke-linecap="round"/>`;
  return `<svg width="${sz}" height="${sz}" viewBox="0 0 64 64">${s}</svg>`;
};
const order = ['cursor', 'flow', 'smile', 'mono', 'arrow']; // blind order: 1..5
writeFileSync(new URL('key.json', import.meta.url), JSON.stringify(Object.fromEntries(order.map((id, i) => [i + 1, id])), null, 1));
const css = 'body{margin:0;font:16px Arial;background:#fff;padding:20px;width:860px}.row{display:flex;gap:28px;margin:0 0 18px;align-items:flex-end}.c{display:flex;flex-direction:column;align-items:center;gap:8px}.d{background:#0f172a;padding:14px;border-radius:8px}h3{margin:0 0 10px}';
const big = `<style>${css}</style><h3>Logo options 1-5 (large)</h3><div class=row>${order.map((id, i) => `<div class=c>${logo(id, 140)}<b>${i + 1}</b></div>`).join('')}</div>`;
const small = `<style>${css}</style><h3>Same options at small sizes, on dark, in grayscale</h3>
<div class=row>${order.map((id, i) => `<div class=c>${logo(id, 32)}${logo(id, 16)}<b>${i + 1}</b></div>`).join('')}</div>
<div class="row d">${order.map((id, i) => `<div class=c style="color:#fff">${logo(id, 48, '#0f172a')}<b>${i + 1}</b></div>`).join('')}</div>
<div class=row style="filter:grayscale(1)">${order.map((id, i) => `<div class=c>${logo(id, 48)}<b>${i + 1}</b></div>`).join('')}</div>`;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const pg = await b.newPage(); await pg.setViewport({ width: 900, height: 400 });
for (const [n, html] of [['sheet-large.png', big], ['sheet-small.png', small]]) {
  await pg.setContent(html); await pg.screenshot({ path: new URL(n, import.meta.url).pathname.slice(1), fullPage: true });
}
await b.close();
