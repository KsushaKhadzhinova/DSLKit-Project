// Makes the report figures of practical 1 from the real application: the server is started on a temporary SQLite file,
// the pages are opened in a headless browser (shots/cdp.mjs) in the Russian interface and saved as PNG into figures/.
// The 500 page comes from a real failure (a database path that cannot be created), the 403 page from a real form sent
// without its token, the 429 page from a real burst of requests, the database figure from a real read of the tables.
//   node shots/shots.mjs            all figures except the result of npm test
//   node shots/shots.mjs --tests    only figures/tests.png (run it when the report and its DOCX are up to date)
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';
import { sourceHash } from '../../../tools/part2/figures.js';

const work = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(work, 'figures');
const png = (name) => path.join(out, `${name}.png`);
const PORT = process.env.SHOTS_PORT || '3000';
const ORIGIN = `http://localhost:${PORT}`;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const start = (env = {}) => {
  const lines = [];
  const child = spawn(process.execPath, ['src/server.js'], { cwd: work, env: { ...process.env, PORT, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  const take = (chunk) => lines.push(...chunk.toString().split(/\r?\n/).filter(Boolean));
  child.stdout.on('data', take);
  child.stderr.on('data', take);
  return { child, lines, exited: new Promise((resolve) => child.on('exit', resolve)) };
};
const waitUp = async () => {
  for (let i = 0; i < 100; i += 1) {
    if (await fetch(ORIGIN).then(() => true, () => false)) return;
    await pause(200);
  }
  throw new Error(`No answer from ${ORIGIN}`);
};

const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// A console window as an image: the title bar, the prompt with the command and the lines the process really printed.
const terminal = (command, lines) => `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#1e1e1e;font:15px/1.45 Consolas,'Courier New',monospace;color:#cccccc}
.bar{background:#2d2d2d;color:#e6e6e6;padding:8px 14px;font:13px 'Segoe UI',Arial,sans-serif}
pre{margin:0;padding:12px 16px;white-space:pre-wrap;word-break:break-all}
.cmd{color:#e5c07b}</style><div class="bar">PowerShell – part-2\\pz-01-middleware-ejs</div>
<pre><span class="cmd">PS&gt; ${esc(command)}</span>\n${esc(lines.join('\n'))}</pre>`;

const stripColour = (text) => text.replace(/\x1b\[[0-9;]*m/g, '');

const { page, close } = await launch();
try {
  if (process.argv.includes('--tests')) {
    const lines = [];
    const child = spawn(process.execPath, ['--test', '--experimental-test-coverage', '--test-coverage-include=src/**', 'test/*.test.js', 'report.test.mjs'], { cwd: work, stdio: ['ignore', 'pipe', 'pipe'] });
    const take = (chunk) => lines.push(...stripColour(chunk.toString()).split(/\r?\n/));
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    const code = await new Promise((resolve) => child.on('exit', resolve));
    if (code !== 0) throw new Error(`npm test failed (exit code ${code}), the figure would show a failure`);
    const at = lines.findIndex((l) => /^ℹ tests /.test(l));
    const tail = lines.slice(at).filter((l) => l.trim());
    await page.html(terminal('npm test', ['...', ...tail]));
    await page.shot(png('tests'), { width: 1100, height: 860 });
    console.log('figures/tests.png saved');
  } else {
    const tmp = mkdtempSync(path.join(tmpdir(), 'pz1-'));
    const dbFile = path.join(tmp, 'requests.db');
    if (await fetch(ORIGIN).then(() => true, () => false)) throw new Error(`${ORIGIN} is already in use, stop that server first`);
    const server = start({ DB_FILE: dbFile });
    await waitUp();

    // Russian interface: the first visit with ?lang=ru sets the language cookie for the pages after it.
    await page.goto(`${ORIGIN}/?lang=ru`);
    await page.shot(png('list'));
    await page.goto(`${ORIGIN}/item/1`);
    await page.shot(png('detail'));

    await page.goto(`${ORIGIN}/add?auth=1`);
    await page.shot(png('form-empty'), { until: '.form' });

    // The 403 page: the same form sent without its hidden token field.
    await page.evaluate("document.querySelector('input[name=_csrf]').remove()");
    await page.fill('#title', 'Без токена');
    await page.fill('#description', 'Форма отправлена без скрытого поля защиты');
    await page.submit('button[type=submit]');
    await page.shot(png('error-403'), { until: '.error' });

    // The form with wrong values: a title of spaces and a negative revision.
    await page.goto(`${ORIGIN}/add?auth=1`);
    await page.fill('#title', '   ');
    await page.fill('#description', 'Проверка на сервере');
    await page.fill('#revision', '-5');
    await page.submit('button[type=submit]');
    await page.shot(png('form-errors'), { until: '#revision-error' });

    // The same form with correct values: the record appears in the list.
    await page.fill('#title', 'Схема оплаты');
    await page.fill('#revision', '2');
    await page.submit('button[type=submit]');
    await page.shot(png('added'));

    // The record that was just added (number 4): the seeded record 1 has multi-line code, and a real browser sends line breaks as CRLF, which the server refuses (see the list of code changes in SCREENSHOTS-TODO.md).
    await page.goto(`${ORIGIN}/item/4/edit?auth=1`);
    await page.fill('#revision', '7');
    await page.shot(png('edit'), { until: '.form' });
    await page.submit('button[type=submit]');
    await page.shot(png('edited'));

    await page.goto(`${ORIGIN}/nothing-here`);
    await page.shot(png('not-found'), { until: '.error' });
    await page.goto(`${ORIGIN}/log?auth=1`);
    await page.shot(png('log'));

    // The tables of the database, read from the file the server wrote.
    const db = new DatabaseSync(dbFile, { readOnly: true });
    const table = (rows) => (rows.length ? [Object.keys(rows[0]).join(' | '), ...rows.map((r) => Object.values(r).join(' | '))] : []);
    const cut = (rows) => rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v).length > 28 ? `${String(v).slice(0, 27)}…` : v])));
    const diagrams = db.prepare('SELECT id, title, notation, revision, created_at FROM diagrams ORDER BY id').all();
    const requests = db.prepare('SELECT id, method, url, status, duration_ms FROM request_log ORDER BY id DESC LIMIT 6').all();
    db.close();
    await page.html(
      terminal('sqlite3 requests.db', ['sqlite> SELECT id, title, notation, revision, created_at FROM diagrams;', ...table(cut(diagrams)), '', 'sqlite> SELECT id, method, url, status, duration_ms FROM request_log ORDER BY id DESC LIMIT 6;', ...table(cut(requests))]),
    );
    await page.shot(png('db-tables'), { width: 1100, height: 400 });

    // The console of the server: the lines it really wrote up to now (before the burst of requests below).
    await pause(200);
    const shown = server.lines.slice(0, 14);
    await page.html(terminal('npm start', ['> dslkit-pz-01-middleware-ejs@1.0.0 start', '> node src/server.js', '', ...shown]));
    await page.shot(png('console'), { width: 1100, height: 450 });

    // The 429 page: more requests in a minute than limits.json allows.
    const limits = JSON.parse((await import('node:fs')).readFileSync(path.join(work, 'limits.json'), 'utf8'));
    for (let i = 0; i < limits.rateLimit.all.max + 5; i += 1) await fetch(`${ORIGIN}/`);
    await page.goto(`${ORIGIN}/`);
    await page.shot(png('error-429'), { until: '.error' });

    server.child.kill();
    await server.exited;

    // A real failure: the database file lies under a path that is a file, so the folder for it cannot be made.
    const blocker = path.join(tmp, 'not-a-folder');
    writeFileSync(blocker, 'x');
    const broken = start({ DB_FILE: path.join(blocker, 'requests.db') });
    await waitUp();
    await page.goto(`${ORIGIN}/?lang=ru`);
    await page.shot(png('server-error'), { until: '.error' });
    broken.child.kill();
    await broken.exited;

    writeFileSync(path.join(out, 'manifest.json'), `${JSON.stringify({ sourceHash: sourceHash(work) }, null, 2)}\n`);
    console.log('Figures saved to', out);
  }
} finally {
  await close();
}
