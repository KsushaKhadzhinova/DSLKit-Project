// Automated checks on the candidate SVGs: colours, contrast, grayscale, colour-blind distance, thinnest stroke at 16 px.
import { readFileSync, writeFileSync } from 'node:fs';
const L = new URL('../', import.meta.url).pathname.slice(1);
const C = { 'K (mark-k)': ['final-v4/mark-k-light.svg', 'final-v4/mark-k-dark.svg'], 'DSL (mark-dsl)': ['final-v4/mark-dsl-light.svg', 'final-v4/mark-dsl-dark.svg'], 'Без букв (mark-blocks)': ['final-v4/mark-blocks-light.svg', 'final-v4/mark-blocks-dark.svg'], 'Кот-маскот': ['final-v4/mascot-light.svg', 'final-v4/mascot-dark.svg'], 'Оригами-кот': ['final-v3-origami-cat/head-light.svg', 'final-v3-origami-cat/head-dark.svg'], 'Вертушка-плитка (старая палитра)': ['final-v2/pinwheel-tile/mark-light.svg', 'final-v2/pinwheel-tile/mark-dark.svg'] };
const lum = h => { const v = [1, 3, 5].map(i => { const x = parseInt(h.substr(i, 2), 16) / 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4 }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2] };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) };
const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
const deut = h => { const c = rgb(h); return [.625 * c[0] + .375 * c[1], .7 * c[0] + .3 * c[1], .3 * c[1] + .7 * c[2]] };
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const cols = s => [...new Set((s.match(/#[0-9a-fA-F]{6}\b/g) || []).map(x => x.toLowerCase()))];
const rows = [];
for (const [name, [lt, dk]] of Object.entries(C)) {
  const s = readFileSync(L + lt, 'utf8'), d = readFileSync(L + dk, 'utf8');
  const lc = cols(s).filter(c => c !== '#ffffff' && c !== '#000000' && c !== '#1c1f2e' || true);
  const noWhite = cols(s).filter(c => !['#ffffff', '#000000'].includes(c));
  const bgL = '#f8f9fc', bgD = '#1e1e2e';
  const minL = Math.min(...noWhite.map(c => cr(c, bgL))), minD = Math.min(...cols(d).filter(c => !['#ffffff', '#000000', '#1e1e2e'].includes(c)).map(c => cr(c, bgD)));
  const two = noWhite.slice(0, 2); const gd = two.length > 1 ? Math.abs(lum(two[0]) - lum(two[1])) : null; const dd = two.length > 1 ? dist(deut(two[0]), deut(two[1])) : null;
  const strokes = [...s.matchAll(/stroke-width="([\d.]+)"/g)].map(m => +m[1]); const vb = (s.match(/viewBox="0 0 (\d+)/) || [0, 64])[1];
  const thin = strokes.length ? Math.min(...strokes) * 16 / vb : null;
  rows.push({ name, n: noWhite.length, minL, minD, gd, dd, thin });
}
const f = (x, d = 1) => x == null ? '—' : x.toFixed(d);
const md = `# Автоматическая проверка кандидатов\n\nСгенерировано \`auto-validate.mjs\`. Порог: контраст ≥ 3:1, разница яркости цветов в серой шкале ≥ 0,12, расстояние при дейтеранопии ≥ 70, тонкий штрих на 16 px ≥ 1,5 px.\n\n| Кандидат | Цветов | Контраст на светлом (мин.) | на тёмном (мин.) | Яркость цветов (серая шкала) | Дейтеранопия | Тонкий штрих на 16 px |\n|---|---|---|---|---|---|---|\n` + rows.map(r => `| ${r.name} | ${r.n} | ${f(r.minL)}:1 ${r.minL >= 3 ? 'OK' : 'мало'} | ${f(r.minD)}:1 ${r.minD >= 3 ? 'OK' : 'мало'} | ${f(r.gd, 2)} ${r.gd == null ? '' : r.gd >= .12 ? 'OK' : 'акцент сливается'} | ${f(r.dd, 0)} ${r.dd == null ? '' : r.dd >= 70 ? 'OK' : 'близко'} | ${f(r.thin)} px ${r.thin == null ? '' : r.thin >= 1.5 ? 'OK' : 'тонко'} |`).join('\n') + '\n';
writeFileSync(new URL('AUTO-REPORT.md', import.meta.url).pathname.slice(1), md); console.log(md);
