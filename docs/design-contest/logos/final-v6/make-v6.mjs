// Pinwheel-tile kits in four colour schemes + blind sheets for round 4. LAB7_DIR=<dir with puppeteer-core> node make-v6.mjs
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const require = createRequire(process.env.LAB7_DIR);
const puppeteer = require('puppeteer-core');
const OUT = new URL('.', import.meta.url).pathname.slice(1), L = new URL('../', import.meta.url).pathname.slice(1);
const P = {
  'blue-amber': { n: 'Синий проекта и янтарь', t: '#2563eb', b: '#ffffff', a: '#fbbf24' },
  'indigo-amber': { n: 'Индиго и янтарь', t: '#312e81', b: '#eef2ff', a: '#fbbf24' },
  'teal-amber': { n: 'Бирюза и янтарь', t: '#0f3d3e', b: '#f4fbf9', a: '#f5b942' },
  'tea': { n: 'Чайная', t: '#3b2f2a', b: '#fff7ed', a: '#f4a261' }
};
const rot = (s, d) => `<g transform="rotate(${d} 32 32)">${s}</g>`;
const bar = c => `<rect x="14" y="15" width="21" height="10" rx="4.5" fill="${c}"/>`;
const mark = (tile, bars, acc) => `<rect width="64" height="64" rx="16" fill="${tile}"/>${bar(acc)}${[90, 180, 270].map(d => rot(bar(bars), d)).join('')}`;
const svg = (b, w = 64, h = 64, vb = '0 0 64 64') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}" role="img" aria-label="DSLKit"><title>DSLKit</title>${b}</svg>\n`;
const font = `font-family="Inter, 'Segoe UI', Arial, sans-serif" font-weight="800"`;
const variants = p => ({
  light: { m: mark(p.t, p.b, p.a), text: p.t },
  dark: { m: mark(p.b, p.t, p.a), text: p.b },
  'mono-black': { m: mark('#000', '#fff', '#fff'), text: '#000' },
  'mono-white': { m: mark('#fff', '#000', '#000'), text: '#fff' }
});
const lock = (v) => svg(`<g>${v.m}</g><text x="76" y="50" font-size="38" ${font} letter-spacing="-1" fill="${v.text}">DSLKit</text>`, 252, 64, '0 0 252 64');
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const pg = await b.newPage();
const png = async (s, w, h, p) => { await pg.setViewport({ width: w, height: h }); await pg.setContent(`<body style="margin:0;background:transparent">${s.replace(/width="\d+" height="\d+"/, `width="${w}" height="${h}"`)}</body>`); await pg.screenshot({ path: p, omitBackground: true }); };
for (const [k, p] of Object.entries(P)) {
  const dir = OUT + k + '/'; mkdirSync(dir, { recursive: true });
  const v = variants(p);
  for (const [t, x] of Object.entries(v)) { writeFileSync(dir + `mark-${t}.svg`, svg(x.m)); writeFileSync(dir + `lockup-horizontal-${t}.svg`, lock(x)); }
  const fav = svg(mark(p.t, p.b, p.a)); writeFileSync(dir + 'favicon.svg', fav);
  for (const s of [16, 32, 48, 180, 512]) await png(fav, s, s, dir + `favicon-${s}.png`);
  const pn = [16, 32, 48].map(s => readFileSync(dir + `favicon-${s}.png`)); const h = Buffer.alloc(6); h.writeUInt16LE(1, 2); h.writeUInt16LE(3, 4); let o = 54; const e = [], d = [];
  [16, 32, 48].forEach((s, i) => { const x = Buffer.alloc(16); x[0] = s; x[1] = s; x.writeUInt16LE(1, 4); x.writeUInt16LE(32, 6); x.writeUInt32LE(pn[i].length, 8); x.writeUInt32LE(o, 12); o += pn[i].length; e.push(x); d.push(pn[i]); });
  writeFileSync(dir + 'favicon.ico', Buffer.concat([h, ...e, ...d]));
  await png(lock(v.light), 504, 128, dir + 'lockup-horizontal-light@2x.png');
}
await pg.setViewport({ width: 1000, height: 700 });
await pg.setContent(`<body style="margin:0;padding:14px;background:#e5e7eb;font:13px Arial">${Object.values(P).map(p => { const v = variants(p); return `<div style="margin-bottom:12px"><b>${p.n}</b><div style="display:flex;gap:8px;margin:6px 0">${Object.entries(v).map(([t, x]) => `<div style="background:${t === 'dark' || t === 'mono-white' ? '#1e1e2e' : '#f8f9fc'};padding:8px;border-radius:8px;display:flex;gap:6px;align-items:flex-end">${svg(x.m, 72, 72)}${svg(x.m, 32, 32)}${svg(x.m, 16, 16)}</div>`).join('')}<div style="background:#f8f9fc;padding:8px;border-radius:8px">${lock(v.light)}</div></div></div>`; }).join('')}</body>`);
await pg.screenshot({ path: OUT + 'contact-sheet.png', fullPage: true });
const cands = { 'blue-amber': svg(mark(P['blue-amber'].t, P['blue-amber'].b, P['blue-amber'].a)), 'indigo-amber': svg(mark(P['indigo-amber'].t, P['indigo-amber'].b, P['indigo-amber'].a)), 'teal-amber': svg(mark(P['teal-amber'].t, P['teal-amber'].b, P['teal-amber'].a)), tea: svg(mark(P.tea.t, P.tea.b, P.tea.a)), 'n3-control': readFileSync(L + 'test-round-3/candidate-n3.svg', 'utf8') };
const order = ['tea', 'n3-control', 'blue-amber', 'teal-amber', 'indigo-amber'];
const T4 = L + 'test-round-4/';
writeFileSync(T4 + 'key.json', JSON.stringify(Object.fromEntries(order.map((k, i) => [i + 1, k])), null, 1));
const sv = (s, sz) => s.replace(/width="\d+" height="\d+"/, `width="${sz}" height="${sz}"`);
const css = 'body{margin:0;font:16px Arial;background:#fff;padding:20px;width:760px}.row{display:flex;gap:26px;margin:0 0 18px;align-items:flex-end}.c{display:flex;flex-direction:column;align-items:center;gap:8px}.d{background:#1e1e2e;padding:14px;border-radius:8px;color:#fff}h3{margin:0 0 10px}';
const big = `<style>${css}</style><h3>Logo options 1-5</h3><div class=row>${order.map((k, i) => `<div class=c>${sv(cands[k], 130)}<b>${i + 1}</b></div>`).join('')}</div>`;
const small = `<style>${css}</style><h3>Same options small, on dark, grayscale, colour-blind simulation</h3><div class=row>${order.map((k, i) => `<div class=c>${sv(cands[k], 32)}${sv(cands[k], 16)}<b>${i + 1}</b></div>`).join('')}</div><div class="row d">${order.map((k, i) => `<div class=c>${sv(cands[k], 56)}<b>${i + 1}</b></div>`).join('')}</div><div class=row style="filter:grayscale(1)">${order.map((k, i) => `<div class=c>${sv(cands[k], 56)}<b>${i + 1}</b></div>`).join('')}</div><svg width=0 height=0><filter id=deut><feColorMatrix type=matrix values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0"/></filter></svg><div class=row style="filter:url(#deut)">${order.map((k, i) => `<div class=c>${sv(cands[k], 56)}<b>${i + 1}</b></div>`).join('')}</div>`;
await pg.setViewport({ width: 820, height: 400 });
for (const [n, h] of [['sheet-large.png', big], ['sheet-small.png', small]]) { await pg.setContent(h); await pg.screenshot({ path: T4 + n, fullPage: true }); }
await b.close();
const lum = h => { const v = [1, 3, 5].map(i => { const x = parseInt(h.substr(i, 2), 16) / 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4 }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2] };
const cr = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) };
const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)), deut = h => { const c = rgb(h); return [.625 * c[0] + .375 * c[1], .7 * c[0] + .3 * c[1], .3 * c[1] + .7 * c[2]] };
const md = '# Автоматическая проверка раунда 4\n\nПорог: контраст ≥ 3:1, разница яркости акцента и брусков в серой шкале ≥ 0,12, расстояние при дейтеранопии ≥ 70, тонкий элемент на 16 px ≥ 1,5 px (брусок высотой 10 из 64 = 2,5 px).\n\n| Схема | Бруски на плитке | Акцент на плитке | Серая шкала (бруски vs акцент) | Дейтеранопия | Брусок на 16 px |\n|---|---|---|---|---|---|\n' + Object.values(P).map(p => { const g = Math.abs(lum(p.b) - lum(p.a)), dd = Math.hypot(...deut(p.b).map((v, i) => v - deut(p.a)[i])); return `| ${p.n} | ${cr(p.b, p.t).toFixed(1)}:1 | ${cr(p.a, p.t).toFixed(1)}:1 ${cr(p.a, p.t) >= 3 ? 'OK' : 'мало'} | ${g.toFixed(2)} ${g >= .12 ? 'OK' : 'акцент слабо отличим'} | ${Math.round(dd)} ${dd >= 70 ? 'OK' : 'близко'} | 2,5 px OK |`; }).join('\n') + '\n';
writeFileSync(T4 + 'AUTO-REPORT-4.md', md); console.log(md);
