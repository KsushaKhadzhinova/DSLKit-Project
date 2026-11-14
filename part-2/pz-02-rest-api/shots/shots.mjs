// Makes the report screenshots of practical 2: starts the real server on port 3000, opens GET addresses in headless Chrome,
// records the other methods with a script (a browser tab cannot send them) and saves PNGs to figures/.
// Run from the folder of the work: node shots/shots.mjs
import path from 'node:path';
import { consolePage, ensureDir, exchange, exchangePage, here, isUp, launch, runToEnd, shootHtml, shootUrl, start, testTail, waitFor } from './lib.mjs';

const work = here(import.meta.url);
const out = ensureDir(path.join(work, 'figures'));
const png = (name) => path.join(out, `${name}.png`);
const ORIGIN = 'http://localhost:3000';
const API = `${ORIGIN}/api`;

if (await isUp(ORIGIN)) throw new Error(`${ORIGIN} is already in use, stop that server first`);

const server = start(work, ['src/server.js'], { PORT: '3000' });
await waitFor(`${ORIGIN}/health`);

const browser = await launch();
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
const note = 'HTTP exchange recorded by a script (fetch). The answers are real answers of the running server, the JSON body is only indented.';
const show = (title, items) => exchangePage({ title, note, items });
const send = (method, url, body, label) => exchange(ORIGIN, method, `/api${url}`, { body, label });

await shootHtml(page, consolePage({ title: 'Console output of the server (npm start)', note: 'Console output captured from the stdout of the process node src/server.js, shown as text.', lines: ['> node src/server.js', ...server.lines] }), png('01-server-start'));

// Data is made through the real API; the answers of these calls are the first figure with exchanges.
const user = await send('POST', '/users', { name: 'Anna', email: 'anna@example.com', role: 'owner' }, 'Create a user');
const project = await send('POST', '/projects', { name: 'Billing', description: 'Invoices and payments', ownerId: 1 }, 'Create a project');
const diagram = await send('POST', '/diagrams', { title: 'Billing schema', notation: 'ERD', code: 'invoice -> payment', projectId: 1 }, 'Create a diagram');
await send('POST', '/diagrams', { title: 'Payment flow', notation: 'BPMN', code: 'pay -> check', projectId: 1 });
await shootHtml(page, show('POST requests that create the three resources', [user, project, diagram]), png('08-post-create'), 1000);

await shootUrl(page, `${API}/users`, png('02-users-list'));
await shootUrl(page, `${API}/users/1`, png('03-user-one'));
await shootUrl(page, `${API}/users/999`, png('04-user-404'));
await shootUrl(page, `${API}/users/abc`, png('05-user-400'));
await shootUrl(page, `${API}/diagrams?q=billing&sort=-title&page=1&limit=10`, png('06-diagrams-search'), { width: 1000 });
await shootUrl(page, `${API}/users/1/projects`, png('07-user-projects'), { width: 1000 });

const invalid = await send('POST', '/users', { name: '', email: 'not-an-email' }, 'Empty name and a wrong email');
const unknown = await send('POST', '/diagrams', { title: 'Orphan', notation: 'ERD', projectId: 1, extra: 1 }, 'An unknown field');
const missing = await send('POST', '/diagrams', { title: 'Orphan', notation: 'ERD', projectId: 99 }, 'A project that does not exist');
await shootHtml(page, show('Requests with wrong data', [invalid, unknown, missing]), png('09-validation-400'), 1000);

const patched = await send('PATCH', '/users/1', { role: 'editor' }, 'Change one field');
const replaced = await send('PUT', '/users/1', { name: 'Anna Smith', email: 'anna@example.com', role: 'owner' }, 'Replace the whole user');
await shootHtml(page, show('PATCH and PUT requests', [patched, replaced]), png('10-patch-put'), 1000);

const published = await send('POST', '/diagrams/1/publish', undefined, 'Publish a diagram');
const again = await send('POST', '/diagrams/1/publish', undefined, 'Publish it again, nothing changes');
const copy = await send('POST', '/diagrams/1/duplicate', undefined, 'Duplicate the diagram');
await shootHtml(page, show('The additional operations of diagrams', [published, again, copy]), png('11-publish-duplicate'), 1000);

const blocked = await send('DELETE', '/users/1', undefined, 'Delete a user who owns projects');
const removed = await send('DELETE', '/diagrams/2', undefined, 'Delete a diagram');
await shootHtml(page, show('DELETE requests', [blocked, removed]), png('12-delete-409-204'), 1000);

server.stop();
await server.exited;

const tests = await runToEnd(work, ['--test', '--experimental-test-coverage', 'test/*.test.js', 'report.test.mjs']);
await shootHtml(page, consolePage({ title: 'Result of npm test', note: `Console output captured from node --test, the tail of the output (summary and coverage), exit code ${tests.code}.`, lines: ['> npm test', '...', ...testTail(tests.lines)] }), png('13-tests'), 1100);

await browser.close();
console.log('Figures saved to', out);
