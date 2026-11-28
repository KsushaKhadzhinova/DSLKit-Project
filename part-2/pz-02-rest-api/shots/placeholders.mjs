// Makes the placeholder figures for the screenshots that only the owner can take (a Postman window, the database viewer,
// the real console and the real test window cannot be captured by a script). Each placeholder is a labelled card
// with the exact action to do and the file name to replace, and it carries the placeholder mark in the PNG, so the
// report test in the "final" mode fails while one is left. A file that already exists is never overwritten.
// Run from the folder of the work: node shots/placeholders.mjs
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { markPlaceholder } from '../../../tools/part2/figure-files.js';

const work = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(work, 'figures');
mkdirSync(out, { recursive: true });

// [file, what to show, request or command, expected result]
export const shots = [
  ['owner-tests.png', 'PowerShell', 'npm test в part-2/pz-02-rest-api', 'конец вывода: tests, pass, fail 0, таблица покрытия 100 %'],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const page = ([file, tool, action, result]) => `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:28px;font:18px/1.5 'Segoe UI',Arial,sans-serif;background:#fff7e6;color:#3a2a00;border:6px dashed #d98b00;box-sizing:border-box;height:100vh}
h1{margin:0 0 6px;font-size:26px}code{font:16px Consolas,monospace;background:#fff;padding:2px 6px;border-radius:4px}
dt{font-weight:600;margin-top:10px}dd{margin:2px 0 0}</style>
<h1>ЗАГЛУШКА: здесь будет снимок окна (${esc(tool)}) / PLACEHOLDER: a real window screenshot goes here</h1>
<dl><dt>Действие / Action</dt><dd><code>${esc(action)}</code></dd>
<dt>Что должно быть видно / Must be visible</dt><dd>${esc(result)}</dd>
<dt>Файл для замены / File to replace</dt><dd><code>part-2/pz-02-rest-api/figures/${file}</code></dd></dl>`;

const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
if (!edge) throw new Error('No Edge or Chrome found');
const tmp = mkdtempSync(path.join(tmpdir(), 'pz2-placeholder-'));
for (const shot of shots) {
  const target = path.join(out, shot[0]);
  if (existsSync(target)) continue;
  const html = path.join(tmp, 'card.html');
  writeFileSync(html, page(shot));
  spawnSync(edge, ['--headless', '--disable-gpu', `--user-data-dir=${path.join(tmp, 'profile')}`, '--hide-scrollbars', `--screenshot=${target}`, '--window-size=1100,380', `file:///${html.replace(/\\/g, '/')}`], { stdio: 'ignore' });
  writeFileSync(target, markPlaceholder(readFileSync(target)));
}
rmSync(tmp, { recursive: true, force: true });
