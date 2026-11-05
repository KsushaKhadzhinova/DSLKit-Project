import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
export const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
export const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const launch = async ({ exe = CHROME, args = [], url }) => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'dt-'));
  mkdirSync(join(userDataDir, 'Default'), { recursive: true });
  writeFileSync(join(userDataDir, 'Default', 'Preferences'), JSON.stringify({ devtools: { preferences: { uiTheme: '"light"', currentDockState: '"bottom"', 'language': '"en-US"' } }, intl: { selected_languages: 'en-US' } }));
  const browser = await puppeteer.launch({
    executablePath: exe, headless: false, defaultViewport: null, userDataDir,
    ignoreDefaultArgs: ['--disable-extensions', '--enable-automation'],
    args: ['--window-position=0,0', '--window-size=1920,1000', '--no-first-run', '--lang=en-US', ...args],
  });
  const [page] = await browser.pages();
  if (url) await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.bringToFront();
  return { browser, page };
};
export const keys = (seq) => {
  execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${seq.replace(/'/g, "''")}')`]);
};
export const shoot = (file) => execFileSync('powershell', ['-NoProfile', '-File', join(HERE, 'shoot.ps1'), '-Out', file]).toString().trim();

export const click = (x, y, n = 1) => execFileSync('powershell', ['-NoProfile', '-File', join(HERE, 'click.ps1'), '-X', String(x), '-Y', String(y), '-Clicks', String(n)]);
export const shootRegion = (file, x, y, w, h) => execFileSync('powershell', ['-NoProfile', '-File', join(HERE, 'shoot.ps1'), '-Out', file, '-X', String(x), '-Y', String(y), '-W', String(w), '-H', String(h)]).toString().trim();
