import { PHASES, bytesByType, summary } from './analyze-har.js';
import { T } from './i18n.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

export const bars = (rows, unit) => {
  const max = Math.max(...rows.map((r) => r[1])) || 1;
  const body = rows
    .map(([label, v], i) => {
      const w = Math.round((v / max) * 380);
      return `<text x="190" y="${i * 30 + 20}" text-anchor="end" font-size="13">${esc(label)}</text><rect x="200" y="${i * 30 + 6}" width="${w}" height="20" fill="#2563eb"/><text x="${206 + w}" y="${i * 30 + 21}" font-size="13">${v} ${unit}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="${rows.length * 30 + 6}" font-family="Arial, sans-serif" fill="#1c1f2e">${body}</svg>\n`;
};

const byValue = (rows) => rows.sort((a, b) => b[1] - a[1]);

export const figures = (har, slow, lang = 'ru') => {
  const f = T[lang].figures;
  const s = summary(har);
  const t = summary(slow);
  const first = har.log.entries[0].timings;
  return {
    'fig-1-types.svg': bars(byValue(Object.entries(s.types)), f.pieces),
    'fig-2-bytes.svg': bars(byValue(Object.entries(bytesByType(har.log.entries)).map(([k, v]) => [k, Number((v / 1048576).toFixed(2))])), f.mb),
    'fig-3-timing.svg': bars(
      Object.entries(PHASES)
        .filter(([k]) => first[k] > 0)
        .map(([k, label]) => [label, Math.round(first[k])]),
      T[lang].ms,
    ),
    'fig-4-load.svg': bars(
      [
        [f.onload, s.onLoad],
        [f.onload3g, t.onLoad],
        [f.ttfb, Math.round(s.ttfb)],
        [f.ttfb3g, Math.round(t.ttfb)],
      ],
      T[lang].ms,
    ),
  };
};
