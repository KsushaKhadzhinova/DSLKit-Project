// A very small browser driver for the report screenshots: Edge or Chrome started headless and talked to over the DevTools
// protocol with the WebSocket of Node itself, so no package has to be installed. It does what the shots need: open an
// address, set a form value, click, wait for the page and save a PNG of the page (cropped to a fixed maximum height).
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const browsers = [
  process.env.CHROME_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean);

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// windowed: a real browser window (Russian interface, address bar visible) is captured from the screen with
// windows/capture-window.ps1; otherwise a headless browser renders the page.
export const launch = async ({ windowed = false } = {}) => {
  const executable = browsers.find((p) => existsSync(p));
  if (!executable) throw new Error('No Edge or Chrome found, set CHROME_PATH');
  const profile = mkdtempSync(path.join(tmpdir(), 'pz-shots-'));
  const shown = ['--lang=ru', '--window-position=0,0', '--window-size=1296,1032', '--blink-settings=preferredColorScheme=0', '--no-default-browser-check', '--disable-sync', '--disable-extensions'];
  const args = windowed ? shown : ['--headless=new', '--disable-gpu', '--hide-scrollbars'];
  const child = spawn(executable, [...args, '--no-first-run', '--force-device-scale-factor=1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let port;
  for (let i = 0; i < 100 && !port; i += 1) {
    await pause(200);
    try {
      port = Number(readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
    } catch {
      // not written yet
    }
  }
  if (!port) throw new Error('The browser did not start');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const waiting = new Map();
  const listeners = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && waiting.has(message.id)) {
      const { resolve, reject } = waiting.get(message.id);
      waiting.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else if (message.method) for (const fn of listeners.get(message.method) ?? []) fn(message.params);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      id += 1;
      waiting.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const once = (method) =>
    new Promise((resolve) => {
      const fn = (params) => {
        listeners.set(method, (listeners.get(method) ?? []).filter((x) => x !== fn));
        resolve(params);
      };
      listeners.set(method, [...(listeners.get(method) ?? []), fn]);
    });

  await send('Page.enable');
  if (!windowed) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  const settle = async () => {
    await evaluate('document.fonts.ready.then(() => true)');
    await pause(250);
  };
  const page = {
    evaluate,
    async goto(url) {
      const loaded = once('Page.loadEventFired');
      await send('Page.navigate', { url });
      await loaded;
      await settle();
    },
    async fill(selector, value) {
      await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    },
    // A click that starts a navigation (a form is sent): resolves when the next page has loaded.
    async submit(selector) {
      const loaded = once('Page.loadEventFired');
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await loaded;
      await settle();
    },
    async html(markup) {
      const loaded = once('Page.loadEventFired');
      await send('Page.navigate', { url: `data:text/html;charset=utf-8,${encodeURIComponent(markup)}` });
      await loaded;
      await settle();
    },
    // Saves the page at the given width, as tall as its content (or down to the bottom of the element `until`) but not taller than maxHeight pixels.
    // 1380 pixels at 1280 wide is 60 percent of the page height when the picture is 16.5 cm wide.
    async shot(file, { width = 1280, maxHeight = 1380, height, until, margin = 40 } = {}) {
      if (windowed) {
        // The window is as tall as the content (down to the element `until`), not taller than the screen allows.
        const { windowId } = await send('Browser.getWindowForTarget');
        const { bounds } = await send('Browser.getWindowBounds', { windowId });
        const inner = await evaluate('[window.innerWidth, window.innerHeight]');
        // A page taller than the window is shown at the next browser zoom step (90, 80, 75, 67 percent) until it fits.
        const measure = async () => {
          const content = await evaluate('Math.ceil(document.documentElement.getBoundingClientRect().height)');
          const bottom = until ? await evaluate(`Math.ceil(document.querySelector(${JSON.stringify(until)}).getBoundingClientRect().bottom + window.scrollY)`) : content;
          return { content, need: Math.min(content, bottom + (until ? margin : 0)) };
        };
        let measured = await measure();
        for (const zoom of [0.9, 0.8, 0.75, 0.67]) {
          if (measured.need <= 940) break;
          await evaluate(`document.documentElement.style.zoom = '${zoom}'`);
          measured = await measure();
        }
        const { content } = measured;
        const tall = height ?? Math.min(Math.max(measured.need, 300), 940);
        await send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal', left: 0, top: 0, width: bounds.width + width - inner[0], height: bounds.height + tall - inner[1] } });
        await send('Page.bringToFront');
        await pause(500);
        execFileSync('powershell', ['-NoProfile', '-File', fileURLToPath(new URL('./windows/capture-window.ps1', import.meta.url)), '-ProcId', String(child.pid), '-Out', file]);
        await evaluate("document.documentElement.style.zoom = ''");
        console.log(path.basename(file), `window capture (content ${content})`);
        return { width, height: tall, content };
      }
      await send('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: false });
      const content = await evaluate('Math.ceil(document.documentElement.scrollHeight)');
      const bottom = until ? await evaluate(`Math.ceil(document.querySelector(${JSON.stringify(until)}).getBoundingClientRect().bottom + window.scrollY)`) : content;
      const tall = height ?? Math.min(Math.max(Math.min(content, bottom + (until ? margin : 0)), 300), maxHeight);
      await send('Emulation.setDeviceMetricsOverride', { width, height: tall, deviceScaleFactor: 1, mobile: false });
      await pause(150);
      const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height: tall, scale: 1 } });
      writeFileSync(file, Buffer.from(data, 'base64'));
      console.log(path.basename(file), `${width}x${tall} (content ${content})`);
      return { width, height: tall, content };
    },
  };
  return {
    page,
    async close() {
      ws.close();
      child.kill();
    },
  };
};
