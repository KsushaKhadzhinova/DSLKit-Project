// Brand kit for the origami-cat head in the project palette. Usage: LAB7_DIR=<dir with puppeteer-core> node make-cat.mjs
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const require = createRequire(process.env.LAB7_DIR ?? new URL('../../../../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');
const OUT = new URL('.', import.meta.url).pathname.slice(1);
const T = {
  light: { head: '#2563eb', ear: '#16a34a', face: '#ffffff', gap: null, bg: '#f8f9fc', text: '#1c1f2e', k: '#16a34a' },
  dark: { head: '#8bb0ff', ear: '#4ade80', face: '#1e1e2e', gap: null, bg: '#1e1e2e', text: '#cdd6f4', k: '#4ade80' },
  'mono-black': { head: '#000', ear: '#000', face: '#fff', gap: '#fff', bg: '#fff', text: '#000', k: '#000' },
  'mono-white': { head: '#fff', ear: '#fff', face: '#000', gap: '#000', bg: '#000', text: '#fff', k: '#fff' }
};
// head, 64x64. simple=true drops fold shading for tiny sizes.
const head = (c, simple) => {
  const g = c.gap ? ` stroke="${c.gap}" stroke-width="1.6" stroke-linejoin="round"` : '';
  return `<path d="M6 24L10 4L26 15H38L54 4L58 24V38Q58 58 32 58Q6 58 6 38Z" fill="${c.head}"/>` +
    `<path d="M10 4L26 15L6 24Z" fill="${c.ear}"${g}/><path d="M54 4L38 15L58 24Z" fill="${c.ear}"${g}/>` +
    (simple ? '' : `<path d="M26 15H38L32 38Z" fill="#fff" opacity="${c.gap ? 0 : 0.2}"/><path d="M6 24L32 38L6 42Z" fill="#fff" opacity="${c.gap ? 0 : 0.14}"/><path d="M58 24L32 38L58 42Z" fill="#000" opacity="${c.gap ? 0 : 0.16}"/>`) +
    `<path d="M16 33L23 30L25 36L18 38ZM48 33L41 30L39 36L46 38Z" fill="${c.face}"/><path d="M28.5 43H35.5L32 48Z" fill="${c.face}"/>`;
};
const full = (c) => `<g transform="translate(8 0) scale(.75)">${head(c)}</g><path d="M20 44L52 44L60 84L12 84Z" fill="${c.head}"/><path d="M20 44L36 84H12Z" fill="#fff" opacity="${c.gap ? 0 : 0.16}"/><path d="M60 84Q82 82 78 60Q76 52 68 56" fill="none" stroke="${c.ear}" stroke-width="7" stroke-linecap="round"/>`;
const svg = (b, w = 64, h = 64, vb = '0 0 64 64', t = 'DSLKit') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}" role="img" aria-label="${t}"><title>${t}</title>${b}</svg>\n`;
const font = `font-family="Inter, 'Segoe UI', Arial, sans-serif" font-weight="700"`;
const lockup = (t) => { const c = T[t]; return svg(`<g>${head(c)}</g><text x="76" y="45" font-size="40" ${font} letter-spacing="-1" fill="${c.text}">DSL<tspan fill="${c.k}">Kit</tspan></text>`, 268, 64, '0 0 268 64'); };
const tile = () => { const c = T.dark; return svg(`<rect x="0" y="0" width="64" height="64" rx="16" fill="#1c1f2e"/><g transform="translate(8 9) scale(.75)">${head({ ...c, face: '#1c1f2e' }, true)}</g>`); };
for (const t of Object.keys(T)) {
  writeFileSync(OUT + `head-${t}.svg`, svg(head(T[t])));
  writeFileSync(OUT + `lockup-horizontal-${t}.svg`, lockup(t));
  writeFileSync(OUT + `mascot-full-${t}.svg`, svg(full(T[t]), 96, 96, '0 0 96 96', 'DSLKit mascot'));
}
writeFileSync(OUT + 'favicon.svg', svg(head(T.light, true)));
writeFileSync(OUT + 'app-icon-tile.svg', tile());
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const pg = await b.newPage();
const png = async (s, w, h, p, bg) => { await pg.setViewport({ width: w, height: h }); await pg.setContent(`<body style="margin:0;background:${bg ?? 'transparent'}">${s.replace(/width="\d+" height="\d+"/, `width="${w}" height="${h}"`)}</body>`); await pg.screenshot({ path: p, omitBackground: !bg }); };
for (const s of [16, 32, 48, 180, 512]) await png(svg(head(T.light, true)), s, s, OUT + `favicon-${s}.png`);
for (const s of [180, 512, 1024]) await png(tile(), s, s, OUT + `app-icon-${s}.png`);
for (const t of ['light', 'dark']) await png(lockup(t), 536, 128, OUT + `lockup-horizontal-${t}@2x.png`);
const pngs = [16, 32, 48].map(s => readFileSync(OUT + `favicon-${s}.png`));
const hd = Buffer.alloc(6); hd.writeUInt16LE(1, 2); hd.writeUInt16LE(3, 4);
let off = 6 + 48; const en = [], da = [];
[16, 32, 48].forEach((s, i) => { const e = Buffer.alloc(16); e[0] = s; e[1] = s; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(off, 12); off += pngs[i].length; en.push(e); da.push(pngs[i]); });
writeFileSync(OUT + 'favicon.ico', Buffer.concat([hd, ...en, ...da]));
const cell = (t, s) => `<div style="background:${T[t].bg};padding:12px;border-radius:8px;display:flex;gap:10px;align-items:flex-end">${svg(head(T[t]), s, s)}${svg(head(T[t], true), 16, 16)}${svg(head(T[t], true), 32, 32)}</div>`;
await pg.setViewport({ width: 900, height: 600 });
await pg.setContent(`<body style="margin:0;padding:16px;background:#e5e7eb;font:14px Arial"><div style="display:flex;gap:10px">${Object.keys(T).map(t => cell(t, 96)).join('')}</div><div style="display:flex;gap:10px;margin-top:10px"><div style="background:#f8f9fc;padding:10px;border-radius:8px">${lockup('light')}</div><div style="background:#1e1e2e;padding:10px;border-radius:8px">${lockup('dark')}</div></div><div style="display:flex;gap:10px;margin-top:10px"><div style="background:#f8f9fc;padding:10px;border-radius:8px">${svg(full(T.light), 150, 150, '0 0 96 96')}</div><div style="background:#1e1e2e;padding:10px;border-radius:8px">${svg(full(T.dark), 150, 150, '0 0 96 96')}</div><div style="padding:10px">${tile().replace('width="64" height="64"', 'width="150" height="150"')}</div></div></body>`);
await pg.screenshot({ path: OUT + 'contact-sheet.png', fullPage: true });
await b.close(); console.log('done');
