// Skeleton drawings of Kubik: Latin, Cyrillic, digits and punctuation.
// Every glyph is drawn as strokes along a skeleton, the stroke width gives the weight. Round letters are rounded rectangles
// (like the block of the logo), terminals are round, dots are small rounded squares.
// A drawing function gets the frame c: the skeleton lies inside x0..x1 horizontally and between b (baseline) and the given tops vertically.
import { arc, box, rounded } from './geom.mjs';

export const METRICS = { unitsPerEm: 1000, cap: 700, xh: 500, asc: 740, desc: 200 };

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const ln = (a, b) => [a, b];

// Everything a glyph needs about the weight, the width and the mode (text or monospaced).
export const frame = (bw, weight, mono) => {
  const T = weight / 2;
  const x0 = T;
  const x1 = bw - T;
  const f = {
    T,
    w: weight,
    mono,
    bw,
    x0,
    x1,
    xm: bw / 2,
    b: T,
    xh: METRICS.xh - T,
    cap: METRICS.cap - T,
    asc: METRICS.asc - T,
    ds: -METRICS.desc + T,
    r: Math.min(150, (x1 - x0) * 0.4),
  };
  f.rr = Math.min(f.r, 120);
  return f;
};

const shape = (strokes = [], fills = []) => ({ strokes, fills });
const dotShape = (cx, cy, size) => [[cx - size / 2, cy - size / 2], [cx + size / 2, cy - size / 2], [cx + size / 2, cy + size / 2], [cx - size / 2, cy + size / 2]];
const roundSquare = (cx, cy, size, r) => box(cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2, r);

// ---------- forms shared by capitals and small letters (top is the height of the letter) ----------

// A round letter: a rounded rectangle.
const oval = (c, top) => shape([box(c.x0, c.b, c.x1, top, c.r)]);
const openBowl = (c, top, gapTop = 0.28, gapBottom = 0.28) => {
  const h = top - c.b;
  return shape([rounded([[c.x1, top - h * gapTop], [c.x1, top], [c.x0, top], [c.x0, c.b], [c.x1, c.b], [c.x1, c.b + h * gapBottom]], c.r)]);
};
const stem = (x, y0, y1) => [ln([x, y0], [x, y1])];
const bar = (y, x0, x1) => [ln([x0, y], [x1, y])];

// B, В: a stem and two bowls.
const bee = (c, top) => {
  const mid = c.b + (top - c.b) * 0.5;
  return shape([
    ln([c.x0, c.b], [c.x0, top]),
    rounded([[c.x0, top], [c.x1 - 20, top], [c.x1 - 20, mid], [c.x0, mid]], [0, c.rr, c.rr, 0]),
    rounded([[c.x0, mid], [c.x1, mid], [c.x1, c.b], [c.x0, c.b]], [0, c.rr, c.rr, 0]),
  ]);
};
// Б, б: a stem with a top bar and the lower bowl.
const be = (c, top, tall) => {
  const mid = c.b + (top - c.b) * 0.5;
  return shape([ln([c.x0, c.b], [c.x0, tall]), ln([c.x0, tall], [c.x1, tall]), rounded([[c.x0, mid], [c.x1, mid], [c.x1, c.b], [c.x0, c.b]], [0, c.rr, c.rr, 0])]);
};
// Г, г.
const ge = (c, top) => shape([rounded([[c.x0, c.b], [c.x0, top], [c.x1, top]], c.rr)]);
// Д, д: an n-shaped body, a bottom bar and two small feet.
const de = (c, top) => {
  const a = c.x0 + 50;
  const z = c.x1 - 50;
  return shape([rounded([[a, c.b], [a, top], [z, top], [z, c.b]], [0, c.rr * 0.6, c.rr * 0.6, 0]), ln([c.x0, c.b], [c.x1, c.b]), ln([c.x0, c.b], [c.x0, c.b + 95]), ln([c.x1, c.b], [c.x1, c.b + 95])]);
};
// E, Е.
const ee = (c, top) => shape([ln([c.x0, c.b], [c.x0, top]), ln([c.x0, top], [c.x1, top]), ln([c.x0, c.b + (top - c.b) * 0.5], [c.x1 - 30, c.b + (top - c.b) * 0.5]), ln([c.x0, c.b], [c.x1, c.b])]);
// Ж, ж.
const zhe = (c, top) => {
  const mid = c.b + (top - c.b) * 0.5;
  return shape([ln([c.xm, c.b], [c.xm, top]), ln([c.x0, top], [c.xm, mid]), ln([c.x1, top], [c.xm, mid]), ln([c.x0, c.b], [c.xm, mid]), ln([c.x1, c.b], [c.xm, mid])]);
};
// З, з, and the numeral 3: two bowls open to the left.
const ze = (c, top) => {
  const mid = c.b + (top - c.b) * 0.5;
  return shape([
    rounded([[c.x0 + 10, top], [c.x1, top], [c.x1, mid], [c.xm - 10, mid]], [0, c.rr, c.rr, 0]),
    rounded([[c.xm - 10, mid], [c.x1, mid], [c.x1, c.b], [c.x0 + 10, c.b]], [0, c.rr, c.rr, 0]),
  ]);
};
// И, и.
const i = (c, top) => shape([ln([c.x0, c.b], [c.x0, top]), ln([c.x1, c.b], [c.x1, top]), ln([c.x0, c.b], [c.x1, top])]);
// К, к, K, k.
const ka = (c, top) => {
  const mid = c.b + (top - c.b) * 0.38;
  const hinge = lerp([c.x0, mid], [c.x1, top], 0.5);
  return shape([ln([c.x0, c.b], [c.x0, top]), ln([c.x0, mid], [c.x1, top]), ln(hinge, [c.x1, c.b])]);
};
// Л, л.
const el = (c, top) => shape([rounded([[c.x0, c.b], [c.x0 + 105, top], [c.x1, top], [c.x1, c.b]], [0, 0, c.rr * 0.6, 0])]);
// М, м.
const em = (c, top) => shape([rounded([[c.x0, c.b], [c.x0, top], [c.xm, c.b + (top - c.b) * 0.25], [c.x1, top], [c.x1, c.b]], 0)]);
// Н, н.
const en = (c, top) => shape([ln([c.x0, c.b], [c.x0, top]), ln([c.x1, c.b], [c.x1, top]), ln([c.x0, c.b + (top - c.b) * 0.5], [c.x1, c.b + (top - c.b) * 0.5])]);
// П, п.
const pe = (c, top) => shape([rounded([[c.x0, c.b], [c.x0, top], [c.x1, top], [c.x1, c.b]], [0, c.rr * 0.7, c.rr * 0.7, 0])]);
// Р, р: the bowl is drawn from the top down to the given low point.
const er = (c, top, low) => shape([ln([c.x0, c.b], [c.x0, top]), rounded([[c.x0, top], [c.x1, top], [c.x1, low], [c.x0, low]], [0, c.r, c.r, 0])]);
const bowlStem = (c, top, low) => shape([ln([c.x0, top], [c.x0, c.ds]), rounded([[c.x0, top], [c.x1, top], [c.x1, low], [c.x0, low]], [0, c.r, c.r, 0])]);
// С, с.
const es = (c, top) => openBowl(c, top);
// Т, т.
const te = (c, top) => shape([ln([c.x0, top], [c.x1, top]), ln([c.xm, top], [c.xm, c.b])]);
// Ф, ф.
const ef = (c, top) => {
  const h = top - c.b;
  return shape([ln([c.xm, top], [c.xm, c.b]), box(c.x0, c.b + h * 0.18, c.x1, top - h * 0.18, c.r)]);
};
// Х, х.
const ha = (c, top) => shape([ln([c.x0, c.b], [c.x1, top]), ln([c.x0, top], [c.x1, c.b])]);
// Ц, ц, Щ, щ: the tail goes under the baseline.
const tse = (c, top) => shape([rounded([[c.x0, top], [c.x0, c.b], [c.x1, c.b], [c.x1, top]], [0, c.rr * 0.7, c.rr * 0.7, 0]), ln([c.x1, c.b], [c.x1, c.ds + 40])]);
// Ч, ч.
const che = (c, top) => {
  const mid = c.b + (top - c.b) * 0.46;
  return shape([rounded([[c.x0, top], [c.x0, mid], [c.x1, mid]], c.rr), ln([c.x1, top], [c.x1, c.b])]);
};
// Ш, ш, Щ, щ.
const sha = (c, top, tail) => {
  const a = [rounded([[c.x0, top], [c.x0, c.b], [c.x1, c.b], [c.x1, top]], [0, c.rr * 0.6, c.rr * 0.6, 0]), ln([c.xm, top], [c.xm, c.b])];
  if (tail) a.push(ln([c.x1, c.b], [c.x1, c.ds + 40]));
  return shape(a);
};
// Ъ, ъ: a tick at the top and the bowl.
const hard = (c, top, low) => shape([ln([c.x0, top], [c.x0 + 95, top]), ln([c.x0 + 95, top], [c.x0 + 95, c.b]), rounded([[c.x0 + 95, low], [c.x1, low], [c.x1, c.b], [c.x0 + 95, c.b]], [0, c.rr, c.rr, 0])]);
// Ь, ь, Ы, ы.
const soft = (c, top, low) => shape([ln([c.x0, top], [c.x0, c.b]), rounded([[c.x0, low], [c.x1, low], [c.x1, c.b], [c.x0, c.b]], [0, c.rr, c.rr, 0])]);
const yeri = (c, top, low) => {
  const wl = c.x1 - 105;
  return shape([ln([c.x0, top], [c.x0, c.b]), rounded([[c.x0, low], [wl, low], [wl, c.b], [c.x0, c.b]], [0, c.rr, c.rr, 0]), ln([c.x1, top], [c.x1, c.b])]);
};
// Э, э.
const reverseE = (c, top) => {
  const mid = c.b + (top - c.b) * 0.5;
  return shape([rounded([[c.x0, top - (top - c.b) * 0.26], [c.x0, top], [c.x1, top], [c.x1, c.b], [c.x0, c.b], [c.x0, c.b + (top - c.b) * 0.26]], c.r), ln([c.xm - 30, mid], [c.x1, mid])]);
};
// Ю, ю.
const yu = (c, top) => {
  const mid = c.b + (top - c.b) * 0.5;
  return shape([ln([c.x0, top], [c.x0, c.b]), ln([c.x0, mid], [c.x0 + 95, mid]), box(c.x0 + 95, c.b, c.x1, top, c.r)]);
};
// Я, я.
const ya = (c, top) => {
  const mid = c.b + (top - c.b) * 0.5;
  return shape([ln([c.x1, c.b], [c.x1, top]), rounded([[c.x1, top], [c.x0, top], [c.x0, mid], [c.x1, mid]], [0, c.r, c.r, 0]), ln([c.xm - 20, mid], [c.x0, c.b])]);
};
// A, V, W, X, Y, Z and so on for the Latin capitals.
const aCap = (c, top) => {
  const left = [c.x0, c.b];
  const apex = [c.xm, top];
  const right = [c.x1, c.b];
  return shape([[left, apex, right], ln(lerp(left, apex, 0.34), lerp(right, apex, 0.34))]);
};
const vee = (c, top) => shape([[[c.x0, top], [c.xm, c.b], [c.x1, top]]]);
const wee = (c, top) => shape([[[c.x0, top], [c.x0 + (c.x1 - c.x0) * 0.25, c.b], [c.xm, c.b + (top - c.b) * 0.6], [c.x1 - (c.x1 - c.x0) * 0.25, c.b], [c.x1, top]]]);
const why = (c, top) => {
  const mid = c.b + (top - c.b) * 0.46;
  return shape([ln([c.x0, top], [c.xm, mid]), ln([c.x1, top], [c.xm, mid]), ln([c.xm, mid], [c.xm, c.b])]);
};
const zee = (c, top) => shape([[[c.x0, top], [c.x1, top], [c.x0, c.b], [c.x1, c.b]]]);
const sCap = (c, top) => {
  const mid = c.b + (top - c.b) * 0.5;
  return shape([rounded([[c.x1, top - (top - c.b) * 0.22], [c.x1, top], [c.x0, top], [c.x0, mid], [c.x1, mid], [c.x1, c.b], [c.x0, c.b], [c.x0, c.b + (top - c.b) * 0.22]], c.r)]);
};
const gee = (c, top) => {
  const mid = c.b + (top - c.b) * 0.5;
  return shape([rounded([[c.x1, top - (top - c.b) * 0.22], [c.x1, top], [c.x0, top], [c.x0, c.b], [c.x1, c.b], [c.x1, mid], [c.xm, mid]], [0, c.r, c.r, c.r, c.r, 0, 0])]);
};
const jay = (c, top, below) => shape([rounded([[c.x1, top], [c.x1, below], [c.x0, below], [c.x0, below + 60]], [0, c.rr + 20, 0, 0])]);
const el_ = (c, top) => shape([rounded([[c.x0, top], [c.x0, c.b], [c.x1, c.b]], c.rr)]);
const queue = (c, top) => shape([box(c.x0, c.b, c.x1, top, c.r), ln([c.xm + 20, c.b + 90], [c.x1 + 30, c.b - 50])]);
const ar = (c, top) => {
  const mid = c.b + (top - c.b) * 0.5;
  return shape([ln([c.x0, c.b], [c.x0, top]), rounded([[c.x0, top], [c.x1, top], [c.x1, mid], [c.x0, mid]], [0, c.r, c.r, 0]), ln([c.xm - 20, mid], [c.x1, c.b])]);
};

// ---------- small letters with their own shapes ----------
const smallA = (c) => shape([box(c.x0, c.b, c.x1, c.xh, c.r), ln([c.x1, c.xh], [c.x1, c.b])]);
const smallB = (c) => shape([ln([c.x0, c.asc], [c.x0, c.b]), box(c.x0, c.b, c.x1, c.xh, c.r)]);
const smallD = (c) => shape([ln([c.x1, c.asc], [c.x1, c.b]), box(c.x0, c.b, c.x1, c.xh, c.r)]);
const smallE = (c) => {
  const mid = c.b + (c.xh - c.b) * 0.5;
  return shape([rounded([[c.x0, mid], [c.x1, mid], [c.x1, c.xh], [c.x0, c.xh], [c.x0, c.b], [c.x1, c.b]], [0, 0, c.r, c.r, c.r, 0])]);
};
const smallF = (c) => shape([rounded([[c.xm - 30, c.b], [c.xm - 30, c.asc], [c.x1, c.asc]], c.rr + 20), ln([c.x0, c.xh], [c.x1 - 40, c.xh])]);
const smallG = (c) => shape([box(c.x0, c.b, c.x1, c.xh, c.r), rounded([[c.x1, c.xh], [c.x1, c.ds], [c.x0, c.ds]], [0, c.rr + 10, 0])]);
const smallH = (c) => shape([ln([c.x0, c.asc], [c.x0, c.b]), rounded([[c.x0, c.xh], [c.x1, c.xh], [c.x1, c.b]], [0, c.r, 0])]);
const smallK = (c) => shape([ln([c.x0, c.asc], [c.x0, c.b]), ln([c.x0, c.b + (c.xh - c.b) * 0.38], [c.x1, c.xh]), ln(lerp([c.x0, c.b + (c.xh - c.b) * 0.38], [c.x1, c.xh], 0.5), [c.x1, c.b])]);
const smallM = (c) => {
  const mid = (c.x0 + c.x1) / 2;
  return shape([ln([c.x0, c.xh], [c.x0, c.b]), rounded([[c.x0, c.xh], [mid, c.xh], [mid, c.b]], [0, c.rr, 0]), rounded([[mid, c.xh], [c.x1, c.xh], [c.x1, c.b]], [0, c.rr, 0])]);
};
const smallN = (c) => shape([ln([c.x0, c.xh], [c.x0, c.b]), rounded([[c.x0, c.xh], [c.x1, c.xh], [c.x1, c.b]], [0, c.r, 0])]);
const smallQ = (c) => shape([box(c.x0, c.b, c.x1, c.xh, c.r), ln([c.x1, c.xh], [c.x1, c.ds])]);
const smallR = (c) => shape([ln([c.x0, c.xh], [c.x0, c.b]), rounded([[c.x0, c.xh - 120], [c.x0, c.xh], [c.x1, c.xh]], [0, c.rr + 30, 0])]);
const smallS = (c) => sCap(c, METRICS.xh);
const smallT = (c) => shape([rounded([[c.xm - 20, c.asc - 80], [c.xm - 20, c.b], [c.x1, c.b]], [0, c.rr, 0]), ln([c.x0, c.xh], [c.x1 - 20, c.xh])]);
const smallU = (c) => shape([rounded([[c.x0, c.xh], [c.x0, c.b], [c.x1, c.b]], [0, c.r, 0]), ln([c.x1, c.xh], [c.x1, c.b])]);
const smallY = (c) => {
  const right = [c.x1, c.xh];
  const low = [c.x0 + (c.x1 - c.x0) * 0.22, c.ds];
  const t = (c.xh - c.b) / (c.xh - c.ds);
  return shape([ln(right, low), ln([c.x0, c.xh], lerp(right, low, t))]);
};
const smallZ = (c) => zee(c, c.xh);
const dotI = (c, cy) => roundSquare(c.xm, cy, c.w * 1.15, c.w * 0.3);

// ---------- digits ----------
const digit = {
  0: (c) => shape([box(c.x0, c.b, c.x1, c.cap, c.r)], c.mono ? [roundSquare(c.xm, c.b + (c.cap - c.b) / 2, c.w * 1.15, c.w * 0.3)] : []),
  1: (c) => shape([ln([c.xm + 20, c.b], [c.xm + 20, c.cap]), ln([c.xm + 20, c.cap], [c.x0 + 20, c.cap - 130])]),
  2: (c) => shape([rounded([[c.x0, c.cap - 130], [c.x0, c.cap], [c.x1, c.cap], [c.x1, c.b + (c.cap - c.b) * 0.55], [c.x0, c.b], [c.x1, c.b]], [0, c.r, c.r, 0, 0, 0])]),
  3: (c) => ze(c, c.cap),
  4: (c) => {
    const ybar = c.b + (c.cap - c.b) * 0.3;
    const sx = c.x1 - 70;
    return shape([ln([sx, c.cap], [sx, c.b]), ln([sx, c.cap], [c.x0, ybar]), ln([c.x0, ybar], [c.x1 + 10, ybar])]);
  },
  5: (c) => shape([rounded([[c.x1, c.cap], [c.x0, c.cap], [c.x0, c.b + (c.cap - c.b) * 0.5], [c.x1, c.b + (c.cap - c.b) * 0.5], [c.x1, c.b], [c.x0, c.b]], [0, 0, c.r, c.r, c.r, 0])]),
  6: (c) => shape([rounded([[c.x1, c.cap], [c.x0, c.cap], [c.x0, c.b], [c.x1, c.b], [c.x1, c.b + (c.cap - c.b) * 0.5], [c.x0, c.b + (c.cap - c.b) * 0.5]], [0, c.r, c.r, c.r, c.r, 0])]),
  7: (c) => shape([[[c.x0, c.cap], [c.x1, c.cap], [c.xm - 40, c.b]]]),
  8: (c) => {
    const mid = c.b + (c.cap - c.b) * 0.5;
    return shape([box(c.x0 + 8, mid, c.x1 - 8, c.cap, c.r), box(c.x0, c.b, c.x1, mid, c.r)]);
  },
  9: (c) => shape([rounded([[c.x0, c.b], [c.x1, c.b], [c.x1, c.cap], [c.x0, c.cap], [c.x0, c.b + (c.cap - c.b) * 0.5], [c.x1, c.b + (c.cap - c.b) * 0.5]], [0, c.r, c.r, c.r, c.r, 0])]),
};

// ---------- the table: character -> [natural width, side bearing kind, drawing] ----------
// Width is the outer width of the glyph (in a text font); kinds: s straight (stems), r round, d diagonal, o open.
const G = {};
const put = (chars, bw, kind, draw) => {
  for (const ch of chars) G[ch] = { bw, kind, draw };
};

// Latin capitals
put('A', 640, 'd', (c) => aCap(c, c.cap));
put('B', 560, 's', (c) => bee(c, c.cap));
put('C', 600, 'r', (c) => openBowl(c, c.cap));
put('D', 600, 's', (c) => shape([rounded([[c.x0, c.cap], [c.x1, c.cap], [c.x1, c.b], [c.x0, c.b]], [0, c.r, c.r, 0], true)]));
put('E', 520, 's', (c) => ee(c, c.cap));
put('F', 500, 's', (c) => shape([ln([c.x0, c.b], [c.x0, c.cap]), ln([c.x0, c.cap], [c.x1, c.cap]), ln([c.x0, c.b + (c.cap - c.b) * 0.5], [c.x1 - 30, c.b + (c.cap - c.b) * 0.5])]));
put('G', 620, 'r', (c) => gee(c, c.cap));
put('H', 620, 's', (c) => en(c, c.cap));
put('I', 160, 's', (c) => (c.mono ? shape([ln([c.xm, c.b], [c.xm, c.cap]), ln([c.xm - 130, c.cap], [c.xm + 130, c.cap]), ln([c.xm - 130, c.b], [c.xm + 130, c.b])]) : shape([ln([c.xm, c.b], [c.xm, c.cap])])));
put('J', 440, 'o', (c) => jay(c, c.cap, c.b));
put('K', 580, 's', (c) => ka(c, c.cap));
put('L', 480, 's', (c) => el_(c, c.cap));
put('M', 760, 's', (c) => em(c, c.cap));
put('N', 640, 's', (c) => shape([rounded([[c.x0, c.b], [c.x0, c.cap], [c.x1, c.b], [c.x1, c.cap]], 0)]));
put('O', 680, 'r', (c) => oval(c, c.cap));
put('P', 540, 's', (c) => er(c, c.cap, c.b + (c.cap - c.b) * 0.42));
put('Q', 680, 'r', (c) => queue(c, c.cap));
put('R', 560, 's', (c) => ar(c, c.cap));
put('S', 560, 'r', (c) => sCap(c, c.cap));
put('T', 560, 'd', (c) => te(c, c.cap));
put('U', 620, 's', (c) => shape([rounded([[c.x0, c.cap], [c.x0, c.b], [c.x1, c.b], [c.x1, c.cap]], [0, c.r, c.r, 0])]));
put('V', 620, 'd', (c) => vee(c, c.cap));
put('W', 900, 'd', (c) => wee(c, c.cap));
put('X', 600, 'd', (c) => ha(c, c.cap));
put('Y', 600, 'd', (c) => why(c, c.cap));
put('Z', 560, 'd', (c) => zee(c, c.cap));

// Latin small letters
put('a', 520, 'r', smallA);
put('b', 520, 's', smallB);
put('c', 480, 'r', (c) => openBowl(c, c.xh, 0.26, 0.26));
put('d', 520, 'r', smallD);
put('e', 520, 'r', smallE);
put('f', 380, 'o', smallF);
put('g', 520, 'r', smallG);
put('h', 520, 's', smallH);
put('i', 160, 's', (c) => {
  const body = c.mono ? shape([ln([c.xm, c.xh], [c.xm, c.b]), ln([c.xm - 130, c.xh], [c.xm, c.xh]), ln([c.xm - 130, c.b], [c.xm + 130, c.b])]) : shape([ln([c.xm, c.xh], [c.xm, c.b])]);
  body.fills.push(dotI(c, c.asc - 20));
  return body;
});
put('j', 280, 'o', (c) => {
  const s = shape([rounded([[c.x1, c.xh], [c.x1, c.ds], [c.x0, c.ds]], [0, c.rr + 10, 0])]);
  s.fills.push(roundSquare(c.x1, c.asc - 20, c.w * 1.15, c.w * 0.3));
  return s;
});
put('k', 500, 's', smallK);
put('l', 160, 's', (c) => (c.mono ? shape([rounded([[c.xm - 120, c.asc], [c.xm, c.asc], [c.xm, c.b], [c.xm + 120, c.b]], [0, 0, 0, 0])]) : shape([ln([c.xm, c.asc], [c.xm, c.b])])));
put('m', 780, 's', smallM);
put('n', 520, 's', smallN);
put('o', 540, 'r', (c) => oval(c, c.xh));
put('p', 520, 's', (c) => bowlStem(c, c.xh, c.b));
put('q', 520, 'r', smallQ);
put('r', 380, 'o', smallR);
put('s', 460, 'r', smallS);
put('t', 400, 'o', smallT);
put('u', 520, 's', smallU);
put('v', 520, 'd', (c) => vee(c, c.xh));
put('w', 780, 'd', (c) => wee(c, c.xh));
put('x', 500, 'd', (c) => ha(c, c.xh));
put('y', 520, 'd', smallY);
put('z', 460, 'd', smallZ);

// Cyrillic capitals (those that look like Latin letters reuse the drawings)
const cyrCaps = {
  А: ['A', 'd'], В: ['B', 's'], Е: ['E', 's'], К: ['K', 's'], М: ['M', 's'], Н: ['H', 's'], О: ['O', 'r'], Р: ['P', 's'], С: ['C', 'r'], Т: ['T', 'd'], Х: ['X', 'd'],
};
for (const [cyr, [lat, kind]] of Object.entries(cyrCaps)) G[cyr] = { ...G[lat], kind };
put('Б', 540, 's', (c) => be(c, c.cap, c.cap));
put('Г', 480, 's', (c) => ge(c, c.cap));
put('Д', 680, 's', (c) => de(c, c.cap));
put('Ё', 520, 's', (c) => {
  const s = ee(c, c.cap);
  s.fills.push(roundSquare(c.xm - 90, c.cap + 120, c.w * 1.15, c.w * 0.3), roundSquare(c.xm + 90, c.cap + 120, c.w * 1.15, c.w * 0.3));
  return s;
});
put('Ж', 900, 's', (c) => zhe(c, c.cap));
put('З', 540, 'o', (c) => ze(c, c.cap));
put('И', 640, 's', (c) => i(c, c.cap));
put('Й', 640, 's', (c) => {
  const s = i(c, c.cap);
  s.strokes.push(rounded([[c.xm - 85, c.cap + 150], [c.xm, c.cap + 90], [c.xm + 85, c.cap + 150]], 0));
  return s;
});
put('Л', 640, 's', (c) => el(c, c.cap));
put('П', 620, 's', (c) => pe(c, c.cap));
put('У', 600, 'd', (c) => {
  const t = 0.62;
  const a = [c.x1, c.cap];
  const d = [c.x0 + 40, c.ds + 120];
  return shape([ln(a, d), ln([c.x0, c.cap], lerp(a, d, t))]);
});
put('Ф', 780, 'r', (c) => ef(c, c.cap));
put('Ц', 660, 's', (c) => tse(c, c.cap));
put('Ч', 600, 's', (c) => che(c, c.cap));
put('Ш', 880, 's', (c) => sha(c, c.cap, false));
put('Щ', 920, 's', (c) => sha(c, c.cap, true));
put('Ъ', 700, 's', (c) => hard(c, c.cap, c.b + (c.cap - c.b) * 0.5));
put('Ы', 780, 's', (c) => yeri(c, c.cap, c.b + (c.cap - c.b) * 0.5));
put('Ь', 560, 's', (c) => soft(c, c.cap, c.b + (c.cap - c.b) * 0.5));
put('Э', 580, 'o', (c) => reverseE(c, c.cap));
put('Ю', 820, 's', (c) => yu(c, c.cap));
put('Я', 560, 's', (c) => ya(c, c.cap));

// Cyrillic small letters
const cyrSmall = { а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y' };
for (const [cyr, lat] of Object.entries(cyrSmall)) G[cyr] = { ...G[lat] };
put('б', 540, 's', (c) => shape([rounded([[c.x0, c.b], [c.x0, c.asc], [c.x1 - 60, c.asc]], [0, c.rr, 0]), box(c.x0, c.b, c.x1, c.xh, c.r)]));
put('в', 500, 's', (c) => bee(c, c.xh));
put('г', 420, 's', (c) => ge(c, c.xh));
put('д', 640, 's', (c) => de(c, c.xh));
put('ё', 520, 'r', (c) => {
  const s = smallE(c);
  s.fills.push(roundSquare(c.xm - 85, c.xh + 130, c.w * 1.15, c.w * 0.3), roundSquare(c.xm + 85, c.xh + 130, c.w * 1.15, c.w * 0.3));
  return s;
});
put('ж', 800, 's', (c) => zhe(c, c.xh));
put('з', 460, 'o', (c) => ze(c, c.xh));
put('и', 540, 's', (c) => i(c, c.xh));
put('й', 540, 's', (c) => {
  const s = i(c, c.xh);
  s.strokes.push(rounded([[c.xm - 75, c.xh + 150], [c.xm, c.xh + 95], [c.xm + 75, c.xh + 150]], 0));
  return s;
});
put('к', 500, 's', (c) => ka(c, c.xh));
put('л', 560, 's', (c) => el(c, c.xh));
put('м', 700, 's', (c) => em(c, c.xh));
put('н', 520, 's', (c) => en(c, c.xh));
put('п', 520, 's', (c) => pe(c, c.xh));
put('т', 480, 'd', (c) => te(c, c.xh));
put('ф', 720, 'r', (c) => shape([ln([c.xm, c.asc], [c.xm, c.ds]), box(c.x0, c.b, c.x1, c.xh, c.r)]));
put('ц', 560, 's', (c) => tse(c, c.xh));
put('ч', 500, 's', (c) => che(c, c.xh));
put('ш', 780, 's', (c) => sha(c, c.xh, false));
put('щ', 820, 's', (c) => sha(c, c.xh, true));
put('ъ', 620, 's', (c) => hard(c, c.xh, c.b + (c.xh - c.b) * 0.62));
put('ы', 680, 's', (c) => yeri(c, c.xh, c.b + (c.xh - c.b) * 0.62));
put('ь', 500, 's', (c) => soft(c, c.xh, c.b + (c.xh - c.b) * 0.62));
put('э', 480, 'o', (c) => reverseE(c, c.xh));
put('ю', 740, 's', (c) => yu(c, c.xh));
put('я', 500, 's', (c) => ya(c, c.xh));

// Digits
for (const d of Object.keys(digit)) put(d, d === '1' ? 340 : 520, d === '1' ? 'o' : 'r', digit[d]);

// Punctuation and symbols
const sq = (c, cx, cy) => roundSquare(cx, cy, c.w * 1.2, c.w * 0.32);
put(' ', 280, 'x', () => shape());
put('.', 140, 's', (c) => shape([], [sq(c, c.xm, c.b + c.w * 0.1)]));
put(',', 170, 's', (c) => shape([ln([c.xm + 10, c.b + 20], [c.xm - 25, c.ds + 70])], []));
put(':', 140, 's', (c) => shape([], [sq(c, c.xm, c.b + c.w * 0.1), sq(c, c.xm, c.xh - c.w * 0.5)]));
put(';', 170, 's', (c) => shape([ln([c.xm + 10, c.b + 20], [c.xm - 25, c.ds + 70])], [sq(c, c.xm + 8, c.xh - c.w * 0.5)]));
put('!', 150, 's', (c) => shape([ln([c.xm, c.cap], [c.xm, c.b + 190])], [sq(c, c.xm, c.b + c.w * 0.1)]));
put('?', 480, 'o', (c) => shape([rounded([[c.x0, c.cap - 130], [c.x0, c.cap], [c.x1, c.cap], [c.x1, c.b + 350], [c.xm, c.b + 350], [c.xm, c.b + 190]], [0, c.r, c.r, 0, c.rr, 0])], [sq(c, c.xm, c.b + c.w * 0.1)]));
put('-', 320, 's', (c) => shape([ln([c.x0 + 10, c.b + 250], [c.x1 - 10, c.b + 250])]));
put('–', 460, 's', (c) => shape([ln([c.x0, c.b + 250], [c.x1, c.b + 250])]));
put('—', 760, 's', (c) => shape([ln([c.x0, c.b + 250], [c.x1, c.b + 250])]));
put('_', 520, 's', (c) => shape([ln([c.x0 - 20, c.ds + c.w * 0.5], [c.x1 + 20, c.ds + c.w * 0.5])]));
put('…', 620, 's', (c) => shape([], [sq(c, c.x0 + 20, c.b + c.w * 0.1), sq(c, c.xm, c.b + c.w * 0.1), sq(c, c.x1 - 20, c.b + c.w * 0.1)]));
put('•', 300, 'r', (c) => shape([], [roundSquare(c.xm, c.b + 270, c.w * 2.3, c.w * 0.7)]));
put('·', 160, 's', (c) => shape([], [sq(c, c.xm, c.b + 270)]));
put("'", 150, 's', (c) => shape([ln([c.xm, c.cap], [c.xm, c.cap - 150])]));
put('"', 300, 's', (c) => shape([ln([c.xm - 60, c.cap], [c.xm - 60, c.cap - 150]), ln([c.xm + 60, c.cap], [c.xm + 60, c.cap - 150])]));
put('’', 170, 's', (c) => shape([ln([c.xm + 20, c.cap], [c.xm - 20, c.cap - 150])]));
put('‘', 170, 's', (c) => shape([ln([c.xm - 20, c.cap], [c.xm + 20, c.cap - 150])]));
put('“', 340, 's', (c) => shape([ln([c.xm - 40, c.cap], [c.xm - 80, c.cap - 150]), ln([c.xm + 80, c.cap], [c.xm + 40, c.cap - 150])]));
put('”', 340, 's', (c) => shape([ln([c.xm - 40, c.cap], [c.xm - 80, c.cap - 150]), ln([c.xm + 80, c.cap], [c.xm + 40, c.cap - 150])]));
put('«', 480, 'd', (c) => shape([[[c.xm - 20, c.b + 440], [c.x0, c.b + 270], [c.xm - 20, c.b + 100]], [[c.x1 - 20, c.b + 440], [c.xm + 60, c.b + 270], [c.x1 - 20, c.b + 100]]]));
put('»', 480, 'd', (c) => shape([[[c.x0 + 20, c.b + 440], [c.xm - 60, c.b + 270], [c.x0 + 20, c.b + 100]], [[c.xm + 20, c.b + 440], [c.x1, c.b + 270], [c.xm + 20, c.b + 100]]]));
put('(', 280, 'o', (c) => shape([arc(c.x1 + 110, c.b + 270, 190, 480, 135, 225, 16)]));
put(')', 280, 'o', (c) => shape([arc(c.x0 - 110, c.b + 270, 190, 480, 45, -45, 16)]));
put('[', 280, 's', (c) => shape([[[c.x1, c.asc], [c.x0, c.asc], [c.x0, c.ds], [c.x1, c.ds]]]));
put(']', 280, 's', (c) => shape([[[c.x0, c.asc], [c.x1, c.asc], [c.x1, c.ds], [c.x0, c.ds]]]));
put('{', 300, 'o', (c) => shape([rounded([[c.x1, c.asc], [c.xm, c.asc - 40], [c.xm, c.b + 330], [c.x0, c.b + 270], [c.xm, c.b + 210], [c.xm, c.ds + 80], [c.x1, c.ds]], [0, c.rr, 0, c.rr, 0, c.rr, 0])]));
put('}', 300, 'o', (c) => shape([rounded([[c.x0, c.asc], [c.xm, c.asc - 40], [c.xm, c.b + 330], [c.x1, c.b + 270], [c.xm, c.b + 210], [c.xm, c.ds + 80], [c.x0, c.ds]], [0, c.rr, 0, c.rr, 0, c.rr, 0])]));
put('/', 400, 'd', (c) => shape([ln([c.x0, c.ds + 30], [c.x1, c.asc - 10])]));
put('\\', 400, 'd', (c) => shape([ln([c.x0, c.asc - 10], [c.x1, c.ds + 30])]));
put('|', 160, 's', (c) => shape([ln([c.xm, c.asc], [c.xm, c.ds])]));
put('+', 500, 's', (c) => shape([ln([c.x0, c.b + 270], [c.x1, c.b + 270]), ln([c.xm, c.b + 70], [c.xm, c.b + 470])]));
put('=', 500, 's', (c) => shape([ln([c.x0, c.b + 190], [c.x1, c.b + 190]), ln([c.x0, c.b + 350], [c.x1, c.b + 350])]));
put('<', 500, 'd', (c) => shape([[[c.x1, c.b + 450], [c.x0, c.b + 270], [c.x1, c.b + 90]]]));
put('>', 500, 'd', (c) => shape([[[c.x0, c.b + 450], [c.x1, c.b + 270], [c.x0, c.b + 90]]]));
put('*', 440, 's', (c) => shape([ln([c.xm, c.cap - 40], [c.xm, c.cap - 260]), ln([c.xm - 100, c.cap - 95], [c.xm + 100, c.cap - 205]), ln([c.xm + 100, c.cap - 95], [c.xm - 100, c.cap - 205])]));
put('#', 640, 'd', (c) => shape([ln([c.x0 + 130, c.b + 10], [c.x0 + 200, c.cap - 10]), ln([c.x1 - 200, c.b + 10], [c.x1 - 130, c.cap - 10]), ln([c.x0, c.b + 210], [c.x1, c.b + 210]), ln([c.x0, c.b + 410], [c.x1, c.b + 410])]));
put('$', 520, 'r', (c) => {
  const s = sCap(c, c.cap - 60);
  s.strokes = s.strokes.map((line) => line.map(([x, y]) => [x, y + 30]));
  s.strokes.push(ln([c.xm, c.cap + 60], [c.xm, c.b - 60]));
  return s;
});
put('%', 740, 'd', (c) => shape([box(c.x0, c.cap - 270, c.x0 + 230, c.cap, 80), box(c.x1 - 230, c.b, c.x1, c.b + 270, 80), ln([c.x1 - 40, c.cap], [c.x0 + 40, c.b])]));
put('&', 640, 'r', (c) => shape([rounded([[c.x1, c.b], [c.x0 + 70, c.b + 330], [c.x0 + 70, c.cap], [c.x0 + 280, c.cap], [c.x0 + 280, c.b + 330], [c.x0, c.b + 200], [c.x0, c.b], [c.x1 - 40, c.b], [c.x1, c.b + 150]], [0, 0, c.rr, c.rr, 0, 0, c.rr, c.rr, 0])]));
put('@', 800, 'r', (c) => shape([rounded([[c.x1, c.b + 130], [c.x1, c.cap], [c.x0, c.cap], [c.x0, c.ds + 40], [c.x1 - 90, c.ds + 40]], 150), box(c.xm - 120, c.b + 110, c.xm + 120, c.b + 390, 70), ln([c.xm + 120, c.b + 390], [c.x1, c.b + 390])]));
put('~', 520, 'd', (c) => shape([rounded([[c.x0, c.b + 240], [c.x0 + 130, c.b + 350], [c.x1 - 130, c.b + 190], [c.x1, c.b + 300]], [0, 110, 110, 0], false, 9)]));
put('^', 480, 'd', (c) => shape([[[c.x0, c.cap - 180], [c.xm, c.cap], [c.x1, c.cap - 180]]]));
put('`', 240, 's', (c) => shape([ln([c.x0 + 30, c.cap], [c.x1 - 30, c.cap - 130])]));
put('№', 1000, 's', (c) => shape([rounded([[c.x0, c.b], [c.x0, c.cap], [c.x0 + 380, c.b], [c.x0 + 380, c.cap]], 0), box(c.x1 - 270, c.b + 200, c.x1, c.cap, 90), ln([c.x1 - 270, c.b], [c.x1, c.b])]));
put('°', 300, 'r', (c) => shape([box(c.xm - 85, c.cap - 190, c.xm + 85, c.cap, 55)]));

export const GLYPH_TABLE = G;
export const CODE_ORDER = Object.keys(G);
