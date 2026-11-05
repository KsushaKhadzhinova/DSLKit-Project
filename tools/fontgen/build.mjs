// Builds Kubik Sans and Kubik Mono (Regular and Bold) from the skeleton drawings: TTF and WOFF2 files in ./out and a report.
// Usage: node tools/fontgen/build.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import opentype from 'opentype.js';
import { Font, woff2 } from 'fonteditor-core';
import { area, outline, simplify } from './geom.mjs';
import { GLYPH_TABLE, METRICS, frame } from './glyphs.mjs';

const OUT = process.argv[2] ?? new URL('./out/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
mkdirSync(OUT, { recursive: true });

const VARIANTS = [
  { family: 'Kubik Sans', style: 'Regular', weight: 92, mono: false, file: 'KubikSans-Regular' },
  { family: 'Kubik Sans', style: 'Bold', weight: 150, mono: false, file: 'KubikSans-Bold' },
  { family: 'Kubik Mono', style: 'Regular', weight: 92, mono: true, file: 'KubikMono-Regular' },
  { family: 'Kubik Mono', style: 'Bold', weight: 150, mono: true, file: 'KubikMono-Bold' },
];

const SIDE = { s: 58, r: 46, d: 26, o: 42, x: 0 };
const MONO_ADVANCE = 600;
const MONO_BOX = 520;
const PUNCTUATION = /[^\p{L}\p{N}]/u;

// Orients the outer rings clockwise and the holes counter-clockwise, as TrueType wants.
const toRings = (multi, shift) => {
  const rings = [];
  for (const polygon of multi) {
    polygon.forEach((ring, index) => {
      let pts = simplify(ring).map(([x, y]) => [Math.round((x + shift) * 10) / 10, Math.round(y * 10) / 10]);
      if (pts.length < 3) return;
      const a = area([...pts, pts[0]]);
      const wantClockwise = index === 0;
      if (wantClockwise ? a > 0 : a < 0) pts = pts.reverse();
      rings.push(pts);
    });
  }
  return rings;
};

const drawGlyph = (ch, spec, variant) => {
  const bold = (variant.weight - 92) * 0.9;
  const natural = spec.bw + (spec.bw > 0 ? bold * (spec.kind === 'x' ? 0 : 1) : 0);
  const mono = variant.mono;
  const wide = mono && !PUNCTUATION.test(ch);
  const bw = wide ? MONO_BOX : Math.min(natural, mono ? MONO_ADVANCE - 30 : natural);
  const c = frame(bw, variant.weight, mono);
  const drawing = spec.draw(c);
  const multi = outline(drawing.strokes, drawing.fills, variant.weight);
  const sb = SIDE[spec.kind] ?? 50;
  let advance;
  let shift;
  if (mono) {
    advance = MONO_ADVANCE;
    shift = (MONO_ADVANCE - bw) / 2;
  } else {
    shift = sb + (variant.weight - 92) * 0.12;
    advance = spec.kind === 'x' ? natural : bw + 2 * shift;
  }
  return { rings: toRings(multi, shift), advance: Math.round(advance), shift };
};

const buildFont = (variant) => {
  const glyphs = [];
  const notdef = new opentype.Path();
  notdef.moveTo(60, 0);
  notdef.lineTo(60, 700);
  notdef.lineTo(460, 700);
  notdef.lineTo(460, 0);
  notdef.close();
  notdef.moveTo(120, 60);
  notdef.lineTo(400, 60);
  notdef.lineTo(400, 640);
  notdef.lineTo(120, 640);
  notdef.close();
  glyphs.push(new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 520, path: notdef }));
  const report = [];
  for (const [ch, spec] of Object.entries(GLYPH_TABLE)) {
    if (!spec.draw) continue;
    const { rings, advance } = drawGlyph(ch, spec, variant);
    const path = new opentype.Path();
    for (const ring of rings) {
      path.moveTo(ring[0][0], ring[0][1]);
      for (let i = 1; i < ring.length; i += 1) path.lineTo(ring[i][0], ring[i][1]);
      path.close();
    }
    const code = ch.codePointAt(0);
    glyphs.push(new opentype.Glyph({ name: `uni${code.toString(16).toUpperCase().padStart(4, '0')}`, unicode: code, advanceWidth: advance, path }));
    report.push({ ch, advance, points: rings.reduce((n, r) => n + r.length, 0), rings: rings.length });
  }
  const font = new opentype.Font({
    familyName: variant.family,
    styleName: variant.style,
    unitsPerEm: METRICS.unitsPerEm,
    ascender: 880,
    descender: -240,
    glyphs,
    designer: 'DSLKit',
    description: `${variant.family} ${variant.style}: an original typeface of the DSLKit project, drawn from block-like skeletons.`,
    license: 'MIT, the same as the DSLKit project.',
    copyright: 'Copyright (c) 2026 KsushaKhadzhinova',
  });
  return { font, report };
};

await woff2.init();
const summary = [];
for (const variant of VARIANTS) {
  const started = Date.now();
  const { font, report } = buildFont(variant);
  const otf = font.toArrayBuffer();
  const converted = Font.create(Buffer.from(otf), { type: 'otf' });
  const ttf = converted.write({ type: 'ttf', hinting: false });
  const packed = converted.write({ type: 'woff2' });
  writeFileSync(`${OUT}${variant.file}.ttf`, Buffer.from(ttf));
  writeFileSync(`${OUT}${variant.file}.woff2`, Buffer.from(packed));
  summary.push({ file: variant.file, glyphs: report.length, ttf: ttf.byteLength ?? ttf.length, woff2: packed.byteLength ?? packed.length, ms: Date.now() - started });
  writeFileSync(`${OUT}${variant.file}.report.json`, `${JSON.stringify(report, null, 1)}\n`);
  console.log(variant.file, summary.at(-1));
}
writeFileSync(`${OUT}summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
