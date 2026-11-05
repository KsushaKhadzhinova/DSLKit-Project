// A contact sheet of the notations that were added last: node docs/design-contest/new-notations.mjs <out.png>
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NOTATIONS, TEMPLATES, parseDiagram, renderNotation } from '../../site/js/notations/index.js';

const require = createRequire(process.env.LAB7_DIR ?? new URL('../../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');
const KEYS = ['mindmap', 'orgchart', 'c4', 'network', 'decision', 'epc'];
const cards = KEYS.map((key) => `<figure><figcaption>${NOTATIONS[key].name.ru}</figcaption>${renderNotation(parseDiagram(TEMPLATES[key]))}</figure>`).join('');
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:20px;background:#f8f9fc;font:16px system-ui;display:grid;grid-template-columns:repeat(2,1fr);gap:16px}figure{margin:0;background:#fff;border:1px solid #dde1e9;border-radius:12px;padding:12px}figcaption{font-weight:700;margin-bottom:8px;color:#1c1f2e}svg{max-width:100%;height:auto}</style>${cards}`;
const file = path.join(mkdtempSync(path.join(tmpdir(), 'notations-')), 'sheet.html');
writeFileSync(file, html);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1300, height: 900 });
await page.goto(pathToFileURL(file).href);
await page.screenshot({ path: process.argv[2], fullPage: true });
await browser.close();
