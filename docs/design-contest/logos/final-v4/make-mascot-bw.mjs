// Black-and-white (tuxedo) cat mascot with a pink nose. Usage: LAB7_DIR=<dir with puppeteer-core> node make-mascot-bw.mjs
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(process.env.LAB7_DIR);
const puppeteer = require('puppeteer-core');
const OUT = new URL('.', import.meta.url).pathname.slice(1);
const K = '#14161f', W = '#ffffff', NOSE = '#f472b6', PINK = '#f9a8c9';
const TAIL = 'M66 84Q90 84 88 62Q87 54 80 57';
const cat = ({ face, block, belly, outline }) => {
  const sil = `<path d="M22 32L20 14L40 24H56L76 14L74 32Z" fill="${K}"/><rect x="18" y="22" width="60" height="46" rx="20" fill="${K}"/><rect x="30" y="64" width="36" height="28" rx="12" fill="${K}"/>`;
  const edge = outline ? `<path d="${TAIL}" fill="none" stroke="${W}" stroke-width="12.5" stroke-linecap="round"/><g stroke="${W}" stroke-width="5" stroke-linejoin="round">${sil}</g>` : '';
  return `<g>${edge}${sil}<path d="${TAIL}" fill="none" stroke="${K}" stroke-width="7" stroke-linecap="round"/>` +
    `<ellipse cx="48" cy="56" rx="11" ry="8" fill="${W}"/><path d="M44 52H52L48 57Z" fill="${NOSE}" stroke="${NOSE}" stroke-width="1.6" stroke-linejoin="round"/>` +
    (face ? `<ellipse cx="36" cy="43" rx="5" ry="5.4" fill="${W}"/><circle cx="36.8" cy="43.6" r="2.6" fill="${K}"/><ellipse cx="60" cy="43" rx="5" ry="5.4" fill="${W}"/><circle cx="60.8" cy="43.6" r="2.6" fill="${K}"/>` : '') +
    `<ellipse cx="48" cy="79" rx="16" ry="13" fill="${belly === 'pink' ? PINK : W}"/>` +
    `<rect x="36" y="67" width="24" height="19" rx="7" fill="${block}"${block === W ? ` stroke="${K}" stroke-width="2.2"` : ''}/><circle cx="33" cy="76" r="5.2" fill="${W}" stroke="${K}" stroke-width="1.5"/><circle cx="63" cy="76" r="5.2" fill="${W}" stroke="${K}" stroke-width="1.5"/></g>`;
};
const V = {};
for (const f of [1, 0]) for (const bl of ['white', 'pink']) V[`${f ? 'face' : 'faceless'}-belly-${bl}`] = { face: f, belly: bl, block: '#16a34a' };
const svg = (b) => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="DSLKit mascot">${b}</svg>\n`;
const sz = (s, n) => s.replace('width="96" height="96"', `width="${n}" height="${n}"`);
for (const [n, o] of Object.entries(V)) { writeFileSync(OUT + `mascot-bw-${n}-light.svg`, svg(cat({ ...o, outline: false }))); writeFileSync(OUT + `mascot-bw-${n}-dark.svg`, svg(cat({ ...o, outline: true }))); }
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const pg = await b.newPage();
const cell = (o, bg, out) => { const s = svg(cat({ ...o, outline: out })); return `<div style="background:${bg};padding:10px;border-radius:8px;display:flex;gap:8px;align-items:flex-end">${sz(s, 160)}${sz(s, 32)}${sz(s, 16)}</div>`; };
await pg.setViewport({ width: 900, height: 600 });
await pg.setContent(`<body style="margin:0;padding:14px;background:#e5e7eb;font:13px Arial">${Object.entries(V).map(([n, o]) => `<div style="margin-bottom:8px"><b>${n}</b><div style="display:flex;gap:10px;margin-top:4px">${cell(o, '#f8f9fc', false)}${cell(o, '#1e1e2e', true)}</div></div>`).join('')}</body>`);
await pg.screenshot({ path: OUT + 'mascot-bw-sheet.png', fullPage: true });
for (const [n, o] of Object.entries(V)) { await pg.setViewport({ width: 512, height: 512 }); await pg.setContent(`<body style="margin:0">${sz(svg(cat({ ...o, outline: false })), 512)}</body>`); await pg.screenshot({ path: OUT + `mascot-bw-${n}-512.png`, omitBackground: true }); }
await b.close(); console.log('ok');
