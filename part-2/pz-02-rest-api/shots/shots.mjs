// Makes the browser figures of practical 2 from the real server with the headless Edge command line
// (no extra packages): a GET address opened in a real browser is a screenshot, nothing is drawn by a script.
// Run from the folder of the work: node shots/shots.mjs
// Ports 4230, 4231 and 4232 are used, each server is stopped at the end. The figures that a script cannot make
// (Postman windows, the 403 page that needs request headers, the database viewer, the console, the tests)
// are made by shots/placeholders.mjs as marked placeholders and listed in SCREENSHOTS-TODO.md.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const work = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(work, 'figures');
mkdirSync(out, { recursive: true });
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
if (!edge) throw new Error('No Edge or Chrome found');
const tmp = mkdtempSync(path.join(tmpdir(), 'pz2-shots-'));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const start = async (port, env = {}) => {
  const child = spawn(process.execPath, ['src/server.js'], { cwd: work, env: { ...process.env, PORT: String(port), ...env }, stdio: 'ignore' });
  for (let i = 0; i < 50; i += 1) {
    if (await fetch(`http://localhost:${port}/health`).then(() => true, () => false)) return child;
    await pause(200);
  }
  throw new Error(`No answer on port ${port}`);
};
const shoot = (url, name, height = 700, width = 1000) => {
  spawnSync(edge, ['--headless', '--disable-gpu', `--user-data-dir=${path.join(tmp, 'profile')}`, '--hide-scrollbars', `--screenshot=${path.join(out, name)}`, `--window-size=${width},${height}`, url], { stdio: 'ignore' });
};

const servers = [];
try {
  const main = await start(4230, { JOURNAL_FILE: path.join(tmp, 'main.sqlite') });
  servers.push(main);
  const api = 'http://localhost:4230/api';
  shoot(`${api}/users`, '02-users-list.png', 180);
  shoot(`${api}/users/1`, '03-user-one.png', 150);
  shoot(`${api}/users/999`, '04-user-404.png', 620);
  shoot(`${api}/users/abc`, '05-user-400.png', 620);
  shoot(`${api}/diagrams?q=billing&sort=-title&page=1&limit=10`, '06-diagrams-search.png', 260);
  shoot(`${api}/users/1/projects`, '07-user-projects.png', 200);
  shoot('http://localhost:4230/nope', 'error-404.png', 620);

  // 429: the limit is 3 requests a minute, the 4th answer is the page.
  const limited = await start(4231, { JOURNAL_FILE: path.join(tmp, 'limited.sqlite'), RATE_LIMIT_MAX: '3' });
  servers.push(limited);
  for (let i = 0; i < 3; i += 1) await fetch('http://localhost:4231/api/users');
  shoot('http://localhost:4231/api/users', 'error-429.png', 620);

  // 500: the journal table is dropped under the running server.
  const file = path.join(tmp, 'broken.sqlite');
  const broken = await start(4232, { JOURNAL_FILE: file });
  servers.push(broken);
  spawnSync(process.execPath, ['tools/break-journal.mjs', file], { cwd: work, stdio: 'ignore' });
  shoot('http://localhost:4232/api/users', 'error-500.png', 620);
} finally {
  for (const s of servers) s.kill();
  await pause(500);
  rmSync(tmp, { recursive: true, force: true });
}
console.log('Figures saved to', out);
