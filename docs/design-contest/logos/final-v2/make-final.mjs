// Builds the brand kit for the four chosen pinwheel variants. Usage: LAB7_DIR=<dir with puppeteer-core> node make-final.mjs
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(process.env.LAB7_DIR ?? new URL('../../../../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');
const OUT = new URL('.', import.meta.url).pathname.slice(1);
const rot = (s, d) => `<g transform="rotate(${d} 32 32)">${s}</g>`;
// c = {ink, acc, bg, tile?}; mark body in a 64x64 box.
const V = {
  'pinwheel': (c, fav) => { const b = '<rect x="8" y="9" width="28" height="13" rx="5" '; return b + `fill="${c.acc}"/>` + [90, 180, 270].map(d => rot(b + `fill="${c.ink}"/>`, d)).join('') + (fav ? '' : `<circle cx="32" cy="32" r="5" fill="${c.bg}"/>`); },
  'pinwheel-arrows': (c) => { const b = '<path d="M8 9H30L38 15.5L30 22H8Z" stroke-linejoin="round" stroke-width="2" '; return b + `fill="${c.acc}" stroke="${c.acc}"/>` + [90, 180, 270].map(d => rot(b + `fill="${c.ink}" stroke="${c.ink}"/>`, d)).join(''); },
  'pinwheel-drag': (c, fav) => `<rect x="6" y="6" width="22" height="22" rx="7" fill="${c.ink}"/><rect x="36" y="36" width="22" height="22" rx="7" fill="${c.ink}"/><rect x="6" y="36" width="22" height="22" rx="7" fill="${c.ink}"/>` + (fav ? '' : `<rect x="36" y="6" width="22" height="22" rx="7" fill="none" stroke="${c.acc}" stroke-width="3" stroke-dasharray="4 4"/>`) + `<rect x="40" y="2" width="22" height="22" rx="7" fill="${c.acc}"/>`,
  'pinwheel-tile': (c) => { const b = '<rect x="14" y="15" width="21" height="10" rx="4" '; return `<rect x="2" y="2" width="60" height="60" rx="16" fill="${c.ink}"/>` + b + `fill="${c.acc}"/>` + [90, 180, 270].map(d => rot(b + `fill="${c.tbar}"/>`, d)).join(''); }
};
const themes = {
  light: { ink: '#14161f', acc: '#ff5a36', bg: '#ffffff', tbar: '#ffffff', text: '#14161f' },
  dark: { ink: '#f3f4f8', acc: '#ff5a36', bg: '#0f172a', tbar: '#14161f', text: '#f3f4f8' },
  'mono-black': { ink: '#000000', acc: '#000000', bg: '#ffffff', tbar: '#ffffff', text: '#000000' },
  'mono-white': { ink: '#ffffff', acc: '#ffffff', bg: '#000000', tbar: '#000000', text: '#ffffff' }
};
const svg = (body, w = 64, h = 64, vb = '0 0 64 64', title = 'DSLKit') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;
const font = "font-family=\"Inter, 'Segoe UI', Arial, sans-serif\" font-weight=\"700\"";
const lockup = (v, t) => { const c = themes[t]; const mono = t.startsWith('mono'); return svg(`<g>${V[v](c)}</g><text x="80" y="45" font-size="40" ${font} letter-spacing="-1" fill="${c.text}">DSL<tspan fill="${mono ? c.text : c.acc}">Kit</tspan></text>`, 272, 64, '0 0 272 64', 'DSLKit'); };
const files = {};
for (const v of Object.keys(V)) {
  const dir = OUT + v + '/'; mkdirSync(dir, { recursive: true });
  for (const [t, c] of Object.entries(themes)) {
    writeFileSync(dir + `mark-${t}.svg`, svg(V[v](c)));
    writeFileSync(dir + `lockup-horizontal-${t}.svg`, lockup(v, t));
  }
  // favicon: simplified, no thin details, fills the canvas
  writeFileSync(dir + 'favicon.svg', svg(V[v](themes.light, true)));
  files[v] = dir;
}
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const pg = await b.newPage();
async function png(svgText, size, path, bg) {
  await pg.setViewport({ width: size, height: size });
  await pg.setContent(`<body style="margin:0;background:${bg ?? 'transparent'}">${svgText.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`)}</body>`);
  await pg.screenshot({ path, omitBackground: !bg });
}
const icoParts = {};
for (const v of Object.keys(V)) {
  const fav = svg(V[v](themes.light, true));
  for (const s of [16, 32, 48, 180, 512]) await png(fav, s, files[v] + `favicon-${s}.png`);
  // lockup PNGs @2x on transparent
  for (const t of ['light', 'dark']) {
    const l = lockup(v, t).replace('width="272" height="64"', 'width="544" height="128"');
    await pg.setViewport({ width: 544, height: 128 });
    await pg.setContent(`<body style="margin:0;background:transparent">${l}</body>`);
    await pg.screenshot({ path: files[v] + `lockup-horizontal-${t}@2x.png`, omitBackground: true });
  }
  // ICO from 16/32/48 PNGs
  const fs = await import('node:fs');
  const pngs = [16, 32, 48].map(s => fs.readFileSync(files[v] + `favicon-${s}.png`));
  const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let off = 6 + 16 * pngs.length; const ents = [], data = [];
  [16, 32, 48].forEach((s, i) => { const e = Buffer.alloc(16); e[0] = s; e[1] = s; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(off, 12); off += pngs[i].length; ents.push(e); data.push(pngs[i]); });
  fs.writeFileSync(files[v] + 'favicon.ico', Buffer.concat([head, ...ents, ...data]));
}
// contact sheet: all variants, all themes + 16px
const cell = (v, t, sz) => { const c = themes[t]; const bg = t === 'dark' || t === 'mono-white' ? (t === 'dark' ? '#0f172a' : '#000') : '#fff'; return `<div style="background:${bg};padding:12px;border-radius:8px;display:flex;gap:10px;align-items:flex-end">${svg(V[v](c), sz, sz)}${svg(V[v](c, true), 16, 16)}</div>`; };
const rows = Object.keys(V).map(v => `<div style="margin:0 0 14px"><b style="font:14px Arial">${v}</b><div style="display:flex;gap:10px;margin:6px 0">${Object.keys(themes).map(t => cell(v, t, 72)).join('')}</div><div style="display:flex;gap:10px;flex-wrap:wrap"><div style="background:#fff;padding:8px;border-radius:8px">${lockup(v, 'light')}</div><div style="background:#0f172a;padding:8px;border-radius:8px">${lockup(v, 'dark')}</div></div></div>`).join('');
await pg.setViewport({ width: 1000, height: 900 });
await pg.setContent(`<body style="margin:0;padding:16px;background:#f3f4f6">${rows}</body>`);
await pg.screenshot({ path: OUT + 'contact-sheet.png', fullPage: true });
await b.close();
console.log('done');
