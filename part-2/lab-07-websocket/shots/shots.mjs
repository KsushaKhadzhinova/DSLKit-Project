// Makes the report screenshots: starts the server, opens clients in headless Edge/Chrome and saves PNGs to figures/.
// Run from the lab folder: node shots/shots.mjs
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const { createServer } = require('../src/app');
const out = fileURLToPath(new URL('../figures/', import.meta.url));

const browsers = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const executablePath = browsers.find((p) => existsSync(p));
if (!executablePath) throw new Error('No Chrome or Edge found, set CHROME_PATH');

const server = createServer();
await new Promise((resolve) => server.httpServer.listen(0, resolve));
const url = `http://localhost:${server.httpServer.address().port}/`;
const browser = await puppeteer.launch({ executablePath, headless: true });
const pause = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const open = async (name) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(url);
  await page.type('#username', name);
  await page.click('#login button[type=submit]');
  await page.waitForSelector('#workspace:not([hidden])');
  return page;
};
const enter = async (page, room) => {
  await page.bringToFront();
  await page.$eval('#room', (el) => (el.value = ''));
  await page.type('#room', room);
  await page.click('#room-form button[type=submit]');
  await pause();
};
const say = async (page, text) => {
  await page.bringToFront();
  await page.type('#text', text);
  await page.click('#chat-form button[type=submit]');
  await pause();
};
const shot = async (page, name) => {
  await page.bringToFront();
  return page.screenshot({ path: path.join(out, name) });
};

try {
  const alice = await open('alice');
  await enter(alice, 'diagram-1');
  const bob = await open('bob');
  await enter(bob, 'diagram-1');
  await shot(alice, '01-join-notifications-alice.png');
  await shot(bob, '02-join-bob.png');

  await say(alice, 'Hi Bob, can you check the login flow diagram?');
  await say(bob, 'Sure, opening it now');
  await shot(alice, '03-chat-alice.png');
  await shot(bob, '04-chat-bob.png');

  const carol = await open('carol');
  await enter(carol, 'diagram-2');
  await say(carol, 'Message in another room');
  await shot(carol, '05-room-diagram-2-carol.png');
  await shot(alice, '06-room-diagram-1-alice-no-leak.png');

  await alice.bringToFront();
  await alice.click('#editing');
  await pause();
  await shot(bob, '07-who-is-editing-bob.png');

  await bob.bringToFront();
  await bob.type('#text', '   ');
  await bob.click('#chat-form button[type=submit]');
  await pause();
  await shot(bob, '08-validation-error-bob.png');

  await bob.bringToFront();
  await bob.click('#leave');
  await pause();
  await shot(alice, '09-leave-notification-alice.png');
  await bob.close();
  await pause();
  await shot(alice, '10-disconnect-notification-alice.png');
} finally {
  await browser.close();
  server.io.close();
}
