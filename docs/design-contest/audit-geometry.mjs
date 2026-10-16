// Usage: node audit-geometry.mjs <base url> <out.json>
// Measures the real rendered page against the design rules: type scale, spacing scale, radii, font families,
// target sizes, line height and the proportions of the main two-column layouts (golden ratio 1 : 1.618).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('E:/DSLKit-Project/.claude/worktrees/part2-ws-work-ee9b7b/part-2/lab-07-websocket/');
const puppeteer = require('puppeteer-core');
const base = process.argv[2];
const out = process.argv[3];
const pages = ['index.html', 'en/index.html', 'privacy.html', 'thanks.html', 'app/welcome.html', 'app/dashboard.html', 'app/settings.html', 'app/editor.html', 'en/app/editor.html', 'errors/404.html', 'errors/500.html'];
const views = [['desktop', 1280, 800], ['tablet', 768, 1024], ['mobile', 375, 812]];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
const result = [];
for (const pg of pages) for (const [view, w, h] of views) {
  await page.setViewport({ width: w, height: h });
  await page.goto(`${base}/${pg}`, { waitUntil: 'networkidle0' });
  const data = await page.evaluate(() => {
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const rem = (px) => Math.round((px / root) * 1000) / 1000;
    const shown = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const all = [...document.body.querySelectorAll('*')].filter(shown);
    const count = (map, key, el) => { const k = String(key); (map[k] ||= { n: 0, ex: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') }).n++; };
    const fonts = {}, sizes = {}, spaces = {}, radii = {}, lines = {};
    for (const el of all) {
      const s = getComputedStyle(el);
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (hasText) { count(fonts, s.fontFamily.split(',')[0].replace(/["']/g, '').trim(), el); count(sizes, rem(parseFloat(s.fontSize)), el); }
      for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'rowGap', 'columnGap']) {
        const v = parseFloat(s[p]); if (v > 0) count(spaces, rem(v), el);
      }
      const br = parseFloat(s.borderTopLeftRadius); if (br > 0) count(radii, br > 500 ? 'pill' : rem(br), el);
    }
    const body = getComputedStyle(document.body);
    const lineRatio = Math.round((parseFloat(body.lineHeight) / parseFloat(body.fontSize)) * 1000) / 1000;
    const targets = [...document.querySelectorAll('a[href], button, input:not([type=hidden]):not(.theme__input):not(.burger__input), select, textarea, summary')].filter(shown).map((el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), t: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 24) }; });
    const small = targets.filter((t) => Math.min(t.w, t.h) < 44);
    // two-column layouts: any grid with exactly two tracks
    const grids = [];
    for (const el of all) {
      const s = getComputedStyle(el);
      if (s.display === 'grid') {
        const cols = s.gridTemplateColumns.split(' ').map(parseFloat).filter((x) => x > 0);
        if (cols.length === 2 && el.getBoundingClientRect().width > 500) grids.push({ sel: el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0], a: Math.round(cols[0]), b: Math.round(cols[1]), ratio: Math.round((Math.max(...cols) / Math.min(...cols)) * 1000) / 1000 });
      }
    }
    return { root, fonts, sizes, spaces, radii, lineRatio, targets: targets.length, small: small.length, smallEx: small.slice(0, 6), grids, h1: document.querySelectorAll('h1').length, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });
  result.push({ page: pg, view, ...data });
}
await browser.close();
writeFileSync(out, JSON.stringify(result, null, 1));
console.log('saved', result.length, 'measurements');
