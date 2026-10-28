// Round 3: three pinwheel-tile redesigns in the project palette, plus two baselines. Blind sheets + automated checks.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(process.env.LAB7_DIR);
const puppeteer = require('puppeteer-core');
const L = new URL('../', import.meta.url).pathname.slice(1), OUT = new URL('.', import.meta.url).pathname.slice(1);
const INK = '#1c1f2e', BLUE = '#2563eb', LB = '#8bb0ff', G = '#22c55e', W = '#ffffff';
const rot = (s, d) => `<g transform="rotate(${d} 32 32)">${s}</g>`;
const wrap = b => `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="DSLKit">${b}</svg>`;
// N1: code lines -> blocks, link between blocks
const n1 = (tile, line, top, bot, link) => wrap(`<rect width="64" height="64" rx="16" fill="${tile}"/><path d="M11 20H26M11 32H21M11 44H27" stroke="${line}" stroke-width="5" stroke-linecap="round"/><path d="M30 20H38M31 44H38" stroke="${link}" stroke-width="2.6" stroke-linecap="round"/><rect x="40" y="11" width="15" height="17" rx="5.5" fill="${top}"/><rect x="40" y="36" width="15" height="17" rx="5.5" fill="${bot}"/><path d="M47.5 29.5V34.5" stroke="${link}" stroke-width="2.6" stroke-linecap="round"/>`);
// N2: pinwheel of linked blocks around a code core
const bar = c => `<rect x="14" y="15" width="21" height="10" rx="4.5" fill="${c}"/><path d="M35 20H39" stroke="${LB}" stroke-width="3" stroke-linecap="round"/>`;
const n2 = () => wrap(`<rect width="64" height="64" rx="16" fill="${INK}"/>${bar(G)}${[90, 180, 270].map(d => rot(bar(W), d)).join('')}<path d="M27.5 29H36.5M27.5 35H33" stroke="${LB}" stroke-width="3.2" stroke-linecap="round"/>`);
const N = { n1: n1(INK, LB, W, G, LB), n2: n2(), n3: n1(BLUE, '#dbeafe', W, G, '#dbeafe') };
for (const [k, v] of Object.entries(N)) writeFileSync(OUT + `candidate-${k}.svg`, v + '\n');
const cands = { n1: N.n1, n2: N.n2, n3: N.n3, 'old-coral-tile': readFileSync(L + 'final-v2/pinwheel-tile/mark-light.svg', 'utf8'), dsl: readFileSync(L + 'final-v4/mark-dsl-light.svg', 'utf8') };
const order = ['dsl', 'n3', 'old-coral-tile', 'n1', 'n2'];
writeFileSync(OUT + 'key.json', JSON.stringify(Object.fromEntries(order.map((k, i) => [i + 1, k])), null, 1));
const sv = (s, sz) => s.replace(/width="\d+" height="\d+"/, `width="${sz}" height="${sz}"`);
const css = 'body{margin:0;font:16px Arial;background:#fff;padding:20px;width:760px}.row{display:flex;gap:26px;margin:0 0 18px;align-items:flex-end}.c{display:flex;flex-direction:column;align-items:center;gap:8px}.d{background:#1e1e2e;padding:14px;border-radius:8px;color:#fff}h3{margin:0 0 10px}';
const big = `<style>${css}</style><h3>Logo options 1-5</h3><div class=row>${order.map((k, i) => `<div class=c>${sv(cands[k], 130)}<b>${i + 1}</b></div>`).join('')}</div>`;
const small = `<style>${css}</style><h3>Same options small, on dark, grayscale, colour-blind simulation</h3><div class=row>${order.map((k, i) => `<div class=c>${sv(cands[k], 32)}${sv(cands[k], 16)}<b>${i + 1}</b></div>`).join('')}</div><div class="row d">${order.map((k, i) => `<div class=c>${sv(cands[k], 56)}<b>${i + 1}</b></div>`).join('')}</div><div class=row style="filter:grayscale(1)">${order.map((k, i) => `<div class=c>${sv(cands[k], 56)}<b>${i + 1}</b></div>`).join('')}</div><svg width=0 height=0><filter id=deut><feColorMatrix type=matrix values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0"/></filter></svg><div class=row style="filter:url(#deut)">${order.map((k, i) => `<div class=c>${sv(cands[k], 56)}<b>${i + 1}</b></div>`).join('')}</div>`;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const pg = await b.newPage(); await pg.setViewport({ width: 820, height: 400 });
for (const [n, h] of [['sheet-large.png', big], ['sheet-small.png', small]]) { await pg.setContent(h); await pg.screenshot({ path: OUT + n, fullPage: true }); }
await b.close();
// automated: contrast of each element colour vs its tile, grayscale diff of block colours, min stroke at 16 px
const lum = h => { const v = [1, 3, 5].map(i => { const x = parseInt(h.substr(i, 2), 16) / 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4 }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2] };
const cr = (a, c) => { const x = lum(a), y = lum(c); return ((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(1) };
const rep = [['N1 код → блоки (чернильная плитка)', INK, [W, G, LB], 5], ['N2 вертушка с кодом в центре', INK, [W, G, LB], 3], ['N3 то же на синей плитке', BLUE, ['#ffffff', G, '#dbeafe'], 5]];
let md = '# Автоматическая проверка раунда 3\n\n| Кандидат | Контраст элементов с плиткой (белый / зелёный / код) | Серая шкала: белый vs зелёный | Тонкий штрих на 16 px |\n|---|---|---|---|\n' + rep.map(([n, tile, cs, sw]) => `| ${n} | ${cs.map(c => cr(c, tile) + ':1').join(' / ')} | ${Math.abs(lum(cs[0]) - lum(cs[1])).toFixed(2)} ${Math.abs(lum(cs[0]) - lum(cs[1])) >= .12 ? 'OK' : 'мало'} | ${(sw * 16 / 64).toFixed(2)} px ${sw * 16 / 64 >= 1.5 ? 'OK' : 'тонко (в favicon убрать код)'} |`).join('\n') + '\n';
writeFileSync(OUT + 'AUTO-REPORT-3.md', md); console.log(md);
