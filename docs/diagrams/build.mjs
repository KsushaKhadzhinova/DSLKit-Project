// Stage 2: every diagram is typed into the real editor of the service (the own engine, in the browser), the drawing is taken from the page
// and checked there: the same code, the same sanitising, the same canvas that a user sees.
// Usage:
//   node tools/serve.js site 5188 &
//   PUPPETEER_DIR=<folder with node_modules/puppeteer-core> node docs/diagrams/build.mjs [id,id]
// Writes dsl/<lang>/, svg/<lang>/, png/<lang>/ and report.json next to this file.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { DIAGRAMS } from './diagrams.mjs';

const require = createRequire(process.env.PUPPETEER_DIR ?? new URL('../../part-2/lab-07-websocket/', import.meta.url));
const puppeteer = require('puppeteer-core');

const origin = process.env.SITE ?? 'http://localhost:5188';
const chrome = process.env.CHROME ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const only = process.argv[2] ? new Set(process.argv[2].split(',')) : null;
const here = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const PAGES = { ru: '/app/editor.html', en: '/en/app/editor.html' };

const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
const report = [];

// Everything that is measured inside the page, in one function so the numbers come from the real layout.
const measure = () => {
  const svg = document.querySelector('.canvas__remote svg');
  if (!svg) return { drawn: false };
  // Screen rectangles, so the transforms of groups are counted: the numbers are what the user sees.
  const frame = svg.getBoundingClientRect();
  const width = frame.width;
  const height = frame.height;
  const texts = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim() !== '');
  const boxes = texts.map((t) => {
    const b = t.getBoundingClientRect();
    return { text: t.textContent.trim(), x: b.left - frame.left, y: b.top - frame.top, w: b.width, h: b.height };
  });
  const outside = boxes.filter((b) => b.x < -2 || b.y < -2 || b.x + b.w > width + 2 || b.y + b.h > height + 2).map((b) => b.text);
  const overlaps = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const c = boxes[j];
      const w = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
      const h = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
      if (w > 1 && h > 1 && (w * h) / Math.min(a.w * a.h, c.w * c.h) > 0.2) overlaps.push([a.text, c.text]);
    }
  }
  // A label that is written inside a shape must lie wholly inside its outline (the four corners of the text are tested against the real outline).
  // A label that lies wholly outside is a caption under a small symbol and is allowed.
  const spill = [];
  svg.querySelectorAll('g.notation__node').forEach((group) => {
    // The body of the symbol: a front rectangle (also of a 3-D box), else an ellipse, a circle or a polygon, a path last.
    const parts = [...group.children];
    const shape = ['rect', 'ellipse', 'circle', 'polygon', 'path'].map((name) => parts.find((child) => child.localName === name)).find(Boolean);
    if (!shape || !shape.isPointInFill) return;
    const toSvg = svg.getScreenCTM().inverse().multiply(shape.getScreenCTM());
    const local = shape.getScreenCTM().inverse().multiply(svg.getScreenCTM());
    void toSvg;
    group.querySelectorAll('text').forEach((label) => {
      // The tiny bold tag "ref" of an interaction frame is part of the symbol, not a label of its body.
      if (label.textContent.trim() === '' || Number(label.getAttribute('font-size')) < 11) return;
      const b = label.getBoundingClientRect();
      const corners = [
        [b.left, b.top],
        [b.right, b.top],
        [b.left, b.bottom],
        [b.right, b.bottom],
      ].map(([x, y]) => {
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        const screen = shape.getScreenCTM().inverse();
        const p = new DOMPoint(x, y).matrixTransform(screen);
        void local;
        return shape.isPointInFill(p);
      });
      const inside = corners.filter(Boolean).length;
      // The centre of the label decides whether it is a caption (centre outside the shape, allowed) or a label of the body (centre inside, all corners must be inside).
      const centre = new DOMPoint((b.left + b.right) / 2, (b.top + b.bottom) / 2).matrixTransform(shape.getScreenCTM().inverse());
      if (shape.isPointInFill(centre) && inside < 4) spill.push(label.textContent.trim().slice(0, 40));
    });
  });
  // Labels must not be hidden behind a node, and a caption must not touch the symbol it belongs to.
  // The test uses the real outline: the four corners and the centre of the label are asked whether they lie in the fill of the shape.
  const bodies = [...svg.querySelectorAll('g.notation__node')]
    .map((group) => ({
      group,
      body: ['rect', 'ellipse', 'circle', 'polygon', 'path'].map((name) => [...group.children].find((child) => child.localName === name)).find(Boolean),
    }))
    .filter(({ body }) => body && body.isPointInFill);
  const covered = [];
  texts.forEach((label) => {
    if (Number(label.getAttribute('font-size')) < 11) return;
    const r = label.getBoundingClientRect();
    const own = label.closest('g.notation__node');
    const points = [
      [r.left, r.top],
      [r.right, r.top],
      [r.left, r.bottom],
      [r.right, r.bottom],
      [(r.left + r.right) / 2, (r.top + r.bottom) / 2],
    ];
    bodies.forEach(({ group, body }) => {
      const inverse = body.getScreenCTM().inverse();
      const hits = points.map(([x, y]) => body.isPointInFill(new DOMPoint(x, y).matrixTransform(inverse)));
      if (!own && hits.some(Boolean)) covered.push(label.textContent.trim().slice(0, 40));
      if (own === group && !hits[4] && hits.some(Boolean)) covered.push(label.textContent.trim().slice(0, 40));
    });
  });
  const tags = {};
  svg.querySelectorAll('*').forEach((n) => (tags[n.localName] = (tags[n.localName] ?? 0) + 1));
  const bad = [...svg.querySelectorAll('*')].flatMap((n) =>
    [...n.attributes].filter((a) => /NaN|undefined|Infinity/.test(a.value)).map((a) => `${n.localName}@${a.name}=${a.value.slice(0, 30)}`),
  );
  const problems = [...document.querySelectorAll('.problems__item, .problems li, [data-problem]')].map((n) => n.textContent.trim().slice(0, 120));
  return {
    drawn: true,
    width,
    height,
    textCount: texts.length,
    allText: svg.textContent.replace(/\s+/g, ''),
    outside,
    overlaps,
    spill,
    covered,
    tags,
    bad,
    problems,
    svg: new XMLSerializer().serializeToString(svg),
  };
};

for (const lang of ['ru', 'en']) {
  const L = (ru, en) => (lang === 'ru' ? ru : en);
  for (const dir of ['dsl', 'svg', 'png']) mkdirSync(`${here}${dir}/${lang}`, { recursive: true });
  for (const d of DIAGRAMS) {
    if (only && !only.has(d.id)) continue;
    const source = d.source(L);
    const name = `${d.id}-${d.notation}`;
    writeFileSync(`${here}dsl/${lang}/${name}.dsl`, `${source}\n`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
    await page.evaluateOnNewDocument((code) => {
      localStorage.setItem('dslkit.settings', JSON.stringify({ 'diagram-engine': 'local' }));
      localStorage.setItem('dslkit.tour-done', 'true');
      localStorage.setItem('dslkit.editor-source', JSON.stringify(code));
    }, source);
    await page.goto(`${origin}${PAGES[lang]}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.canvas__remote svg', { timeout: 8000 }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 400));
    const result = await page.evaluate(measure);
    const shown = await page.evaluate(() => [...document.querySelectorAll('.code__line code')].map((l) => l.textContent).join('\n'));
    const labels = [...new Set([...source.matchAll(/"([^"]+)"/g)].map((m) => m[1].replace(/\s+/g, '')))].filter((t) => t.length > 1);
    const missing = result.drawn ? labels.filter((t) => !result.allText.includes(t)) : labels;
    const entry = {
      lang,
      id: d.id,
      notation: d.notation,
      drawn: result.drawn,
      sourceInEditor: shown.trim() === source.trim(),
      size: result.drawn ? `${Math.round(result.width)}x${Math.round(result.height)}` : null,
      texts: result.textCount,
      outside: result.outside,
      overlaps: result.overlaps,
      spill: result.spill,
      covered: result.covered,
      bad: result.bad,
      missing,
      problems: result.problems,
    };
    report.push(entry);
    if (result.drawn) {
      // The files are exactly what the export menu of the service gives: serializeSvg for SVG and rasterize for PNG.
      const exported = await page.evaluate(async () => {
        const { serializeSvg, rasterize } = await import('/js/utils/exporters.js');
        const svg = document.querySelector('.canvas__remote svg');
        const blob = await rasterize({ svg, window, scale: 2 });
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        bytes.forEach((b) => (binary += String.fromCharCode(b)));
        return { svg: serializeSvg(svg, window), png: btoa(binary) };
      });
      writeFileSync(`${here}svg/${lang}/${name}.svg`, `${exported.svg}\n`);
      writeFileSync(`${here}png/${lang}/${name}.png`, Buffer.from(exported.png, 'base64'));
      // The picture of the canvas as the user sees it in the editor, for comparison only.
      mkdirSync(`${here}view/${lang}`, { recursive: true });
      await (await page.$('.canvas__remote svg')).screenshot({ path: `${here}view/${lang}/${name}.png` });
    }
    await page.close();
    const ok =
      entry.drawn &&
      entry.sourceInEditor &&
      !entry.outside.length &&
      !entry.overlaps.length &&
      !entry.spill.length &&
      !entry.covered.length &&
      !entry.bad.length &&
      !entry.missing.length;
    console.log(
      `${lang} ${d.id} ${d.notation.padEnd(18)} ${ok ? 'ok     ' : 'PROBLEM'} ${entry.size ?? '-'} texts=${entry.texts}${entry.outside.length ? ` outside=${JSON.stringify(entry.outside)}` : ''}${entry.covered.length ? ` covered=${JSON.stringify(entry.covered)}` : ''}${entry.spill.length ? ` spill=${JSON.stringify(entry.spill)}` : ''}${entry.overlaps.length ? ` overlaps=${JSON.stringify(entry.overlaps.slice(0, 3))}` : ''}${entry.missing.length ? ` missing=${JSON.stringify(entry.missing)}` : ''}${entry.bad.length ? ` bad=${JSON.stringify(entry.bad)}` : ''}${entry.sourceInEditor ? '' : ' source-differs'}`,
    );
  }
}
await browser.close();
writeFileSync(`${here}report.json`, `${JSON.stringify(report, null, 2)}\n`);
const failed = report.filter(
  (e) => !e.drawn || !e.sourceInEditor || e.outside.length || e.overlaps.length || e.spill.length || e.covered.length || e.bad.length || e.missing.length,
);
console.log(failed.length === 0 ? `ALL ${report.length} OK` : `${failed.length} of ${report.length} with problems`);
