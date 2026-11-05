// Geometry for the skeleton fonts: rounded polylines, arcs, and the union of thick strokes into outlines.
import polygonClipping from 'polygon-clipping';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);
const unit = (v) => {
  const l = len(v) || 1;
  return [v[0] / l, v[1] / l];
};

// A polyline whose corners are replaced by smooth bends (quadratic curves with the corner as the control point).
// radii: one number for every corner, or an array with a number per point (0 keeps the corner sharp).
export const rounded = (points, radii = 0, closed = false, steps = 7) => {
  const count = points.length;
  const radiusAt = (i) => (Array.isArray(radii) ? (radii[i] ?? 0) : radii);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const isEnd = !closed && (i === 0 || i === count - 1);
    const r = isEnd ? 0 : radiusAt(i);
    const p = points[i];
    if (r <= 0) {
      out.push(p);
      continue;
    }
    const a = points[(i - 1 + count) % count];
    const b = points[(i + 1) % count];
    const toA = sub(a, p);
    const toB = sub(b, p);
    const d = Math.min(r, len(toA) * 0.5, len(toB) * 0.5);
    const ua = unit(toA);
    const ub = unit(toB);
    const p1 = [p[0] + ua[0] * d, p[1] + ua[1] * d];
    const p2 = [p[0] + ub[0] * d, p[1] + ub[1] * d];
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      out.push([(1 - t) * (1 - t) * p1[0] + 2 * (1 - t) * t * p[0] + t * t * p2[0], (1 - t) * (1 - t) * p1[1] + 2 * (1 - t) * t * p[1] + t * t * p2[1]]);
    }
  }
  if (closed) out.push(out[0]);
  return out;
};

// A rounded rectangle as a closed polyline.
export const box = (x0, y0, x1, y1, r) => rounded([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], r, true, 8);

// Points of an ellipse arc, angles in degrees (0 = right, 90 = up).
export const arc = (cx, cy, rx, ry, a0, a1, steps = 24) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });

// The outline of a thick segment with round ends (a stadium).
const stadium = (p, q, r, steps = 9) => {
  const theta = Math.atan2(q[1] - p[1], q[0] - p[0]);
  const ring = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = theta + Math.PI / 2 + (Math.PI * i) / steps;
    ring.push([p[0] + r * Math.cos(a), p[1] + r * Math.sin(a)]);
  }
  for (let i = 0; i <= steps; i += 1) {
    const a = theta - Math.PI / 2 + (Math.PI * i) / steps;
    ring.push([q[0] + r * Math.cos(a), q[1] + r * Math.sin(a)]);
  }
  ring.push(ring[0]);
  return ring;
};

const dot = (p, r, steps = 12) => {
  const ring = Array.from({ length: steps }, (_, i) => [p[0] + r * Math.cos((2 * Math.PI * i) / steps), p[1] + r * Math.sin((2 * Math.PI * i) / steps)]);
  ring.push(ring[0]);
  return ring;
};

// Union of everything a glyph draws: strokes (polylines with a width) and filled shapes (closed rings).
// Every piece is a polygon (a list of rings); the pieces are merged in small groups first, which is much faster than one big union.
export const outline = (strokes, fills, width) => {
  const r = width / 2;
  const groups = [];
  for (const line of strokes) {
    const parts = [];
    if (line.length === 1) parts.push([dot(line[0], r)]);
    for (let i = 0; i + 1 < line.length; i += 1) {
      if (Math.hypot(line[i + 1][0] - line[i][0], line[i + 1][1] - line[i][1]) < 0.01) continue;
      parts.push([stadium(line[i], line[i + 1], r)]);
    }
    if (parts.length === 0) parts.push([dot(line[0], r)]);
    groups.push(parts.length === 1 ? parts : polygonClipping.union(...parts));
  }
  for (const ring of fills) groups.push([[ring]]);
  const all = groups.flat().map((polygon) => polygon);
  if (all.length === 0) return [];
  return polygonClipping.union(...all);
};

// The signed area of a ring (positive when it runs counter-clockwise with y pointing up).
export const area = (ring) => {
  let sum = 0;
  for (let i = 0; i + 1 < ring.length; i += 1) sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return sum / 2;
};

// Ramer-Douglas-Peucker on a closed ring: drops points that change the outline by less than eps, keeps the shape.
const distance = (p, a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  if (l === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / l;
};
const reduce = (pts, eps) => {
  if (pts.length < 3) return pts;
  let worst = -1;
  let at = 0;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const d = distance(pts[i], pts[0], pts[pts.length - 1]);
    if (d > worst) {
      worst = d;
      at = i;
    }
  }
  if (worst <= eps) return [pts[0], pts[pts.length - 1]];
  return [...reduce(pts.slice(0, at + 1), eps).slice(0, -1), ...reduce(pts.slice(at), eps)];
};
export const simplify = (ring, eps = 0.5) => {
  const pts = ring.slice(0, -1);
  if (pts.length < 4) return pts;
  let far = 0;
  let best = -1;
  pts.forEach((p, i) => {
    const d = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]);
    if (d > best) {
      best = d;
      far = i;
    }
  });
  const first = reduce(pts.slice(0, far + 1), eps);
  const second = reduce([...pts.slice(far), pts[0]], eps);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
};
