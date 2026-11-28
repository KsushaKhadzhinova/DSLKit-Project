// Real window screenshots of practical 2: a real Chrome window with the address bar (own empty profile, so no account
// or personal data shows). Nothing is drawn: shots/window-shot.ps1 captures the pixels of the
// window. Ports 4230 to 4232 are used and every process is stopped at the end.
// Run from the folder of the work, with the screen unlocked: node shots/real-shots.mjs [name ...]
// Console windows and Postman windows are not made here: a console window cannot be opened from a tool process, see SCREENSHOTS-TODO.md.
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const work = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(work, 'figures');
mkdirSync(out, { recursive: true });
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
if (!chrome) throw new Error('No Chrome found');
const tmp = mkdtempSync(path.join(tmpdir(), 'pz2-real-'));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const only = process.argv.slice(2);
const wanted = (name) => only.length === 0 || only.includes(name);
const kill = (child) => spawnSync('taskkill', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'ignore' });

const start = async (port, env = {}) => {
  const child = spawn(process.execPath, ['src/server.js'], { cwd: work, env: { ...process.env, PORT: String(port), ...env }, stdio: 'ignore' });
  for (let i = 0; i < 50; i += 1) {
    if (await fetch(`http://localhost:${port}/health`).then(() => true, () => false)) return child;
    await pause(200);
  }
  throw new Error(`No answer on port ${port}`);
};
const capture = (file, title, extra = []) => {
  const result = spawnSync('powershell', ['-NoProfile', '-File', path.join(work, 'shots', 'window-shot.ps1'), '-Out', path.join(out, file), '-TitleLike', title, '-MaxWidth', '1280', '-Trim', '8', ...extra], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${file}: ${result.stderr || result.stdout}`);
  console.log(result.stdout.trim());
};
let n = 0;
// title: how the title of this window starts, so a Chrome window of the user is never taken by mistake.
const browser = async (file, url, height, title, width = 1100, prettify = false) => {
  if (!wanted(file)) return;
  n += 1;
  const child = spawn(chrome, ['--new-window', '--no-first-run', '--no-default-browser-check', '--guest', '--disable-translate', '--disable-features=Translate,TranslateUI,SigninIntercept,ChromeWhatsNewUI', '--lang=ru', '--disable-sync', `--user-data-dir=${path.join(tmp, `profile${n}`)}`, '--window-position=260,40', '--accept-lang=ru,en-US,en', `--window-size=${width},${height}`, ...(prettify ? ['--remote-debugging-port=9333'] : []), url], { stdio: 'ignore' });
  await pause(4500);
  if (prettify) {
    const pages = await (await fetch('http://localhost:9333/json')).json();
    const ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve));
    for (const [id, type] of [[1, 'mousePressed'], [2, 'mouseReleased']]) ws.send(JSON.stringify({ id, method: 'Input.dispatchMouseEvent', params: { type, x: 125, y: 10, button: 'left', clickCount: 1 } }));
    await pause(1500);
    ws.close();
  }
  try {
    capture(file, `${title}*Google Chrome*`, ['-Escape']);
  } finally {
    kill(child);
    await pause(700);
  }
};
// A real console window: "cmd /c start" opens the default terminal of the user (Windows Terminal), the script sets the title.
const terminal = async (file, title, command, wait, size = '') => {
  if (!wanted(file)) return;
  const scriptFile = path.join(tmp, `${path.basename(file, '.png')}.ps1`);
  writeFileSync(scriptFile, `$Host.UI.RawUI.WindowTitle='${title}'
Set-Location '${work}'
${command}
`);
  spawn('cmd.exe', ['/c', 'start', '', process.env.SHOT_SHELL ?? 'powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-File', scriptFile], { stdio: 'ignore' });
  await pause(wait);
  try {
    capture(file, `*${title}*`);
  } finally {
    spawnSync('powershell', ['-NoProfile', '-Command', "Get-Process WindowsTerminal | Where-Object { $_.MainWindowTitle -like '*DSLKit*' -or $_.MainWindowTitle -like '*npm start*' } | Stop-Process -Force"], { stdio: 'ignore' });
    await pause(700);
  }
};
const servers = [];
try {
  const journal = path.join(tmp, 'main.sqlite');
  servers.push(await start(4230, { JOURNAL_FILE: journal }));
  const api = 'http://localhost:4230/api';
  // Requests with different outcomes, so that the journal table has rows to show.
  const send = (method, url, headers = {}, body) => fetch(`${api}${url}`, { method, headers: { ...(body && { 'Content-Type': 'application/json' }), ...headers }, body: body && JSON.stringify(body) }).then((r) => r.status);
  await send('GET', '/users');
  await send('POST', '/diagrams', {}, { title: 'Billing schema', notation: 'ERD', code: 'invoice -> payment', projectId: 1 });
  await send('PATCH', '/users/1', {}, { role: 'editor' });
  await send('DELETE', '/users/1');
  await send('DELETE', '/projects/1', { 'X-User-Id': '2' });
  await send('GET', '/users/999');
  await send('POST', '/users', {}, { name: '', email: 'x' });
  await fetch('http://localhost:4230/health');

  await browser('02-users-list.png', `${api}/users`, 330, 'localhost:4230/api*');
  await browser('03-user-one.png', `${api}/users/1`, 300, 'localhost:4230/api*');
  await browser('04-user-404.png', `${api}/users/999`, 660, '404 *');
  await browser('05-user-400.png', `${api}/users/abc`, 660, '400 *');
  await browser('06-diagrams-search.png', `${api}/diagrams?q=billing&sort=-title&page=1&limit=10`, 360, 'localhost:4230/api*');
  await browser('07-user-projects.png', `${api}/users/1/projects`, 330, 'localhost:4230/api*');
  await browser('error-404.png', 'http://localhost:4230/nope', 660, '404 *');
  await browser('api-docs.png', `${api}/openapi.json`, 760, 'localhost:4230/api*', 1100, true);

  servers.push(await start(4231, { JOURNAL_FILE: path.join(tmp, 'limited.sqlite'), RATE_LIMIT_MAX: '3' }));
  for (let i = 0; i < 3; i += 1) await fetch('http://localhost:4231/api/users');
  await browser('error-429.png', 'http://localhost:4231/api/users', 660, '429 *');

  const file = path.join(tmp, 'broken.sqlite');
  servers.push(await start(4232, { JOURNAL_FILE: file }));
  spawnSync(process.execPath, ['tools/break-journal.mjs', file], { cwd: work, stdio: 'ignore' });
  await browser('error-500.png', 'http://localhost:4232/api/users', 660, '500 *');

  copyFileSync(journal, path.join(work, 'journal.sqlite'));
  await terminal('journal-table.png', 'DSLKit journal', "Write-Host 'PS> node tools/show-journal.mjs journal.sqlite'; node --no-warnings tools/show-journal.mjs journal.sqlite", 7000);
  rmSync(path.join(work, 'journal.sqlite'), { force: true });
  const startLog = path.join(tmp, 'start.sqlite').split(path.sep).join('/');
  await terminal('console.png', 'npm start', `$env:PORT=4236; $env:JOURNAL_FILE='${startLog}'; npm start`, 8000);
  // The real npm test of the work. The caller holds the test lock (C:/Users/zheny/.claude/locks/test.lock). The shot counts only
  // when the run was green with 100 percent coverage (the start test of server.js is not stable: retry until it is).
  const outFile = path.join(tmp, 'npm-test.txt').split(path.sep).join('/');
  if (only.includes('tests.png')) {
    await terminal('tests.png', 'DSLKit tests', `npm test 2>&1 | Tee-Object -FilePath '${outFile}' | Select-Object -Last 28; $Host.UI.RawUI.WindowTitle='DSLKit tests'`, 60000);
    const text = readFileSync(outFile, 'utf8');
    if (!/all filess+|s+100.00 |s+100.00 |s+100.00/.test(text) || !/fail 0/.test(text)) throw new Error('The run was not green with 100 percent coverage, retry');
  }
} finally {
  for (const s of servers) s.kill();
  await pause(500);
  try { rmSync(tmp, { recursive: true, force: true }); } catch { /* a console window may still hold a file; the system cleans the temp folder */ }
}
console.log('Real window screenshots saved to', out);
