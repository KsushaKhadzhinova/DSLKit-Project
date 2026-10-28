// Blind sheets for round 2. Candidates are read from the generated kits.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(process.env.LAB7_DIR);
const puppeteer = require('puppeteer-core');
const L = new URL('../', import.meta.url).pathname.slice(1);
const OUT = new URL('.', import.meta.url).pathname.slice(1);
const cands = { 'mark-k': 'final-v4/mark-k-light.svg', 'mark-dsl': 'final-v4/mark-dsl-light.svg', 'mark-blocks': 'final-v4/mark-blocks-light.svg', 'cat-mascot': 'final-v4/mascot-light.svg', 'origami-cat': 'final-v3-origami-cat/head-light.svg', 'pinwheel-tile': 'final-v2/pinwheel-tile/mark-light.svg' };
const favs = { 'mark-k': 'final-v4/favicon-k.svg', 'mark-blocks': 'final-v4/favicon-blocks.svg' };
const order = ['origami-cat', 'mark-blocks', 'cat-mascot', 'mark-k', 'pinwheel-tile', 'mark-dsl'];
writeFileSync(OUT + 'key.json', JSON.stringify(Object.fromEntries(order.map((k, i) => [i + 1, k])), null, 1));
const sv = (p, sz, filt = '') => readFileSync(L + p, 'utf8').replace(/width="\d+" height="\d+"/, `width="${sz}" height="${sz}"`).replace('<svg ', `<svg style="${filt}" `);
const css = 'body{margin:0;font:16px Arial;background:#fff;padding:20px;width:900px}.row{display:flex;gap:26px;margin:0 0 18px;align-items:flex-end}.c{display:flex;flex-direction:column;align-items:center;gap:8px}.d{background:#1e1e2e;padding:14px;border-radius:8px}h3{margin:0 0 10px}';
const big = `<style>${css}</style><h3>Logo options 1-6</h3><div class=row>${order.map((k, i) => `<div class=c>${sv(cands[k], 130)}<b>${i + 1}</b></div>`).join('')}</div>`;
const small = `<style>${css}</style><h3>Same options small, on dark, grayscale, colour-blind simulation</h3>
<div class=row>${order.map((k, i) => `<div class=c>${sv(cands[k], 32)}${sv(cands[k], 16)}<b>${i + 1}</b></div>`).join('')}</div>
<div class="row d">${order.map((k, i) => `<div class=c style="color:#fff">${sv(cands[k].replace('light', 'dark').replace('final-v2/pinwheel-tile/mark-dark', 'final-v2/pinwheel-tile/mark-dark').replace('final-v3-origami-cat/head-dark', 'final-v3-origami-cat/head-dark'), 56)}<b>${i + 1}</b></div>`).join('')}</div>
<div class=row style="filter:grayscale(1)">${order.map((k, i) => `<div class=c>${sv(cands[k], 56)}<b>${i + 1}</b></div>`).join('')}</div>
<svg width=0 height=0><filter id=deut><feColorMatrix type=matrix values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0"/></filter></svg>
<div class=row style="filter:url(#deut)">${order.map((k, i) => `<div class=c>${sv(cands[k], 56)}<b>${i + 1}</b></div>`).join('')}</div>`;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const pg = await b.newPage(); await pg.setViewport({ width: 960, height: 400 });
for (const [n, h] of [['sheet-large.png', big], ['sheet-small.png', small]]) { await pg.setContent(h); await pg.screenshot({ path: OUT + n, fullPage: true }); }
await b.close(); console.log('ok');
