// Kits for four chosen marks in the indigo-and-amber scheme + blind sheets for round 5. LAB7_DIR=<dir with puppeteer-core> node make-v7.mjs
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const require = createRequire(process.env.LAB7_DIR);
const puppeteer = require('puppeteer-core');
const OUT = new URL('.', import.meta.url).pathname.slice(1), L = new URL('../', import.meta.url).pathname.slice(1);
const T5 = L + 'test-round-5/';
mkdirSync(T5, { recursive: true });
const S = { t: '#312e81', b: '#eef2ff', a: '#fbbf24' };
const rot = (s, d) => `<g transform="rotate(${d} 32 32)">${s}</g>`;
const tile = t => `<rect width="64" height="64" rx="16" fill="${t}"/>`;
const M = {
  'code-blocks': (t, b, a) => tile(t) + `<path d="M9 19H29M9 45H25" stroke="${b}" stroke-width="6.5" stroke-linecap="round"/><path d="M32 19H38M32 45H38" stroke="${b}" stroke-width="3.5" stroke-linecap="round"/><rect x="38" y="8" width="17" height="20" rx="6" fill="${b}"/><rect x="38" y="36" width="17" height="20" rx="6" fill="${a}"/><path d="M46.5 29V35" stroke="${b}" stroke-width="3.5" stroke-linecap="round"/>`,
  'frame-diagram': (t, b, a) => `<rect x="3" y="3" width="58" height="58" rx="15" fill="${b}" stroke="${t}" stroke-width="6"/><rect x="11" y="13" width="17" height="15" rx="5" fill="${t}"/><rect x="36" y="36" width="17" height="15" rx="5" fill="${a}" stroke="${t}" stroke-width="2.4"/><path d="M28 20.5H44V35" stroke="${t}" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  'pinwheel-drag': (t, b, a, fav) => tile(t) + `<rect x="8" y="8" width="20" height="20" rx="6.5" fill="${b}"/><rect x="8" y="36" width="20" height="20" rx="6.5" fill="${b}"/><rect x="36" y="36" width="20" height="20" rx="6.5" fill="${b}"/>` + (fav ? '' : `<rect x="36" y="8" width="20" height="20" rx="6.5" fill="none" stroke="${a}" stroke-width="2.6" stroke-dasharray="4 3.5"/>`) + `<rect x="40" y="4" width="20" height="20" rx="6.5" fill="${a}"/>`,
  'pinwheel': (t, b, a) => { const r = '<rect x="14" y="15" width="21" height="10" rx="4.5" '; return tile(t) + r + `fill="${a}"/>` + [90, 180, 270].map(d => rot(r + `fill="${b}"/>`, d)).join(''); }
};
const NAMES = { 'code-blocks': 'Код → блоки', 'frame-diagram': 'Рамка-диаграмма', 'pinwheel-drag': 'Вертушка-перетаскивание', 'pinwheel': 'Простая вертушка' };
const svg = (b, w = 64, h = 64, vb = '0 0 64 64') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}" role="img" aria-label="DSLKit"><title>DSLKit</title>${b}</svg>\n`;
const font = `font-family="Inter, 'Segoe UI', Arial, sans-serif" font-weight="800"`;
const variants = k => ({
  light: { m: M[k](S.t, S.b, S.a), text: S.t },
  dark: { m: M[k](S.b, S.t, S.a), text: S.b },
  'mono-black': { m: M[k]('#000', '#fff', '#fff'), text: '#000' },
  'mono-white': { m: M[k]('#fff', '#000', '#000'), text: '#fff' }
});
const lock = v => svg(`<g>${v.m}</g><text x="76" y="50" font-size="38" ${font} letter-spacing="-1" fill="${v.text}">DSLKit</text>`, 252, 64, '0 0 252 64');
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const pg = await b.newPage();
const png = async (s, w, h, p) => { await pg.setViewport({ width: w, height: h }); await pg.setContent(`<body style="margin:0;background:transparent">${s.replace(/width="\d+" height="\d+"/, `width="${w}" height="${h}"`)}</body>`); await pg.screenshot({ path: p, omitBackground: true }); };
for (const k of Object.keys(M)) {
  const dir = OUT + k + '/'; mkdirSync(dir, { recursive: true });
  const v = variants(k);
  for (const [t, x] of Object.entries(v)) { writeFileSync(dir + `mark-${t}.svg`, svg(x.m)); writeFileSync(dir + `lockup-horizontal-${t}.svg`, lock(x)); }
  const fav = svg(M[k](S.t, S.b, S.a, true)); writeFileSync(dir + 'favicon.svg', fav);
  for (const s of [16, 32, 48, 180, 512]) await png(fav, s, s, dir + `favicon-${s}.png`);
  const pn = [16, 32, 48].map(s => readFileSync(dir + `favicon-${s}.png`)); const h = Buffer.alloc(6); h.writeUInt16LE(1, 2); h.writeUInt16LE(3, 4); let o = 54; const e = [], d = [];
  [16, 32, 48].forEach((s, i) => { const x = Buffer.alloc(16); x[0] = s; x[1] = s; x.writeUInt16LE(1, 4); x.writeUInt16LE(32, 6); x.writeUInt32LE(pn[i].length, 8); x.writeUInt32LE(o, 12); o += pn[i].length; e.push(x); d.push(pn[i]); });
  writeFileSync(dir + 'favicon.ico', Buffer.concat([h, ...e, ...d]));
  await png(lock(v.light), 504, 128, dir + 'lockup-horizontal-light@2x.png');
}
await pg.setViewport({ width: 1000, height: 800 });
await pg.setContent(`<body style="margin:0;padding:14px;background:#e5e7eb;font:13px Arial">${Object.keys(M).map(k => { const v = variants(k); return `<div style="margin-bottom:12px"><b>${NAMES[k]}</b><div style="display:flex;gap:8px;margin:6px 0">${Object.entries(v).map(([t, x]) => `<div style="background:${t === 'dark' || t === 'mono-white' ? '#1e1e2e' : '#f8f9fc'};padding:8px;border-radius:8px;display:flex;gap:6px;align-items:flex-end">${svg(x.m, 72, 72)}${svg(x.m, 32, 32)}${svg(M[k](t === 'dark' ? S.b : S.t, t === 'dark' ? S.t : S.b, S.a, true), 16, 16)}</div>`).join('')}<div style="background:#f8f9fc;padding:8px;border-radius:8px">${lock(v.light)}</div></div></div>`; }).join('')}</body>`);
await pg.screenshot({ path: OUT + 'contact-sheet.png', fullPage: true });
const cands = { 'code-blocks': svg(M['code-blocks'](S.t, S.b, S.a)), 'frame-diagram': svg(M['frame-diagram'](S.t, S.b, S.a)), 'pinwheel-drag': svg(M['pinwheel-drag'](S.t, S.b, S.a)), 'pinwheel': svg(M.pinwheel(S.t, S.b, S.a)), 'n3-control': readFileSync(L + 'test-round-3/candidate-n3.svg', 'utf8') };
const order = ['pinwheel-drag', 'n3-control', 'frame-diagram', 'pinwheel', 'code-blocks'];
writeFileSync(T5 + 'key.json', JSON.stringify(Object.fromEntries(order.map((k, i) => [i + 1, k])), null, 1));
const sv = (s, sz) => s.replace(/width="\d+" height="\d+"/, `width="${sz}" height="${sz}"`);
const css = 'body{margin:0;font:16px Arial;background:#fff;padding:20px;width:760px}.row{display:flex;gap:26px;margin:0 0 18px;align-items:flex-end}.c{display:flex;flex-direction:column;align-items:center;gap:8px}.d{background:#1e1e2e;padding:14px;border-radius:8px;color:#fff}h3{margin:0 0 10px}';
const big = `<style>${css}</style><h3>Logo options 1-5</h3><div class=row>${order.map((k, i) => `<div class=c>${sv(cands[k], 130)}<b>${i + 1}</b></div>`).join('')}</div>`;
const small = `<style>${css}</style><h3>Same options small, on dark, grayscale, colour-blind simulation</h3><div class=row>${order.map((k, i) => `<div class=c>${sv(cands[k], 32)}${sv(cands[k], 16)}<b>${i + 1}</b></div>`).join('')}</div><div class="row d">${order.map((k, i) => `<div class=c>${sv(cands[k], 56)}<b>${i + 1}</b></div>`).join('')}</div><div class=row style="filter:grayscale(1)">${order.map((k, i) => `<div class=c>${sv(cands[k], 56)}<b>${i + 1}</b></div>`).join('')}</div><svg width=0 height=0><filter id=deut><feColorMatrix type=matrix values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0"/></filter></svg><div class=row style="filter:url(#deut)">${order.map((k, i) => `<div class=c>${sv(cands[k], 56)}<b>${i + 1}</b></div>`).join('')}</div>`;
await pg.setViewport({ width: 820, height: 400 });
for (const [n, h] of [['sheet-large.png', big], ['sheet-small.png', small]]) { await pg.setContent(h); await pg.screenshot({ path: T5 + n, fullPage: true }); }
await b.close();
const lum = h => { const v = [1, 3, 5].map(i => { const x = parseInt(h.substr(i, 2), 16) / 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4 }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2] };
const cr = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) };
const thin = { 'code-blocks': 3.5, 'frame-diagram': 3.6, 'pinwheel-drag': 2.6, 'pinwheel': 10 };
const md = `# Автоматическая проверка раунда 5 (индиго и янтарь)\n\nЦвета одинаковы у всех: светлое на плитке ${cr(S.b, S.t).toFixed(1)}:1, янтарь на плитке ${cr(S.a, S.t).toFixed(1)}:1, серая шкала (светлое vs янтарь) ${Math.abs(lum(S.b) - lum(S.a)).toFixed(2)}, дальтонизм ОК. Разница между знаками в тонких деталях на 16 px (порог 1,5 px):\n\n| Знак | Самый тонкий элемент (из 64) | На 16 px |\n|---|---|---|\n` + Object.entries(thin).map(([k, w]) => `| ${NAMES[k]} | ${w} | ${(w * 16 / 64).toFixed(2)} px ${w * 16 / 64 >= 1.5 ? 'OK' : 'тонко (в favicon убрать/утолстить)'} |`).join('\n') + '\n';
writeFileSync(T5 + 'AUTO-REPORT-5.md', md); console.log(md);
