// Makes the report screenshots of lab 3: starts the real server on a temporary SQLite file with secrets made at run time
// (nothing is written to the repository), opens GET addresses in headless Chrome, records requests with tokens by a script
// and causes a real 500 by undoing the migrations under the running server. Run from the lab folder: node shots/shots.mjs
import { randomBytes } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { consolePage, ensureDir, exchange, exchangePage, here, isUp, launch, runToEnd, shootHtml, shootUrl, start, testTail, waitFor } from './lib.mjs';

const lab = here(import.meta.url);
const out = ensureDir(path.join(lab, 'figures'));
const png = (name) => path.join(out, `${name}.png`);
const ORIGIN = 'http://localhost:3000';
const secret = () => randomBytes(24).toString('hex');
const admin = { email: 'admin@example.com', password: secret() };
const env = {
  SQLITE_STORAGE: path.join(mkdtempSync(path.join(tmpdir(), 'lab3-')), 'lab3.sqlite'),
  DATABASE_URL: '',
  PORT: '3000',
  JWT_SECRET: secret() + secret(),
  ADMIN_EMAIL: admin.email,
  ADMIN_PASSWORD: admin.password,
};
const cli = path.join(lab, 'node_modules/sequelize-cli/lib/sequelize');
const short = (token) => `Bearer ${token.slice(0, 24)}...`;

if (await isUp(ORIGIN)) throw new Error(`${ORIGIN} is already in use, stop that server first`);

const migrate = await runToEnd(lab, [cli, 'db:migrate'], env);
const seed = await runToEnd(lab, [cli, 'db:seed:all'], env);
const server = start(lab, ['server.js'], env);
await waitFor(`${ORIGIN}/health`);

const browser = await launch();
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
const note = 'HTTP exchange recorded by a script (fetch). The answers are real answers of the running server, the JSON body is only indented, a token is cut in the Authorization line.';
const show = (title, items) => exchangePage({ title, note, items });
const withToken = (token) => ({ headers: { Authorization: `Bearer ${token}` }, shownToken: short(token) });

await shootHtml(page, consolePage({ title: 'Migrations and seed (npm run db:migrate, npm run db:seed)', note: 'Console output captured from the processes, shown as text. The administrator comes from variables of the environment made at run time.', lines: ['> sequelize-cli db:migrate', ...migrate.lines, '', '> sequelize-cli db:seed:all', ...seed.lines] }), png('01-migrate-seed'), 1000);
await shootHtml(page, consolePage({ title: 'Console output of the server (npm start)', note: 'Console output captured from the stdout of the process node server.js, shown as text.', lines: ['> node server.js', ...server.lines] }), png('02-server-start'));

// Registration and login.
const user = { email: 'kate@example.com', password: 'correct horse 42' };
const registered = await exchange(ORIGIN, 'POST', '/auth/register', { label: 'Register', body: user });
const duplicate = await exchange(ORIGIN, 'POST', '/auth/register', { label: 'The same email in another letter case', body: { ...user, email: 'Kate@Example.com' } });
const weak = await exchange(ORIGIN, 'POST', '/auth/register', { label: 'A short password', body: { email: 'bob@example.com', password: 'short' } });
await shootHtml(page, show('Registration', [registered, duplicate, weak]), png('03-register'));

const login = await exchange(ORIGIN, 'POST', '/auth/login', { label: 'Log in', body: user });
const wrong = await exchange(ORIGIN, 'POST', '/auth/login', { label: 'Wrong password', body: { ...user, password: 'wrong password' } });
await shootHtml(page, show('Login', [login, wrong]), png('04-login'), 1000);
const { token } = JSON.parse(login.text);

// Protected routes with different tokens.
const good = await exchange(ORIGIN, 'GET', '/profile', { label: 'Profile with a valid token', ...withToken(token) });
const none = await exchange(ORIGIN, 'GET', '/profile', { label: 'Profile without a token' });
const forged = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');
const bad = await exchange(ORIGIN, 'GET', '/profile', { label: 'Profile with a changed token', ...withToken(forged) });
await shootHtml(page, show('The protected route /profile', [good, none, bad]), png('05-profile-401'), 1000);
await shootUrl(page, `${ORIGIN}/profile`, png('06-browser-401'));

// Diagrams of the owner, other people's diagrams and the administrator.
const created = await exchange(ORIGIN, 'POST', '/diagrams', { label: 'Create a diagram, the owner is the caller', body: { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server', priority: 'low' }, ...withToken(token) });
const id = JSON.parse(created.text).id;
const patched = await exchange(ORIGIN, 'PATCH', `/diagrams/${id}`, { label: 'Change one field of my diagram', body: { priority: 'high' }, ...withToken(token) });
const emptyPatch = await exchange(ORIGIN, 'PATCH', `/diagrams/${id}`, { label: 'PATCH with an empty body', body: {}, ...withToken(token) });
await shootHtml(page, show('Diagrams of the owner', [created, patched, emptyPatch]), png('07-diagrams-patch'), 1000);

await exchange(ORIGIN, 'POST', '/auth/register', { body: { email: 'bob@example.com', password: 'another long pass 7' } });
const bobToken = JSON.parse((await exchange(ORIGIN, 'POST', '/auth/login', { body: { email: 'bob@example.com', password: 'another long pass 7' } })).text).token;
const adminToken = JSON.parse((await exchange(ORIGIN, 'POST', '/auth/login', { body: admin })).text).token;
const foreign = await exchange(ORIGIN, 'DELETE', `/diagrams/${id}`, { label: 'Another user deletes my diagram', ...withToken(bobToken) });
const usersUser = await exchange(ORIGIN, 'GET', '/users', { label: 'List of users for a regular user', ...withToken(bobToken) });
const usersAdmin = await exchange(ORIGIN, 'GET', '/users', { label: 'List of users for the administrator', ...withToken(adminToken) });
await shootHtml(page, show('Roles: owner, outsider and administrator', [foreign, usersUser, usersAdmin]), png('08-roles-403'), 1000);

const paged = await exchange(ORIGIN, 'GET', '/diagrams?limit=2&offset=0&sort=title&order=desc', { label: 'First page of two, sorted by title descending', ...withToken(token) });
await shootHtml(page, show('Paging and sorting', [paged]), png('10-paging'), 1000);

// A real failure: the tables are removed under the running server, so writing the request log fails.
await runToEnd(lab, [cli, 'db:migrate:undo:all'], env);
await shootUrl(page, `${ORIGIN}/diagrams`, png('11-real-500'));
await shootHtml(page, consolePage({ title: 'Console of the server after the real failure', note: 'Console output captured from the stdout and stderr of the server process, shown as text (the path of the lab folder is shortened to a dot).', lines: ['> node server.js', ...server.lines.map((l) => l.split(lab).join('.'))] }), png('12-server-console'), 1100);

server.stop();
await server.exited;

const tests = await runToEnd(lab, ['--test', '--experimental-test-coverage', '--test-coverage-include=src/**', 'tests/*.test.js', 'report.test.mjs']);
await shootHtml(page, consolePage({ title: 'Result of npm test', note: `Console output captured from node --test, the tail of the output (summary and coverage), exit code ${tests.code}.`, lines: ['> npm test', '...', ...testTail(tests.lines)] }), png('09-tests'), 1100);

await browser.close();
console.log('Figures saved to', out);
