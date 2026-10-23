// Usage: node metrics.mjs <url-or-file> [label]
// Measures objective interface metrics of a page at desktop, tablet and mobile, and prints a JSON line per viewport.
// Real measurements from the DOM, not opinions: they feed the A/B test report.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(process.env.LAB7_DIR ?? new URL('../../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');
const target = process.argv[2];
const label = process.argv[3] || target;
const url = /^https?:|^file:/.test(target) ? target : 'file:///' + path.resolve(target).replace(/\\/g, '/');
const views = [['desktop', 1280, 800], ['tablet', 768, 1024], ['mobile', 375, 812]];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
const rows = [];
for (const [name, w, h] of views) {
  await page.setViewport({ width: w, height: h });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.goto(url, { waitUntil: 'networkidle0' });
  const m = await page.evaluate((vh) => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < vh && el.closest('[hidden]') === null && !(r.width <= 1 && r.height <= 1);
    };
    const interactive = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=switch], [tabindex]:not([tabindex="-1"])')].filter(visible);
    const sizes = interactive.map((el) => el.getBoundingClientRect());
    const small = sizes.filter((r) => Math.min(r.width, r.height) < 44).length;
    const tooSmall24 = sizes.filter((r) => Math.min(r.width, r.height) < 24).length;
    const buttonStyle = (el) => {
      const s = getComputedStyle(el);
      return [s.backgroundColor, s.borderTopWidth, s.color, Math.round(parseFloat(s.height)), s.borderRadius].join('|');
    };
    const buttons = interactive.filter((el) => el.matches('button, a.button, [role=button], summary'));
    const styles = new Set(buttons.map(buttonStyle));
    const primary = buttons.filter((el) => getComputedStyle(el).backgroundColor === 'rgb(37, 99, 235)').length;
    const header = document.querySelector('header, .editor-toolbar, .top, [role=banner]');
    const headerControls = header ? interactive.filter((el) => header.contains(el)).length : null;
    const fonts = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n.textContent.trim() && n.parentElement && visible(n.parentElement)) fonts.push(parseFloat(getComputedStyle(n.parentElement).fontSize));
    }
    const noName = interactive.filter((el) => !(el.getAttribute('aria-label') || el.textContent.trim() || el.getAttribute('title') || el.labels?.length)).length;
    const errMentions = (document.body.innerText.match(/ошиб|error/gi) || []).length;
    return {
      interactiveVisible: interactive.length,
      headerControls,
      buttonStyles: styles.size,
      primaryButtons: primary,
      targetsBelow44: small,
      targetsBelow24: tooSmall24,
      minFontPx: fonts.length ? Math.min(...fonts) : null,
      textBelow14px: fonts.filter((f) => f < 14).length,
      unnamedControls: noName,
      errorWordMentions: errMentions,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  }, h);
  rows.push({ label, view: name, ...m });
}
await browser.close();
for (const r of rows) console.log(JSON.stringify(r));
