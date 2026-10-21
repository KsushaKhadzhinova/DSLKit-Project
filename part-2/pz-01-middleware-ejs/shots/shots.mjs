// Makes the report screenshots of practical 1: starts the real server on a temporary SQLite file, drives the pages in headless Chrome
// (real clicks and typing) and saves PNGs to figures/. The 500 page comes from a real failure: the server is restarted with a database
// file that cannot be created. Run from the folder of the work: node shots/shots.mjs
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { consolePage, ensureDir, here, isUp, launch, pause, runToEnd, shootHtml, start, testTail, waitFor } from './lib.mjs';

const work = here(import.meta.url);
const out = ensureDir(path.join(work, 'figures'));
const png = (name) => path.join(out, `${name}.png`);
const ORIGIN = 'http://localhost:3000';
const tmp = mkdtempSync(path.join(tmpdir(), 'pz1-'));

if (await isUp(ORIGIN)) throw new Error(`${ORIGIN} is already in use, stop that server first`);

const server = start(work, ['src/server.js'], { PORT: '3000', DB_FILE: path.join(tmp, 'requests.db') });
await waitFor(ORIGIN);

const browser = await launch();
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
const WIDTH = 1280;
const shot = async (name) => {
  await page.setViewport({ width: WIDTH, height: 800 });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewport({ width: WIDTH, height: Math.max(height, 800) });
  await page.screenshot({ path: png(name) });
};
const open = (url) => page.goto(ORIGIN + url, { waitUntil: 'networkidle0' });
const fill = async (selector, text) => {
  await page.click(selector, { clickCount: 3 });
  if (text === '') await page.keyboard.press('Backspace');
  else await page.type(selector, text);
};

await open('/');
await shot('list');
await open('/item/1');
await shot('detail');

// The form with wrong values: a title of spaces and a negative revision.
await open('/add?auth=1');
await fill('#title', '   ');
await fill('#description', 'Checked on the server');
await page.$eval('#revision', (el) => {
  el.value = '-5';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('button[type=submit]')]);
await shot('form-errors');

// The same form with correct values: the record appears in the list.
await fill('#title', 'Payment flow');
await fill('#revision', '2');
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('button[type=submit]')]);
await shot('added');

// Editing the first record.
await open('/item/1/edit?auth=1');
await fill('#revision', '7');
await shot('edit');
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('button[type=submit]')]);
await shot('edited');

await open('/nothing-here');
await shot('not-found');
await open('/log?auth=1');
await shot('log');

// The console of the server shows the lines the logger really wrote.
await pause(200);
const lines = [...server.lines];
server.stop();
await server.exited;
await shootHtml(page, consolePage({ title: 'Console output of the server (npm start)', note: 'Console output captured from the stdout and stderr of the process node src/server.js, shown as text.', lines: ['> node src/server.js', ...lines] }), png('console'), 1100);

// A real failure: the database file lies under a path that is a file, so the folder for it cannot be made.
const blocker = path.join(tmp, 'not-a-folder');
writeFileSync(blocker, 'x');
const broken = start(work, ['src/server.js'], { PORT: '3000', DB_FILE: path.join(blocker, 'requests.db') });
await waitFor(ORIGIN);
await open('/');
await shot('server-error');
broken.stop();
await broken.exited;

const tests = await runToEnd(work, ['--test', '--experimental-test-coverage', 'test/*.test.js', 'report.test.mjs']);
await shootHtml(page, consolePage({ title: 'Result of npm test', note: `Console output captured from node --test, the tail of the output (summary and coverage), exit code ${tests.code}.`, lines: ['> npm test', '...', ...testTail(tests.lines)] }), png('tests'), 1100);

await browser.close();
console.log('Figures saved to', out);
