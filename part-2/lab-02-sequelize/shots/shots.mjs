// Makes the report screenshots of lab 2: starts the real server on a temporary SQLite file (migrations and seed run for real),
// opens GET addresses in headless Chrome, records the other methods with a script and causes a real 500 by undoing the
// migrations under the running server. Run from the lab folder: node shots/shots.mjs
import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { consolePage, ensureDir, exchange, exchangePage, here, isUp, launch, pause, runToEnd, shootHtml, shootUrl, start, testTail, waitFor } from './lib.mjs';

const lab = here(import.meta.url);
const out = ensureDir(path.join(lab, 'figures'));
const png = (name) => path.join(out, `${name}.png`);
const ORIGIN = 'http://localhost:3000';
const storage = path.join(mkdtempSync(path.join(tmpdir(), 'lab2-')), 'lab2.sqlite');
const env = { SQLITE_STORAGE: storage, DATABASE_URL: '', PORT: '3000' };
const cli = path.join(lab, 'node_modules/sequelize-cli/lib/sequelize');
const require = createRequire(path.join(lab, 'package.json'));

if (await isUp(ORIGIN)) throw new Error(`${ORIGIN} is already in use, stop that server first`);

const migrate = await runToEnd(lab, [cli, 'db:migrate'], env);
const seed = await runToEnd(lab, [cli, 'db:seed:all'], env);
const server = start(lab, ['server.js'], env);
await waitFor(`${ORIGIN}/health`);

const browser = await launch();
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
const note = 'HTTP exchange recorded by a script (fetch). The answers are real answers of the running server, the JSON body is only indented.';
const show = (title, items) => exchangePage({ title, note, items });

await shootHtml(page, consolePage({ title: 'Migrations and seed (npm run db:migrate, npm run db:seed)', note: 'Console output captured from the processes, shown as text.', lines: ['> sequelize-cli db:migrate', ...migrate.lines.filter((l) => !/^$/.test(l)), '', '> sequelize-cli db:seed:all', ...seed.lines] }), png('01-migrate-seed'), 1000);

// The tables as the database itself describes them (a query to sqlite_master), shown as text.
const sqlite3 = require('sqlite3');
const rows = await new Promise((resolve, reject) => {
  const db = new sqlite3.Database(storage, sqlite3.OPEN_READONLY);
  db.all("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name", (error, result) => {
    db.close();
    return error ? reject(error) : resolve(result);
  });
});
await shootHtml(page, consolePage({ title: 'Structure of the database', note: 'Result of the query SELECT name, sql FROM sqlite_master, shown as text (a query to the real file, not a database viewer window).', lines: rows.flatMap((r) => [`-- ${r.name}`, r.sql.replace(/\s+/g, ' '), '']) }), png('02-schema'), 1100);

await shootUrl(page, `${ORIGIN}/diagrams`, png('03-get-list'), { width: 1000 });
await shootUrl(page, `${ORIGIN}/diagrams/1`, png('04-get-one'));
await shootUrl(page, `${ORIGIN}/diagrams/99`, png('05-get-404'));
await shootUrl(page, `${ORIGIN}/diagrams?limit=2&offset=0&sort=title&order=desc`, png('06-get-page'), { width: 1000 });

const created = await exchange(ORIGIN, 'POST', '/diagrams', { label: 'Create a diagram', body: { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server', priority: 'normal', owner: 'carol' } });
const id = JSON.parse(created.text).id;
const replaced = await exchange(ORIGIN, 'PUT', `/diagrams/${id}`, { label: 'Replace the whole diagram', body: { title: 'Login flow v2', notation: 'UML', sourceCode: 'user -> server -> database', priority: 'low', owner: 'carol' } });
const patched = await exchange(ORIGIN, 'PATCH', `/diagrams/${id}`, { label: 'Change one field', body: { priority: 'high', revision: 3 } });
await shootHtml(page, show('POST, PUT and PATCH requests to /diagrams', [created, replaced, patched]), png('07-post-put-patch'));

const invalid = await exchange(ORIGIN, 'POST', '/diagrams', { label: 'Empty title and unknown notation', body: { title: '', notation: 'XYZ' } });
const negative = await exchange(ORIGIN, 'PATCH', `/diagrams/${id}`, { label: 'Negative revision', body: { revision: -1 } });
await shootHtml(page, show('Requests with wrong data', [invalid, negative]), png('08-validation-400'));

const project = await exchange(ORIGIN, 'POST', '/projects', { label: 'Create a project', body: { name: 'Billing' } });
const dup = await exchange(ORIGIN, 'POST', '/projects', { label: 'The same name again', body: { name: 'Billing' } });
const pid = JSON.parse(project.text).id;
const moved = await exchange(ORIGIN, 'PATCH', `/diagrams/${id}`, { label: 'Put the diagram into the project', body: { projectId: pid } });
const inProject = await exchange(ORIGIN, 'GET', `/projects/${pid}/diagrams`, { label: 'Diagrams of the project' });
await shootHtml(page, show('The projects resource and the one-to-many link', [project, dup, moved, inProject]), png('09-projects-409'));

const removed = await exchange(ORIGIN, 'DELETE', `/diagrams/${id}`, { label: 'Delete the diagram' });
const again = await exchange(ORIGIN, 'DELETE', `/diagrams/${id}`, { label: 'Delete the same diagram again' });
await shootHtml(page, show('DELETE requests to /diagrams/:id', [removed, again]), png('10-delete-204-404'));

// A real failure: the tables are removed under the running server, so writing the request log fails.
await runToEnd(lab, [cli, 'db:migrate:undo:all'], env);
await shootUrl(page, `${ORIGIN}/diagrams`, png('11-real-500'));
await pause(300);
await shootHtml(page, consolePage({ title: 'Console of the server after the real failure', note: 'Console output captured from the stdout and stderr of the server process, shown as text (the path of the lab folder is shortened to a dot).', lines: ['> node server.js', ...server.lines.map((l) => l.split(lab).join('.'))] }), png('12-server-console'), 1100);

server.stop();
await server.exited;

const tests = await runToEnd(lab, ['--test', '--experimental-test-coverage', '--test-coverage-include=src/**', 'tests/*.test.js', 'report.test.mjs']);
await shootHtml(page, consolePage({ title: 'Result of npm test', note: `Console output captured from node --test, the tail of the output (summary and coverage), exit code ${tests.code}.`, lines: ['> npm test', '...', ...testTail(tests.lines)] }), png('13-tests'), 1100);

await browser.close();
console.log('Figures saved to', out);
