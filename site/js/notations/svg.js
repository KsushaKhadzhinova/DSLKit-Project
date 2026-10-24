import { escapeXml, textWidth, wrap } from './common.js';

export const INK = '#1e293b';
export const MUTED = '#475569';
const MARGIN = 40;
const TITLE_HEIGHT = 32;
const COLUMN_GAP = 90;
const ROW_GAP = 28;
const LINE = 15;

const marker = (id, width, height, refX, refY, body) =>
  `<marker id="m-${id}" viewBox="0 0 ${width} ${height}" refX="${refX}" refY="${refY}" markerWidth="${width}" markerHeight="${height}" markerUnits="userSpaceOnUse" orient="auto-start-reverse">${body}</marker>`;

const MARKERS =
  '<defs>' +
  marker('arrow', 10, 10, 10, 5, `<path d="M0 0L10 5L0 10Z" fill="${INK}"/>`) +
  marker('open', 10, 10, 10, 5, `<path d="M0 0L10 5L0 10" fill="none" stroke="${INK}" stroke-width="1.5"/>`) +
  marker('triangle', 12, 12, 12, 6, `<path d="M0 0L12 6L0 12Z" fill="#ffffff" stroke="${INK}" stroke-width="1.5"/>`) +
  marker('diamond', 16, 10, 16, 5, `<path d="M0 5L8 0L16 5L8 10Z" fill="#ffffff" stroke="${INK}" stroke-width="1.5"/>`) +
  marker('diamond-filled', 16, 10, 16, 5, `<path d="M0 5L8 0L16 5L8 10Z" fill="${INK}"/>`) +
  marker('one', 14, 14, 14, 7, `<path d="M7 1V13M11 1V13" stroke="${INK}" stroke-width="1.5"/>`) +
  marker('many', 14, 14, 14, 7, `<path d="M14 7L2 1M14 7L2 7M14 7L2 13" fill="none" stroke="${INK}" stroke-width="1.5"/>`) +
  marker(
    'zero-one',
    18,
    14,
    18,
    7,
    `<circle cx="5" cy="7" r="4" fill="#ffffff" stroke="${INK}" stroke-width="1.5"/><path d="M13 1V13" stroke="${INK}" stroke-width="1.5"/>`,
  ) +
  marker('one-many', 14, 14, 14, 7, `<path d="M14 7L2 1M14 7L2 7M14 7L2 13M5 1V13" fill="none" stroke="${INK}" stroke-width="1.5"/>`) +
  '</defs>';

export const text = (cx, cy, lines, size, weight, fill) =>
  lines
    .map(
      (line, index) =>
        `<text x="${cx}" y="${cy + (index - (lines.length - 1) / 2) * (size + 3)}" dy="0.35em" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`,
    )
    .join('');

const strokeOf = (width) => `fill="#ffffff" stroke="${INK}" stroke-width="${width}"`;

// Labels of small symbols are written below them, labels of big symbols inside.
const caption = ({ cx, y, h, lines }) => text(cx, y + h + 12, lines, 12, 400, INK);
const inside = ({ cx, cy, lines }) => text(cx, cy, lines, 12, 400, INK);
const dots = (cx, cy, count) =>
  count > 3
    ? text(cx, cy, [String(count)], 13, 700, INK)
    : [...Array(count).keys()].map((index) => `<circle cx="${cx + (index - (count - 1) / 2) * 10}" cy="${cy}" r="3.5" fill="${INK}"/>`).join('');
const rhombus = (p) => `<polygon points="${p.cx},${p.y} ${p.x + p.w},${p.cy} ${p.cx},${p.y + p.h} ${p.x},${p.cy}" ${strokeOf(1.5)}/>`;

export const SHAPES = {
  rect: (p) => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" ${strokeOf(1.5)}/>${inside(p)}`,
  rounded: (p) => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="12" ${strokeOf(1.5)}/>${inside(p)}`,
  circle: (p) => `<circle cx="${p.cx}" cy="${p.cy}" r="${p.w / 2}" ${strokeOf(1.5)}/>${inside(p)}`,
  ellipse: (p) => `<ellipse cx="${p.cx}" cy="${p.cy}" rx="${p.w / 2}" ry="${p.h / 2}" ${strokeOf(1.5)}/>${inside(p)}`,
  diamond: (p) => `${rhombus(p)}${inside(p)}`,
  'diamond-x': (p) =>
    `${rhombus(p)}<path d="M${p.cx - 8} ${p.cy - 8}L${p.cx + 8} ${p.cy + 8}M${p.cx + 8} ${p.cy - 8}L${p.cx - 8} ${p.cy + 8}" stroke="${INK}" stroke-width="2.5"/>${caption(p)}`,
  'diamond-plus': (p) =>
    `${rhombus(p)}<path d="M${p.cx - 10} ${p.cy}H${p.cx + 10}M${p.cx} ${p.cy - 10}V${p.cy + 10}" stroke="${INK}" stroke-width="2.5"/>${caption(p)}`,
  'event-start': (p) => `<circle cx="${p.cx}" cy="${p.cy}" r="${p.w / 2}" ${strokeOf(1.5)}/>${caption(p)}`,
  'event-middle': (p) =>
    `<circle cx="${p.cx}" cy="${p.cy}" r="${p.w / 2}" ${strokeOf(1.5)}/><circle cx="${p.cx}" cy="${p.cy}" r="${p.w / 2 - 4}" ${strokeOf(1.5)}/>${caption(p)}`,
  'event-end': (p) => `<circle cx="${p.cx}" cy="${p.cy}" r="${p.w / 2}" ${strokeOf(4)}/>${caption(p)}`,
  pill: (p) => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${p.h / 2}" ${strokeOf(1.5)}/>${inside(p)}`,
  parallelogram: (p) =>
    `<polygon points="${p.x + 14},${p.y} ${p.x + p.w},${p.y} ${p.x + p.w - 14},${p.y + p.h} ${p.x},${p.y + p.h}" ${strokeOf(1.5)}/>${inside(p)}`,
  hexagon: (p) =>
    `<polygon points="${p.x + 16},${p.y} ${p.x + p.w - 16},${p.y} ${p.x + p.w},${p.cy} ${p.x + p.w - 16},${p.y + p.h} ${p.x + 16},${p.y + p.h} ${p.x},${p.cy}" ${strokeOf(1.5)}/>${inside(p)}`,
  predefined: (p) =>
    `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" ${strokeOf(1.5)}/><path d="M${p.x + 10} ${p.y}V${p.y + p.h}M${p.x + p.w - 10} ${p.y}V${p.y + p.h}" stroke="${INK}" stroke-width="1.5"/>${inside(p)}`,
  manual: (p) => `<polygon points="${p.x},${p.y + 10} ${p.x + p.w},${p.y} ${p.x + p.w},${p.y + p.h} ${p.x},${p.y + p.h}" ${strokeOf(1.5)}/>${inside(p)}`,
  document: (p) =>
    `<path d="M${p.x} ${p.y}H${p.x + p.w}V${p.y + p.h - 10}Q${p.x + p.w * 0.75} ${p.y + p.h + 8} ${p.cx} ${p.y + p.h - 10}T${p.x} ${p.y + p.h - 10}Z" ${strokeOf(1.5)}/>${inside(p)}`,
  offpage: (p) =>
    `<polygon points="${p.x},${p.y} ${p.x + p.w},${p.y} ${p.x + p.w},${p.y + p.h * 0.7} ${p.cx},${p.y + p.h} ${p.x},${p.y + p.h * 0.7}" ${strokeOf(1.5)}/>${inside(p)}`,
  cylinder: (p) =>
    `<path d="M${p.x} ${p.y + 8}A${p.w / 2} 8 0 0 1 ${p.x + p.w} ${p.y + 8}V${p.y + p.h - 8}A${p.w / 2} 8 0 0 1 ${p.x} ${p.y + p.h - 8}Z M${p.x} ${p.y + 8}A${p.w / 2} 8 0 0 0 ${p.x + p.w} ${p.y + 8}" ${strokeOf(1.5)}/>${inside(p)}`,
  comment: (p) => `<path d="M${p.x + 14} ${p.y}H${p.x}V${p.y + p.h}H${p.x + 14}" fill="none" stroke="${INK}" stroke-width="1.5"/>${inside(p)}`,
  package: (p) =>
    `<rect x="${p.x}" y="${p.y}" width="44" height="12" ${strokeOf(1.5)}/><rect x="${p.x}" y="${p.y + 12}" width="${p.w}" height="${p.h - 12}" ${strokeOf(1.5)}/>${text(p.cx, p.cy + 6, p.lines, 12, 400, INK)}`,
  component: (p) =>
    `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" ${strokeOf(1.5)}/><rect x="${p.x - 8}" y="${p.y + 10}" width="16" height="8" ${strokeOf(1.5)}/><rect x="${p.x - 8}" y="${p.y + 26}" width="16" height="8" ${strokeOf(1.5)}/>${inside(p)}`,
  box3d: (p) =>
    `<path d="M${p.x} ${p.y}L${p.x + 8} ${p.y - 8}H${p.x + p.w + 8}V${p.y + p.h - 8}L${p.x + p.w} ${p.y + p.h}" fill="#ffffff" stroke="${INK}" stroke-width="1.5"/><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" ${strokeOf(1.5)}/><path d="M${p.x + p.w} ${p.y}L${p.x + p.w + 8} ${p.y - 8}" stroke="${INK}" stroke-width="1.5"/>${inside(p)}`,
  square: (p) => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" ${strokeOf(1.5)}/>${caption(p)}`,
  frame: (p) =>
    `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" ${strokeOf(1.5)}/><path d="M${p.x} ${p.y + 14}H${p.x + 24}L${p.x + 30} ${p.y + 8}V${p.y}" fill="none" stroke="${INK}" stroke-width="1"/>${text(p.x + 12, p.y + 7, ['ref'], 10, 700, MUTED)}${inside(p)}`,
  bar: (p) => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${INK}"/>${caption(p)}`,
  store: (p) =>
    `<path d="M${p.x} ${p.y}H${p.x + p.w}M${p.x} ${p.y + p.h}H${p.x + p.w}" stroke="${INK}" stroke-width="2"/>` +
    `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#ffffff" fill-opacity="0.01"/>${inside(p)}`,
  place: (p) => `<circle cx="${p.cx}" cy="${p.cy}" r="${p.w / 2}" ${strokeOf(1.5)}/>${dots(p.cx, p.cy, p.node.tokens)}${caption(p)}`,
  dot: (p) => `<circle cx="${p.cx}" cy="${p.cy}" r="${p.w / 2}" fill="${INK}"/>`,
  bullseye: (p) => `<circle cx="${p.cx}" cy="${p.cy}" r="${p.w / 2}" ${strokeOf(1.5)}/><circle cx="${p.cx}" cy="${p.cy}" r="${p.w / 2 - 5}" fill="${INK}"/>`,
  actor: (p) =>
    `<circle cx="${p.cx}" cy="${p.y + 8}" r="8" ${strokeOf(1.5)}/><path d="M${p.cx} ${p.y + 16}V${p.y + 36}M${p.cx - 14} ${p.y + 24}H${p.cx + 14}M${p.cx} ${p.y + 36}L${p.cx - 12} ${p.y + 52}M${p.cx} ${p.y + 36}L${p.cx + 12} ${p.y + 52}" fill="none" stroke="${INK}" stroke-width="1.5"/>${text(p.cx, p.y + 66, p.lines, 12, 400, INK)}`,
};

// Back edges (cycles) are ignored for layering; the rest is ranked by longest path so a node sits one column right of its inputs.
const rankNodes = (nodes, edges) => {
  const state = new Map();
  const back = new Set();
  const visit = (id) => {
    state.set(id, 1);
    edges
      .filter((edge) => edge.from === id)
      .forEach((edge) => {
        if (state.get(edge.to) === 1) back.add(edge);
        else if (!state.has(edge.to)) visit(edge.to);
      });
    state.set(id, 2);
  };
  nodes.forEach((node) => state.has(node.id) || visit(node.id));
  const rank = new Map(nodes.map((node) => [node.id, 0]));
  nodes.forEach(() => edges.filter((edge) => !back.has(edge)).forEach(({ from, to }) => rank.set(to, Math.max(rank.get(to), rank.get(from) + 1))));
  return rank;
};

export const layout = (nodes, edges, size) => {
  const rank = rankNodes(nodes, edges);
  const columns = [];
  nodes.forEach((node) => {
    const column = (columns[rank.get(node.id)] ??= []);
    column.push({ ...size(node), node });
  });
  const filled = columns.filter(Boolean);
  const heights = filled.map((column) => column.reduce((sum, item) => sum + item.h + ROW_GAP, -ROW_GAP));
  const tallest = Math.max(...heights, 0);
  const placed = new Map();
  let x = MARGIN;
  filled.forEach((column, index) => {
    const columnWidth = Math.max(...column.map((item) => item.w));
    let y = MARGIN + TITLE_HEIGHT + (tallest - heights[index]) / 2;
    column.forEach((item) => {
      const left = x + (columnWidth - item.w) / 2;
      placed.set(item.node.id, { ...item, x: left, y, cx: left + item.w / 2, cy: y + item.h / 2 });
      y += item.h + ROW_GAP;
    });
    x += columnWidth + COLUMN_GAP;
  });
  return { placed, width: Math.max(x - COLUMN_GAP + MARGIN, MARGIN * 2), height: MARGIN * 2 + TITLE_HEIGHT + tallest };
};

const CLIP = {
  box: (dx, dy, hw, hh) => Math.min(hw / Math.abs(dx), hh / Math.abs(dy)),
  ellipse: (dx, dy, hw, hh) => 1 / Math.sqrt((dx / hw) ** 2 + (dy / hh) ** 2),
  diamond: (dx, dy, hw, hh) => 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh),
};

const clip = (item, toward) => {
  const dx = toward.x - item.cx;
  const dy = toward.y - item.cy;
  const t = CLIP[item.outline](dx, dy, item.w / 2, item.h / 2);
  return { x: item.cx + dx * t, y: item.cy + dy * t };
};

const round = (value) => Math.round(value * 10) / 10;
const pairKey = (edge) => [edge.from, edge.to].sort().join('\u0000');

export const edgeMarkup = (placed, edges, style, labelOf) => {
  const used = new Map();
  return edges
    .map((edge, index) => {
      const source = placed.get(edge.from);
      const target = placed.get(edge.to);
      const key = pairKey(edge);
      const siblings = edges.filter((other) => pairKey(other) === key).length;
      const order = used.get(key) ?? 0;
      used.set(key, order + 1);
      const look = style(edge, source, target);
      const attrs =
        `fill="none" stroke="${INK}" stroke-width="1.5"${look.dash ? ' stroke-dasharray="6 4"' : ''}` +
        `${look.start ? ` marker-start="url(#m-${look.start})"` : ''}${look.end ? ` marker-end="url(#m-${look.end})"` : ''}`;
      let d;
      let lx;
      let ly;
      if (edge.from === edge.to) {
        const { cx, y } = source;
        d = `M${round(cx - 14)} ${round(y)}C${round(cx - 34)} ${round(y - 44)} ${round(cx + 34)} ${round(y - 44)} ${round(cx + 14)} ${round(y)}`;
        lx = cx;
        ly = y - 38;
      } else {
        const sign = Number(edge.from < edge.to) * 2 - 1;
        const dx = target.cx - source.cx;
        const dy = target.cy - source.cy;
        const length = Math.hypot(dx, dy);
        const offset = (order - (siblings - 1) / 2) * 44 * sign;
        const control = { x: (source.cx + target.cx) / 2 - (dy / length) * offset, y: (source.cy + target.cy) / 2 + (dx / length) * offset };
        const a = clip(source, control);
        const b = clip(target, control);
        d = `M${round(a.x)} ${round(a.y)}Q${round(control.x)} ${round(control.y)} ${round(b.x)} ${round(b.y)}`;
        lx = (a.x + 2 * control.x + b.x) / 4;
        ly = (a.y + 2 * control.y + b.y) / 4;
      }
      const label = labelOf(edge);
      const caption = label
        ? `<text x="${round(lx)}" y="${round(ly - 5)}" text-anchor="middle" font-size="11" fill="${MUTED}" stroke="#ffffff" stroke-width="3" paint-order="stroke">${escapeXml(label)}</text>`
        : '';
      return `<path class="notation__edge" id="edge-${index}" d="${d}" ${attrs}/>${caption}`;
    })
    .join('');
};

export const svgDocument = (width, height, title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Helvetica, Arial, sans-serif">${MARKERS}` +
  `<rect width="${width}" height="${height}" fill="#ffffff"/>` +
  `${title ? `<text x="${MARGIN}" y="${MARGIN}" font-size="16" font-weight="700" fill="#0f172a">${escapeXml(title)}</text>` : ''}${body}</svg>`;

const POSITION = /^(-?\d+(?:\.\d+)?)x(-?\d+(?:\.\d+)?)$/;
const EDGE_OF_PAGE = 8;

// The attribute pos=120x80 of a node: the place of its centre, written by the editor when a block is moved.
export const parsePosition = (value) => {
  const found = POSITION.exec(String(value ?? ''));
  return found ? { x: Number(found[1]), y: Number(found[2]) } : null;
};

// A node with a position keeps it, whatever the automatic layout chose. The page grows to hold the moved nodes.
const applyPositions = (placed, size) => {
  let { width, height } = size;
  placed.forEach((item) => {
    const position = parsePosition(item.node.attrs?.pos);
    if (!position) return;
    item.x = Math.max(EDGE_OF_PAGE, position.x - item.w / 2);
    item.y = Math.max(EDGE_OF_PAGE, position.y - item.h / 2);
    item.cx = item.x + item.w / 2;
    item.cy = item.y + item.h / 2;
    width = Math.max(width, item.x + item.w + MARGIN);
    height = Math.max(height, item.y + item.h + MARGIN);
  });
  return { width, height };
};

// size(node) -> {w, h, outline, lines}; draw(placedItem) -> SVG; style(edge) -> {start, end, dash}.
export const renderLayout = ({ title, nodes, edges, size, draw, style, labelOf }) => {
  const known = edges.filter(({ from, to }) => nodes.some((n) => n.id === from) && nodes.some((n) => n.id === to));
  const laid = layout(nodes, known, size);
  const { placed } = laid;
  const { width, height } = applyPositions(placed, laid);
  const shapes = [...placed.values()]
    .map((item) => `<g class="notation__node" data-id="${escapeXml(item.node.id)}" data-cx="${round(item.cx)}" data-cy="${round(item.cy)}">${draw(item)}</g>`)
    .join('');
  return svgDocument(width, height, title, edgeMarkup(placed, known, style, labelOf) + shapes);
};

// Standard node sizing: label lines drive the width, minimums keep symbols recognisable.
// The text block must lie inside the outline: a rectangle needs only a margin, but the corners of the text of a diamond or an ellipse are
// cut by its edge, so those shapes grow until the whole block fits (a block of width a and height b fits a diamond of width w and height h
// when a/w + b/h <= 1, and an ellipse when (a/w)^2 + (b/h)^2 <= 1).
export const fitOutline = (outline, textW, textH, minW, minH) => {
  if (outline === 'diamond') {
    const h = Math.max(minH, 1.6 * textH + 20);
    return { w: Math.max(minW, (textW + 12) / (1 - textH / h)), h };
  }
  if (outline === 'ellipse') {
    const h = Math.max(minH, textH * 1.7 + 16);
    return { w: Math.max(minW, (textW + 14) / Math.sqrt(1 - (textH / h) ** 2)), h };
  }
  return { w: Math.max(minW, textW + 28), h: Math.max(minH, textH + 20) };
};

export const sizer = (minW, minH, outline, wrapAt) => (node) => {
  const lines = wrap(node.label, wrapAt);
  const textW = Math.max(...lines.map((line) => textWidth(line)));
  const { w, h } = fitOutline(outline, textW, lines.length * (LINE + 3), minW, minH);
  return { lines, outline, w: Math.ceil(w), h: Math.ceil(h) };
};

export const fixed = (w, h, outline, wrapAt) => (node) => ({ lines: wrap(node.label, wrapAt), outline, w, h });
