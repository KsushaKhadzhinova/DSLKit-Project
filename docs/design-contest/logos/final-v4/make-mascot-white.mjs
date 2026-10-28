// White cat with black spots, pink nose, black tail tip, holding a white diagram frame with a black outline.
// Usage: LAB7_DIR=<dir with puppeteer-core> node make-mascot-white.mjs
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(process.env.LAB7_DIR);
const puppeteer = require('puppeteer-core');
const OUT = new URL('.', import.meta.url).pathname.slice(1);
const K = '#14161f', W = '#ffffff', NOSE = '#f472b6', PINK = '#f9a8c9';
const TAIL = 'M66 84Q90 84 88 62Q87 54 80 57';
const EARS = 'M22 32L20 14L40 24H56L76 14L74 32Z';
const cat = ({ face, line, belly }, id) => {
  const sil = `<path d="${EARS}"/><rect x="18" y="22" width="60" height="46" rx="20"/><rect x="30" y="64" width="36" height="28" rx="12"/>`;
  return `<defs><clipPath id="c${id}">${sil}</clipPath></defs>` +
    `<path d="${TAIL}" fill="none" stroke="${K}" stroke-width="11.5" stroke-linecap="round"/>` +
    `<g fill="${K}" stroke="${K}" stroke-width="5" stroke-linejoin="round">${sil}</g>` +
    `<path d="${TAIL}" fill="none" stroke="${W}" stroke-width="6.5" stroke-linecap="round"/>` +
    `<g fill="${W}">${sil}</g>` +
    `<g clip-path="url(#c${id})" fill="${K}"><ellipse cx="34" cy="36" rx="17" ry="15"/><path d="M18 10L44 26L18 40Z"/><ellipse cx="64" cy="86" rx="11" ry="9"/></g>` +
    `<circle cx="81" cy="56.5" r="4.2" fill="${K}"/>` +
    `<ellipse cx="48" cy="79" rx="16" ry="13" fill="${belly === 'pink' ? PINK : W}"/>` +
    (face ? `<circle cx="34" cy="42" r="3.4" fill="${W}"/><circle cx="60" cy="42" r="3.4" fill="${K}"/>` : '') +
    `<path d="M48 57C42 53 42.5 48.6 45.6 48.6C47 48.6 48 49.6 48 50.6C48 49.6 49 48.6 50.4 48.6C53.5 48.6 54 53 48 57Z" fill="${NOSE}" stroke="${NOSE}" stroke-width="1" stroke-linejoin="round"/>` +
    `<rect x="36" y="67" width="24" height="19" rx="4" fill="${W}" stroke="${K}" stroke-width="2.6"/>` +
    (line ? `<path d="M41 76.5H55" stroke="${K}" stroke-width="2.4" stroke-linecap="round"/>` : '') +
    `<circle cx="33" cy="76" r="5.2" fill="${W}" stroke="${K}" stroke-width="2"/><circle cx="63" cy="76" r="5.2" fill="${W}" stroke="${K}" stroke-width="2"/>`;
};
const V = {};
for (const f of [0, 1]) for (const l of [0, 1]) for (const bl of ['white', 'pink']) V[`${f ? 'face' : 'faceless'}-${l ? 'line' : 'frame'}-belly-${bl}`] = { face: f, line: l, belly: bl };
const svg = (b, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="DSLKit mascot">${bg ? `<rect width="96" height="96" fill="${bg}"/>` : ''}${b}</svg>\n`;
const sz = (s, n) => s.replace('width="96" height="96"', `width="${n}" height="${n}"`);
let i = 0;
for (const [n, o] of Object.entries(V)) { writeFileSync(OUT + `mascot-white-${n}-light.svg`, svg(cat(o, `f${i++}`))); writeFileSync(OUT + `mascot-white-${n}-dark.svg`, svg(cat(o, `g${i++}`), '#1e1e2e')); }
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const pg = await b.newPage();
let j = 0;
const cell = (o, bg) => { const s = svg(cat(o, `s${j++}`)); return `<div style="background:${bg};padding:8px;border-radius:8px;display:flex;gap:8px;align-items:flex-end">${sz(s, 150)}${sz(s.replace(/id="c(\w+)"/, 'id="c$1x"').replace(/url\(#c(\w+)\)/, 'url(#c$1x)'), 32)}</div>`; };
await pg.setViewport({ width: 900, height: 700 });
await pg.setContent(`<body style="margin:0;padding:12px;background:#e5e7eb;font:13px Arial">${Object.entries(V).filter(([n]) => n.includes('belly-white')).map(([n, o]) => `<div style="margin-bottom:8px"><b>${n}</b><div style="display:flex;gap:10px;margin-top:4px">${cell(o, '#f8f9fc')}${cell(o, '#1e1e2e')}</div></div>`).join('')}<div><b>face-frame-belly-pink</b><div style="display:flex;gap:10px;margin-top:4px">${cell(V['face-frame-belly-pink'], '#f8f9fc')}</div></div></body>`);
await pg.screenshot({ path: OUT + 'mascot-white-sheet.png', fullPage: true });
for (const [n, o] of Object.entries(V)) { await pg.setViewport({ width: 512, height: 512 }); await pg.setContent(`<body style="margin:0">${sz(svg(cat(o, 'p')), 512)}</body>`); await pg.screenshot({ path: OUT + `mascot-white-${n}-512.png`, omitBackground: true }); }
await b.close(); console.log('ok');
