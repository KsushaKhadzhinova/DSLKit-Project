// Makes the placeholder figures for the Postman screenshots that only the owner can take (a real Postman window
// cannot be captured by a script). Each placeholder is a labelled card with the exact request to send and the file
// name to replace. A file that already exists is never overwritten, so a real screenshot saved under the same
// name stays. Run from the repository root: node part-2/pz-02-rest-api/shots/placeholders.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const work = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(work, 'figures');
mkdirSync(out, { recursive: true });

export const shots = [
  ['postman-01-get-users.png', 'GET', 'http://localhost:3000/api/users', 'нет тела', '200 OK, массив пользователей и объект meta'],
  ['postman-02-post-diagram.png', 'POST', 'http://localhost:3000/api/diagrams', '{"title":"Billing schema","notation":"ERD","code":"invoice -> payment","projectId":1}', '201 Created, диаграмма в статусе draft'],
  ['postman-03-patch-user.png', 'PATCH', 'http://localhost:3000/api/users/1', '{"role":"editor"}', '200 OK, пользователь с role editor'],
  ['postman-04-post-invalid.png', 'POST', 'http://localhost:3000/api/users', '{"name":"","email":"x"}', '400 Bad Request, validation_failed и details'],
  ['postman-05-delete-conflict.png', 'DELETE', 'http://localhost:3000/api/users/1', 'нет тела', '409 Conflict, пользователь ещё владеет проектами'],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const page = ([file, method, url, body, answer]) => `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:28px;font:18px/1.5 'Segoe UI',Arial,sans-serif;background:#fff7e6;color:#3a2a00;border:6px dashed #d98b00;box-sizing:border-box;height:100vh}
h1{margin:0 0 6px;font-size:26px}code{font:16px Consolas,monospace;background:#fff;padding:2px 6px;border-radius:4px}
dt{font-weight:600;margin-top:10px}dd{margin:2px 0 0}</style>
<h1>Здесь будет снимок окна Postman / A Postman window screenshot goes here</h1>
<dl><dt>Запрос / Request</dt><dd><code>${method} ${esc(url)}</code></dd>
<dt>Тело / Body</dt><dd><code>${esc(body)}</code></dd>
<dt>Ожидаемый ответ / Expected answer</dt><dd>${esc(answer)}</dd>
<dt>Файл / File</dt><dd><code>part-2/pz-02-rest-api/figures/${file}</code></dd></dl>
<p>Снимок должен показывать запрос, код ответа и тело ответа. / The shot must show the request, the status and the response body.</p>`;

const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
if (!edge) throw new Error('No Edge or Chrome found');
const tmp = path.join(tmpdir(), 'pz2-placeholder.html');
for (const shot of shots) {
  const target = path.join(out, shot[0]);
  if (existsSync(target)) continue;
  writeFileSync(tmp, page(shot));
  execFileSync(edge, ['--headless', '--disable-gpu', '--hide-scrollbars', `--screenshot=${target}`, '--window-size=1100,480', `file:///${tmp.replace(/\\/g, '/')}`], { stdio: 'ignore' });
}
rmSync(tmp, { force: true });
