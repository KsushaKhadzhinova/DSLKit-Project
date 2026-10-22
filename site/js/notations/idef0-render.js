import { escapeXml, wrap } from './common.js';
import { INK, MUTED, layout, svgDocument, text } from './svg.js';

const STUB = 56;
const SHIFT_X = 90;
const SHIFT_Y = 40;
const SIDES = ['input', 'control', 'output', 'mechanism'];

// Where a slot sits on the side of a box: input left, control top, output right, mechanism bottom.
const POINT = {
  input: (p, i, n) => ({ x: p.x, y: p.y + ((i + 1) * p.h) / (n + 1) }),
  output: (p, i, n) => ({ x: p.x + p.w, y: p.y + ((i + 1) * p.h) / (n + 1) }),
  control: (p, i, n) => ({ x: p.x + ((i + 1) * p.w) / (n + 1), y: p.y }),
  mechanism: (p, i, n) => ({ x: p.x + ((i + 1) * p.w) / (n + 1), y: p.y + p.h }),
};

// Boundary stub: the arrow runs from far away into the box (outputs run out of it); the label sits next to it.
const STUBS = {
  input: (pt, label) => ({ d: `M${pt.x - STUB} ${pt.y}H${pt.x}`, lx: pt.x - STUB, ly: pt.y - 6, anchor: 'start', label }),
  control: (pt, label) => ({ d: `M${pt.x} ${pt.y - STUB}V${pt.y}`, lx: pt.x + 6, ly: pt.y - STUB / 2, anchor: 'start', label }),
  output: (pt, label) => ({ d: `M${pt.x} ${pt.y}H${pt.x + STUB}`, lx: pt.x + 4, ly: pt.y - 6, anchor: 'start', label }),
  mechanism: (pt, label) => ({ d: `M${pt.x} ${pt.y + STUB}V${pt.y}`, lx: pt.x + 6, ly: pt.y + STUB / 2, anchor: 'start', label }),
};

const ENTRY = {
  input: (from, to, mid) => `M${from.x} ${from.y}H${mid}V${to.y}H${to.x}`,
  control: (from, to) => `M${from.x} ${from.y}H${to.x}V${to.y}`,
  mechanism: (from, to) => `M${from.x} ${from.y}H${to.x}V${to.y}`,
};

const arrowTarget = (arrow) => (arrow.toPort === '' ? 'input' : arrow.toPort);

export const renderIdef0 = (model) => {
  const known = new Set(model.boxes.map((box) => box.id));
  const arrows = model.arrows.filter(
    (arrow) => known.has(arrow.from) && known.has(arrow.to) && SIDES.includes(arrowTarget(arrow)) && arrowTarget(arrow) !== 'output',
  );
  // Every box side lists its internal arrows first; the port labels that no arrow consumes become boundary stubs.
  const slots = new Map(model.boxes.map((box) => [box.id, Object.fromEntries(SIDES.map((side) => [side, []]))]));
  arrows.forEach((arrow, index) => {
    slots.get(arrow.from).output.push({ kind: 'out', index });
    slots.get(arrow.to)[arrowTarget(arrow)].push({ kind: 'in', index });
  });
  model.boxes.forEach((box) => {
    SIDES.forEach((side) => {
      const used = slots.get(box.id)[side].length;
      box.ports[side].slice(used).forEach((label) => slots.get(box.id)[side].push({ kind: 'stub', label }));
    });
  });

  const nodes = model.boxes.map((box) => ({ id: box.id, label: box.name, box }));
  const size = (node) => {
    const lines = wrap(node.label, 18);
    const mine = slots.get(node.id);
    const side = Math.max(mine.input.length, mine.output.length);
    return {
      lines,
      outline: 'box',
      w: Math.max(190, Math.max(...lines.map((line) => line.length)) * 7 + 40, (Math.max(mine.control.length, mine.mechanism.length) + 1) * 70),
      h: Math.max(110, lines.length * 18 + 60, (side + 1) * 26),
    };
  };
  const { placed, width, height } = layout(nodes, arrows, size);
  const at = (id, side, match) => {
    const list = slots.get(id)[side];
    return POINT[side](placed.get(id), list.findIndex(match), list.length);
  };

  const boxes = [...placed.values()]
    .map(({ node, x, y, w, h, lines }) => {
      const mine = slots.get(node.id);
      const stubs = SIDES.flatMap((side) =>
        mine[side]
          .map((slot, index) => ({ slot, index }))
          .filter(({ slot }) => slot.kind === 'stub')
          .map(({ slot, index }) => STUBS[side](POINT[side]({ x, y, w, h }, index, mine[side].length), slot.label)),
      )
        .map(
          (stub) =>
            `<path d="${stub.d}" fill="none" stroke="${INK}" stroke-width="1.5" marker-end="url(#m-arrow)"/>` +
            `<text x="${stub.lx}" y="${stub.ly}" text-anchor="${stub.anchor}" font-size="11" fill="${MUTED}">${escapeXml(stub.label)}</text>`,
        )
        .join('');
      return (
        `<g class="local-engine__box" data-id="${escapeXml(node.id)}"><title>${escapeXml(`${node.id} ${node.box.name}`)}</title>` +
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" stroke="${INK}" stroke-width="2"/>` +
        `${text(x + w / 2, y + h / 2, lines, 13, 700, '#0f172a')}` +
        `<text x="${x + w - 6}" y="${y + h - 6}" text-anchor="end" font-size="11" fill="${MUTED}">${escapeXml(node.id)}</text>${stubs}</g>`
      );
    })
    .join('');

  const edges = arrows
    .map((arrow, index) => {
      const side = arrowTarget(arrow);
      const from = at(arrow.from, 'output', (slot) => slot.kind === 'out' && slot.index === index);
      const to = at(arrow.to, side, (slot) => slot.kind === 'in' && slot.index === index);
      const label = model.boxes.find((box) => box.id === arrow.from).ports.output[slots.get(arrow.from).output.findIndex((slot) => slot.index === index)] ?? '';
      const d = ENTRY[side](from, to, (from.x + to.x) / 2);
      return (
        `<path class="local-engine__edge" id="edge-${index}" d="${d}" fill="none" stroke="${INK}" stroke-width="1.5" marker-end="url(#m-arrow)"/>` +
        `<text x="${from.x + 6}" y="${from.y - 6}" font-size="11" fill="${MUTED}">${escapeXml(label)}</text>`
      );
    })
    .join('');

  return svgDocument(width + SHIFT_X * 2, height + SHIFT_Y * 2, model.title, `<g transform="translate(${SHIFT_X} ${SHIFT_Y})">${edges}${boxes}</g>`);
};
