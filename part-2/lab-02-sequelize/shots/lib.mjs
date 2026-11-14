// Helpers shared by the screenshot scripts of the server works (the same file is kept in every work folder).
// Everything shown on a figure comes from a real process: a real server, a real browser tab, real HTTP answers.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const fallback = process.env.PUPPETEER_DIR || 'E:/DSLKit-Project/.claude/worktrees/part2-ws-work-ee9b7b/part-2/lab-07-websocket/package.json';
export const puppeteer = (() => {
  try {
    return require('puppeteer-core');
  } catch {
    return createRequire(fallback)('puppeteer-core');
  }
})();

const browsers = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);

export const launch = () => {
  const executablePath = browsers.find((p) => existsSync(p));
  if (!executablePath) throw new Error('No Chrome or Edge found, set CHROME_PATH');
  return puppeteer.launch({ executablePath, headless: true });
};

export const ensureDir = (dir) => {
  mkdirSync(dir, { recursive: true });
  return dir;
};

export const pause = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const isUp = (url) => fetch(url).then(() => true, () => false);

export const waitFor = async (url) => {
  for (let i = 0; i < 100; i += 1) {
    if (await isUp(url)) return;
    await pause(300);
  }
  throw new Error(`No answer from ${url}`);
};

// Starts a process without a shell and keeps everything it prints, so the console can be shown as it really was.
export const start = (cwd, args, env = {}) => {
  const lines = [];
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  const take = (chunk) => lines.push(...chunk.toString().split(/\r?\n/).filter(Boolean));
  child.stdout.on('data', take);
  child.stderr.on('data', take);
  const exited = new Promise((resolve) => child.on('exit', resolve));
  return { child, lines, exited, stop: () => child.kill() };
};

// Runs a command to the end and returns what it printed (without colour codes).
export const runToEnd = (cwd, args, env = {}) =>
  new Promise((resolve) => {
    const proc = start(cwd, args, env);
    proc.exited.then((code) => resolve({ code, lines: proc.lines.map((l) => l.replace(/\x1b\[[0-9;]*m/g, '')) }));
  });

// The summary and the coverage table at the end of a node --test run.
export const testTail = (lines) => lines.slice(Math.max(0, lines.findIndex((l) => /^ℹ tests /.test(l))));

const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const base = `
  body { margin: 0; padding: 24px; background: #f4f6fa; color: #1b2233; font: 15px/1.5 'Segoe UI', Arial, sans-serif; }
  h1 { font-size: 17px; margin: 0 0 4px; }
  p.note { margin: 0 0 16px; color: #4a5368; font-size: 13px; }
  pre { margin: 0; padding: 12px 14px; border-radius: 8px; font: 13px/1.5 Consolas, 'Courier New', monospace; white-space: pre-wrap; word-break: break-all; }
  .req { background: #e8effd; border-left: 4px solid #2563eb; }
  .res { background: #eaf6ee; border-left: 4px solid #1f8a4c; }
  .res.bad { background: #fdecec; border-left-color: #c0392b; }
  .label { font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: #4a5368; margin: 10px 0 4px; }
  .pair { background: #fff; border: 1px solid #d8deea; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
  .term { background: #12161f; color: #d6deeb; border-radius: 8px; }
`;

export const exchangePage = ({ title, note, items }) => `<!doctype html><meta charset="utf-8"><style>${base}</style>
<h1>${escapeHtml(title)}</h1><p class="note">${escapeHtml(note)}</p>
${items
  .map(
    (item) => `<div class="pair"><div class="label">${escapeHtml(item.label)}</div>
<pre class="req">${escapeHtml(item.request)}</pre>
<pre class="res${item.status >= 400 ? ' bad' : ''}">${escapeHtml(item.response)}</pre></div>`,
  )
  .join('\n')}`;

export const consolePage = ({ title, note, lines }) => `<!doctype html><meta charset="utf-8"><style>${base}</style>
<h1>${escapeHtml(title)}</h1><p class="note">${escapeHtml(note)}</p>
<pre class="term">${escapeHtml(lines.join('\n'))}</pre>`;

const SHOWN = ['content-type', 'location', 'x-total-count', 'www-authenticate'];

// Sends one real request and returns both sides as text: what was sent and what came back.
export const exchange = async (origin, method, url, { headers = {}, body, label, shownToken } = {}) => {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const sent = { ...(payload !== undefined && { 'Content-Type': 'application/json' }), ...headers };
  const response = await fetch(origin + url, { method, headers: sent, body: payload });
  const raw = await response.text();
  let shown = raw;
  try {
    shown = JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    // not JSON: shown as it is
  }
  const host = new URL(origin).host;
  const sentLines = Object.entries(sent).map(([k, v]) => `${k}: ${k === 'Authorization' && shownToken ? shownToken : v}`);
  const request = [`${method} ${url} HTTP/1.1`, `Host: ${host}`, ...sentLines, ...(payload === undefined ? [] : ['', JSON.stringify(body, null, 2)])].join('\n');
  const got = SHOWN.filter((h) => response.headers.has(h)).map((h) => `${h.replace(/(^|-)\w/g, (c) => c.toUpperCase())}: ${response.headers.get(h)}`);
  const responseText = [`HTTP/1.1 ${response.status} ${response.statusText || ''}`.trim(), ...got, ...(shown ? ['', shown] : [])].join('\n');
  return { label: label || `${method} ${url}`, request, response: responseText, status: response.status, text: raw };
};

// Takes a PNG of the whole page.
export const shootPage = async (page, file, width = 900) => {
  await page.setViewport({ width, height: 400 });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewport({ width, height: Math.max(height, 200) });
  await page.screenshot({ path: file });
};

// A page that showed a JSON answer stays in the JSON viewer, so drawn pages get their own fresh tab.
export const shootHtml = async (page, html, file, width = 900) => {
  const fresh = await page.browser().newPage();
  await fresh.setContent(html);
  await shootPage(fresh, file, width);
  await fresh.close();
};


// Opens an address in the browser tab and shoots the page as the browser draws it (JSON is shown by Chrome itself).
export const shootUrl = async (page, url, file, { width = 900, headers } = {}) => {
  if (headers) await page.setExtraHTTPHeaders(headers);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.setViewport({ width, height: 300 });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewport({ width, height: Math.min(Math.max(height + 16, 120), 1600) });
  await page.screenshot({ path: file });
  if (headers) await page.setExtraHTTPHeaders({});
};

export const here = (metaUrl) => path.resolve(path.dirname(fileURLToPath(metaUrl)), '..');
