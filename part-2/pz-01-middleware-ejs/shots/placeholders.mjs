// Makes the placeholder figures for the screenshots that only the owner can take (a real owner screenshot
// cannot be captured by a script). Each placeholder is a labelled card with the exact request to send and the file
// name to replace. A file that already exists is never overwritten, so a real screenshot saved under the same
// name stays. Run from the repository root: node part-2/pz-01-middleware-ejs/shots/placeholders.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const work = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(work, 'figures');
mkdirSync(out, { recursive: true });

export const shots = [
  ['owner-403.png', 'GET', 'http://localhost:3000/add?auth=1 (отправить форму без токена)', 'форма без скрытого поля токена', 'страница 403 в оформлении сайта'],
  ['owner-429.png', 'GET', 'http://localhost:3000/ (обновить страницу много раз подряд)', 'нет тела', 'страница 429 в оформлении сайта'],
  ['owner-db-tables.png', 'SQL', 'таблицы diagrams и request_log в файле базы SQLite', 'SELECT * FROM diagrams LIMIT 5', 'строки таблиц в окне просмотра базы'],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const page = ([file, method, url, body, answer]) => `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:28px;font:18px/1.5 'Segoe UI',Arial,sans-serif;background:#fff7e6;color:#3a2a00;border:6px dashed #d98b00;box-sizing:border-box;height:100vh}
h1{margin:0 0 6px;font-size:26px}code{font:16px Consolas,monospace;background:#fff;padding:2px 6px;border-radius:4px}
dt{font-weight:600;margin-top:10px}dd{margin:2px 0 0}</style>
<h1>Здесь будет снимок снимок владельца / A Postman window screenshot goes here</h1>
<dl><dt>Действие / Action</dt><dd><code>${method} ${esc(url)}</code></dd>
<dt>Данные / Data</dt><dd><code>${esc(body)}</code></dd>
<dt>Ожидаемый ответ / Expected answer</dt><dd>${esc(answer)}</dd>
<dt>Файл / File</dt><dd><code>part-2/pz-01-middleware-ejs/figures/${file}</code></dd></dl>
<p>Снимок должен показывать адресную строку и страницу целиком. / The shot must show the address bar and the whole page.</p>`;

const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
if (!edge) throw new Error('No Edge or Chrome found');
const tmp = path.join(tmpdir(), 'pz2-placeholder.html');
for (const shot of shots) {
  const target = path.join(out, shot[0]);
  if (existsSync(target)) continue;
  writeFileSync(tmp, page(shot));
  execFileSync(edge, ['--headless', '--disable-gpu', `--user-data-dir=${path.join(tmpdir(), 'pz-edge-profile')}`, '--hide-scrollbars', `--screenshot=${target}`, '--window-size=1100,480', `file:///${tmp.replace(/\\/g, '/')}`], { stdio: 'ignore' });
}
rmSync(tmp, { force: true });
