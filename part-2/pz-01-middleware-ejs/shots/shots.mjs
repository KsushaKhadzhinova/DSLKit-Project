// Makes the report figures of practical 1 from the real application: the server is started on a temporary SQLite file,
// the pages are opened in a headless browser (shots/cdp.mjs) in the Russian interface and saved as PNG into figures/.
// The 500 page comes from a real failure (a database path that cannot be created), the 403 page from a real form sent
// without its token, the 429 page from a real burst of requests, the database figure from a real read of the tables.
//   node shots/shots.mjs            all browser figures
// db-tables.png, console.png and tests.png are not made here: they are captures of real PowerShell windows made by
// shots/window-shots.ps1 (see shots/README.md), never drawn by a script.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
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

const { page, close } = await launch({ windowed: process.env.SHOTS_WINDOW === '1' });
try {
  {
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
