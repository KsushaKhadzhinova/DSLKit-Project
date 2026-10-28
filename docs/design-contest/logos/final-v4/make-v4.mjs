// Marks and mascot built from the test profile (soft corners, drag trace, K/DSL letters, one accent). Project palette.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const require = createRequire(process.env.LAB7_DIR ?? new URL('../../../../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');
const OUT = new URL('.', import.meta.url).pathname.slice(1);
const T = {
  light: { b: '#2563eb', g: '#16a34a', cut: '#ffffff', bg: '#f8f9fc', text: '#1c1f2e' },
  dark: { b: '#8bb0ff', g: '#4ade80', cut: '#1e1e2e', bg: '#1e1e2e', text: '#cdd6f4' },
  'mono-black': { b: '#000', g: '#000', cut: '#fff', bg: '#fff', text: '#000' },
  'mono-white': { b: '#fff', g: '#fff', cut: '#000', bg: '#000', text: '#fff' }
};
const font = `font-family="Inter, 'Segoe UI', Arial, sans-serif" font-weight="800"`;
const K = c => `<path d="M17 31V51M17 42L30 31M21 41L31 51" fill="none" stroke="${c.cut}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>`;
const DSL = c => `<text x="22" y="47" text-anchor="middle" font-size="14" ${font} fill="${c.cut}">DSL</text>`;
const drag = (c, fav) => (fav ? '' : `<path d="M54 26V20" stroke="${c.g}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1 4.5"/><rect x="46" y="27" width="16" height="16" rx="5.5" fill="none" stroke="${c.g}" stroke-width="2.6" stroke-dasharray="4 3.5"/>`) + `<rect x="46" y="${fav ? 22 : 4}" width="16" height="16" rx="5.5" fill="${c.g}"/>`;
const mark = (kind, c, fav) => `<rect x="2" y="22" width="40" height="40" rx="13" fill="${c.b}"/>` + (kind === 'k' ? K(c) : kind === 'dsl' ? DSL(c) : '') + drag(c, fav);
// mascot: cat built of soft blocks holding the dragged block (96x96)
const mascot = (c, face = true) => `<path d="M22 32L20 14L40 24H56L76 14L74 32Z" fill="${c.b}" stroke="${c.b}" stroke-width="5" stroke-linejoin="round"/><rect x="18" y="22" width="60" height="46" rx="20" fill="${c.b}"/><rect x="30" y="64" width="36" height="28" rx="12" fill="${c.b}"/><path d="M66 84Q90 84 88 62Q87 54 80 57" fill="none" stroke="${c.b}" stroke-width="7" stroke-linecap="round"/>` + (face ? `<circle cx="36" cy="44" r="3.6" fill="${c.cut}"/><circle cx="60" cy="44" r="3.6" fill="${c.cut}"/><path d="M44 53H52L48 58Z" fill="${c.cut}"/>` : '') + `<rect x="36" y="66" width="24" height="20" rx="7" fill="${c.g}"/><circle cx="33" cy="76" r="5" fill="${c.b}"/><circle cx="63" cy="76" r="5" fill="${c.b}"/>`;
const svg = (b, w, h, vb, t = 'DSLKit') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}" role="img" aria-label="${t}"><title>${t}</title>${b}</svg>\n`;
const lockup = (kind, c) => svg(`<g>${mark(kind, c)}</g><text x="76" y="52" font-size="38" ${font} letter-spacing="-1" fill="${c.text}">DSL<tspan fill="${c.g}">Kit</tspan></text>`, 268, 64, '0 0 268 64');
const kinds = ['k', 'dsl', 'blocks'];
for (const t of Object.keys(T)) {
  for (const k of kinds) { writeFileSync(OUT + `mark-${k}-${t}.svg`, svg(mark(k, T[t]), 64, 64, '0 0 64 64')); writeFileSync(OUT + `lockup-${k}-${t}.svg`, lockup(k, T[t])); }
  writeFileSync(OUT + `mascot-${t}.svg`, svg(mascot(T[t]), 96, 96, '0 0 96 96', 'DSLKit mascot'));
  writeFileSync(OUT + `mascot-faceless-${t}.svg`, svg(mascot(T[t], false), 96, 96, '0 0 96 96', 'DSLKit mascot'));
}
const fav = kind => svg(mark(kind, T.light, true), 64, 64, '0 0 64 64');
const tile = kind => svg(`<rect width="64" height="64" rx="16" fill="#1c1f2e"/><g transform="translate(4 2) scale(.88)">${mark(kind, T.dark, true)}</g>`, 64, 64, '0 0 64 64');
writeFileSync(OUT + 'favicon-k.svg', fav('k')); writeFileSync(OUT + 'favicon-blocks.svg', fav('blocks')); writeFileSync(OUT + 'app-icon-k.svg', tile('k'));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const pg = await b.newPage();
const png = async (s, w, h, p, bg) => { await pg.setViewport({ width: w, height: h }); await pg.setContent(`<body style="margin:0;background:${bg ?? 'transparent'}">${s.replace(/width="\d+" height="\d+"/, `width="${w}" height="${h}"`)}</body>`); await pg.screenshot({ path: p, omitBackground: !bg }); };
for (const k of ['k', 'blocks']) { for (const s of [16, 32, 48, 180, 512]) await png(fav(k), s, s, OUT + `favicon-${k}-${s}.png`); }
for (const s of [180, 512, 1024]) await png(tile('k'), s, s, OUT + `app-icon-k-${s}.png`);
const ico = k => { const p = [16, 32, 48].map(s => readFileSync(OUT + `favicon-${k}-${s}.png`)); const h = Buffer.alloc(6); h.writeUInt16LE(1, 2); h.writeUInt16LE(3, 4); let o = 54; const e = [], d = []; [16, 32, 48].forEach((s, i) => { const x = Buffer.alloc(16); x[0] = s; x[1] = s; x.writeUInt16LE(1, 4); x.writeUInt16LE(32, 6); x.writeUInt32LE(p[i].length, 8); x.writeUInt32LE(o, 12); o += p[i].length; e.push(x); d.push(p[i]); }); writeFileSync(OUT + `favicon-${k}.ico`, Buffer.concat([h, ...e, ...d])); };
ico('k'); ico('blocks');
const row = k => `<div style="display:flex;gap:10px;margin-bottom:10px;align-items:stretch">${['light', 'dark', 'mono-black', 'mono-white'].map(t => `<div style="background:${T[t].bg};padding:10px;border-radius:8px;display:flex;gap:8px;align-items:flex-end">${svg(mark(k, T[t]), 80, 80, '0 0 64 64')}${svg(mark(k, T[t], true), 16, 16, '0 0 64 64')}${svg(mark(k, T[t], true), 32, 32, '0 0 64 64')}</div>`).join('')}</div><div style="display:flex;gap:10px;margin-bottom:16px"><div style="background:#f8f9fc;padding:8px;border-radius:8px">${lockup(k, T.light)}</div><div style="background:#1e1e2e;padding:8px;border-radius:8px">${lockup(k, T.dark)}</div></div>`;
await pg.setViewport({ width: 960, height: 700 });
await pg.setContent(`<body style="margin:0;padding:16px;background:#e5e7eb;font:13px Arial">${kinds.map(row).join('')}<div style="display:flex;gap:10px"><div style="background:#f8f9fc;padding:8px;border-radius:8px">${svg(mascot(T.light), 170, 170, '0 0 96 96')}</div><div style="background:#f8f9fc;padding:8px;border-radius:8px">${svg(mascot(T.light, false), 170, 170, '0 0 96 96')}</div><div style="background:#1e1e2e;padding:8px;border-radius:8px">${svg(mascot(T.dark), 170, 170, '0 0 96 96')}</div><div style="padding:8px">${tile('k').replace('width="64" height="64"', 'width="170" height="170"')}</div></div></body>`);
await pg.screenshot({ path: OUT + 'contact-sheet.png', fullPage: true });
await b.close(); console.log('done');
