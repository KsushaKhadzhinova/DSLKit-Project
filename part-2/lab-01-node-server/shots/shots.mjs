// Makes the report screenshots of lab 1: starts the real server on port 3000, opens GET addresses in headless Chrome,
// records POST, PUT, PATCH and DELETE with a script (a browser tab cannot send them) and saves PNGs to figures/.
// Run from the lab folder: node shots/shots.mjs
import path from 'node:path';
import { consolePage, ensureDir, exchange, exchangePage, here, isUp, launch, pause, runToEnd, shootHtml, shootUrl, start, testTail, waitFor } from './lib.mjs';

const lab = here(import.meta.url);
const out = ensureDir(path.join(lab, 'figures'));
const png = (name) => path.join(out, `${name}.png`);
const ORIGIN = 'http://localhost:3000';

if (await isUp(ORIGIN)) throw new Error(`${ORIGIN} is already in use, stop that server first`);

const server = start(lab, ['server.js'], { PORT: '3000' });
await waitFor(`${ORIGIN}/health`);
await pause(200);

const browser = await launch();
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);

// Figures 1 to 5 are tabs of the browser: GET requests only.
await shootUrl(page, `${ORIGIN}/diagrams`, png('02-get-list'));
await shootUrl(page, `${ORIGIN}/diagrams/1`, png('03-get-one'));
await shootUrl(page, `${ORIGIN}/diagrams/99`, png('04-get-404'));
await shootUrl(page, `${ORIGIN}/diagrams/abc`, png('05-get-400'));

// The other methods are sent by this script and the real answers are drawn as pages.
const note = 'HTTP exchange recorded by a script (fetch). The answers are real answers of the running server, the JSON body is only indented.';
const created = await exchange(ORIGIN, 'POST', '/diagrams', {
  label: 'Create a diagram',
  body: { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server', priority: 'normal', owner: 'carol' },
});
const id = JSON.parse(created.text).id;
const replaced = await exchange(ORIGIN, 'PUT', `/diagrams/${id}`, {
  label: 'Replace the whole diagram',
  body: { title: 'Login flow v2', notation: 'UML', sourceCode: 'user -> server -> database', priority: 'low', owner: 'carol' },
});
const patched = await exchange(ORIGIN, 'PATCH', `/diagrams/${id}`, { label: 'Change one field', body: { priority: 'high' } });
await shootHtml(page, exchangePage({ title: 'POST, PUT and PATCH requests to /diagrams', note, items: [created, replaced, patched] }), png('06-post-put-patch'));

const invalid = await exchange(ORIGIN, 'POST', '/diagrams', { label: 'Empty title and unknown notation', body: { title: '', notation: 'XYZ' } });
const emptyPatch = await exchange(ORIGIN, 'PATCH', '/diagrams/1', { label: 'PATCH with an empty body', body: {} });
await shootHtml(page, exchangePage({ title: 'Requests with wrong data', note, items: [invalid, emptyPatch] }), png('07-validation-400'));

const removed = await exchange(ORIGIN, 'DELETE', `/diagrams/${id}`, { label: 'Delete the diagram' });
const again = await exchange(ORIGIN, 'DELETE', `/diagrams/${id}`, { label: 'Delete the same diagram again' });
await shootHtml(page, exchangePage({ title: 'DELETE requests to /diagrams/:id', note, items: [removed, again] }), png('08-delete-204-404'));

server.stop();
await server.exited;

// The console of the server is shown from the lines it really printed.
await shootHtml(
  page,
  consolePage({
    title: 'Console output of the server (npm start)',
    note: 'Console output captured from the stdout of the process node server.js, shown as text.',
    lines: ['> node server.js', ...server.lines],
  }),
  png('01-server-start'),
);

// The test run is shown from its real output: the summary and the coverage table.
const tests = await runToEnd(lab, ['--test', '--experimental-test-coverage', '--test-coverage-include=src/**', 'tests/*.test.js', 'report.test.mjs']);
await shootHtml(
  page,
  consolePage({
    title: 'Result of npm test',
    note: `Console output captured from node --test, the tail of the output (summary and coverage), exit code ${tests.code}.`,
    lines: ['> npm test', '...', ...testTail(tests.lines)],
  }),
  png('09-tests'),
  1100,
);

await browser.close();
console.log('Figures saved to', out);
