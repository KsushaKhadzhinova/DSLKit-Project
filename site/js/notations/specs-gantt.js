import { colorOf, escapeXml, findCycle, problem, textWidth } from './common.js';
import { defineGraph } from './graph.js';
import { INK, MUTED, svgDocument } from './svg.js';

const NUMBER = /^\d+(?:\.\d+)?$/;
const numberOf = (value) => (NUMBER.test(String(value)) ? Number(value) : null);
const round = (value) => Math.round(value * 10) / 10;

// A task is a bar of `days` days; a milestone is a point without length. Both may name their `start` day, otherwise the start follows
// the end of the latest task they depend on (and is day 0 for a task nothing leads to).
const parseGantt = defineGraph({
  notation: 'gantt',
  nodes: { task: 'task', milestone: 'milestone' },
  edges: { depends: 'depends' },
  kinds: {},
  edgeKinds: {},
  init: (node) => ({
    ...node,
    start: numberOf(node.attrs.start),
    days: node.kind === 'milestone' ? 0 : (numberOf(node.attrs.days) ?? 1),
    done: Math.min(numberOf(node.attrs.done) ?? 0, 100),
  }),
  validate: (model) => {
    const out = [];
    model.nodes.forEach((node) => {
      ['start', 'days', 'done'].forEach((name) => {
        const given = node.attrs[name];
        if (given !== undefined && (numberOf(given) === null || (name === 'done' && numberOf(given) > 100)))
          out.push(problem(node.line, 'warning', 'gantt-number', { id: node.id, name, value: given === true ? '' : given }));
      });
    });
    const cycle = findCycle(model.edges);
    if (cycle.length > 0) out.push(problem(cycle[0].line, 'error', 'gantt-cycle', { path: cycle.map((edge) => edge.from).join(' → ') }));
    else {
      const slots = schedule(model).slots;
      model.edges.forEach((edge) => {
        const to = model.nodes.find((node) => node.id === edge.to);
        if (to.start !== null && to.start < slots.get(edge.from).end)
          out.push(problem(edge.line, 'warning', 'gantt-early', { id: to.id, from: edge.from, day: slots.get(edge.from).end }));
      });
    }
    return out;
  },
}).parse;

// Places every node on the time axis. Dependencies push a node right; the passes are bounded, so a loop can never hang the page.
export const schedule = (model) => {
  const slots = new Map(model.nodes.map((node) => [node.id, { start: node.start ?? 0, end: (node.start ?? 0) + node.days }]));
  const preds = (id) => model.edges.filter((edge) => edge.to === id).map((edge) => slots.get(edge.from));
  for (let pass = 0; pass <= model.nodes.length; pass += 1)
    model.nodes.forEach((node) => {
      const start = node.start ?? Math.max(0, ...preds(node.id).map((slot) => slot.end));
      slots.set(node.id, { start, end: start + node.days });
    });
  const length = Math.max(0, ...[...slots.values()].map((slot) => slot.end));
  return { slots, length, critical: criticalNodes(model, slots, length) };
};

// The critical path: nodes that cannot slip without moving the end of the project (no slack). A loop has no such path.
const criticalNodes = (model, slots, length) => {
  if (findCycle(model.edges).length > 0) return new Set();
  const latest = new Map();
  const lateStart = (id) => {
    if (!latest.has(id)) {
      const next = model.edges.filter((edge) => edge.from === id).map((edge) => lateStart(edge.to));
      latest.set(id, Math.min(length, ...next) - model.nodes.find((node) => node.id === id).days);
    }
    return latest.get(id);
  };
  return new Set(model.nodes.filter((node) => Math.abs(lateStart(node.id) - slots.get(node.id).start) < 1e-9).map((node) => node.id));
};

const COLORS = { task: { base: '#dbeafe', done: '#2563eb', line: '#1d4ed8' }, critical: { base: '#fde68a', done: '#f59e0b', line: '#b45309' } };
const ROW = 34;
const BAR = 18;
const MARGIN = 40;
const TOP = MARGIN + 32;
// The distance between grid lines: 1, 2, 5, 10, 20, 50 ... days, the first that leaves at least 38 pixels between two lines.
const gridStep = (perDay) => {
  const wanted = 38 / perDay;
  const base = 10 ** Math.floor(Math.log10(wanted));
  return [1, 2, 5, 10].map((times) => times * base).find((step) => step >= wanted);
};

const render = (model) => {
  const { slots, length, critical } = schedule(model);
  const labelWidth = Math.min(300, Math.max(120, ...model.nodes.map((node) => textWidth(node.label) + 20)));
  const perDay = Math.min(48, 520 / Math.max(length, 1));
  const step = gridStep(perDay);
  const end = Math.max(Math.ceil(length / step) * step, step);
  const left = MARGIN + labelWidth;
  const x = (day) => round(left + day * perDay);
  const rowY = (index) => TOP + 24 + index * ROW;
  const bottom = rowY(model.nodes.length);

  const bands = model.nodes.map((node, index) => (index % 2 === 0 ? `<rect x="${MARGIN}" y="${rowY(index)}" width="${x(end) - MARGIN}" height="${ROW}" fill="#f8fafc"/>` : '')).join('');
  const ticks = [];
  for (let day = 0; day <= end; day += step)
    ticks.push(
      `<path d="M${x(day)} ${TOP + 14}V${bottom}" stroke="#cbd5e1" stroke-width="1"/><text x="${x(day)}" y="${TOP + 8}" text-anchor="middle" font-size="11" fill="${MUTED}">${day}</text>`,
    );

  const bars = model.nodes
    .map((node, index) => {
      const slot = slots.get(node.id);
      const cy = rowY(index) + ROW / 2;
      const colors = COLORS[critical.has(node.id) ? 'critical' : 'task'];
      const own = colorOf(node);
      const line = own ?? colors.line;
      const fill = own ?? colors.done;
      const title = `<title>${escapeXml(node.label)}: ${slot.start}–${slot.end}</title>`;
      const label = `<text x="${MARGIN + 8}" y="${cy}" dy="0.35em" font-size="12" fill="${INK}">${escapeXml(node.label)}</text>`;
      if (node.kind === 'milestone')
        return `<g class="notation__node" data-id="${escapeXml(node.id)}">${title}${label}<path d="M${x(slot.start)} ${cy - 10}L${x(slot.start) + 10} ${cy}L${x(slot.start)} ${cy + 10}L${x(slot.start) - 10} ${cy}Z" fill="${own ?? INK}" stroke="${own ?? INK}" stroke-width="1.5"/></g>`;
      const width = Math.max(node.days * perDay, 3);
      const progress = round((width * node.done) / 100);
      return (
        `<g class="notation__node" data-id="${escapeXml(node.id)}">${title}${label}` +
        `<rect x="${x(slot.start)}" y="${cy - BAR / 2}" width="${round(width)}" height="${BAR}" rx="4" fill="${own ?? colors.base}" fill-opacity="${own ? 0.3 : 1}" stroke="${line}" stroke-width="1.5"/>` +
        (progress > 0 ? `<rect x="${x(slot.start)}" y="${cy - BAR / 2}" width="${progress}" height="${BAR}" rx="4" fill="${fill}"/>` : '') +
        `</g>`
      );
    })
    .join('');

  const links = model.edges
    .map((edge) => {
      const from = slots.get(edge.from);
      const to = slots.get(edge.to);
      const ay = rowY(model.nodes.findIndex((node) => node.id === edge.from)) + ROW / 2;
      const by = rowY(model.nodes.findIndex((node) => node.id === edge.to)) + ROW / 2;
      const ax = x(from.end) + (model.nodes.find((node) => node.id === edge.from).kind === 'milestone' ? 10 : 0);
      const bx = x(to.start) - (model.nodes.find((node) => node.id === edge.to).kind === 'milestone' ? 10 : 0);
      const middle = round((ay + by) / 2 + (ay < by ? 0 : ROW / 2));
      const d = bx >= ax + 12 ? `M${ax} ${ay}H${ax + 6}V${by}H${bx}` : `M${ax} ${ay}H${ax + 6}V${middle}H${bx - 6}V${by}H${bx}`;
      return `<path class="notation__edge" d="${d}" fill="none" stroke="${INK}" stroke-width="1.2" marker-end="url(#m-arrow)"/>`;
    })
    .join('');

  return svgDocument(x(end) + MARGIN, bottom + MARGIN, model.title, bands + ticks.join('') + links + bars);
};

const BASE_DATE = Date.UTC(2026, 0, 1);
const dateOf = (day) => new Date(BASE_DATE + Math.round(day) * 86400000).toISOString().slice(0, 10);
const wordOf = (model) => new Map(model.nodes.map((node, index) => [node.id, `t${index}`]));
const predecessors = (model, id) => model.edges.filter((edge) => edge.to === id).map((edge) => edge.from);

const toMermaid = (model) => {
  const names = wordOf(model);
  const { slots, critical } = schedule(model);
  const plain = (text) => String(text).replace(/[:;#\r\n]+/g, ' ');
  const lines = ['gantt', ...(model.title ? [`  title ${plain(model.title)}`] : []), '  dateFormat YYYY-MM-DD', '  axisFormat %d', '  section Plan'];
  model.nodes.forEach((node) => {
    const before = predecessors(model, node.id);
    const flags = [node.kind === 'milestone' ? 'milestone' : '', critical.has(node.id) ? 'crit' : '', node.done >= 100 ? 'done' : ''].filter(Boolean);
    const start = node.start === null && before.length > 0 ? `after ${before.map((id) => names.get(id)).join(' ')}` : dateOf(slots.get(node.id).start);
    const length = `${Math.max(Math.round(node.days), node.kind === 'milestone' ? 0 : 1)}d`;
    lines.push(`  ${plain(node.label)} :${[...flags, names.get(node.id), start, length].join(', ')}`);
  });
  return lines.join('\n');
};

const toPlantUml = (model) => {
  const names = wordOf(model);
  const { slots } = schedule(model);
  const plain = (text) => String(text).replace(/[[\]\r\n]+/g, ' ');
  const lines = ['@startgantt', ...(model.title ? [`title ${plain(model.title)}`] : []), `Project starts ${dateOf(0)}`];
  model.nodes.forEach((node) => {
    const name = `[${names.get(node.id)}]`;
    const before = predecessors(model, node.id).sort((x, y) => slots.get(y).end - slots.get(x).end);
    const when = before.length > 0 && node.start === null ? `at [${names.get(before[0])}]'s end` : dateOf(slots.get(node.id).start);
    if (node.kind === 'milestone') lines.push(`[${plain(node.label)}] as ${name} happens ${when}`);
    else lines.push(`[${plain(node.label)}] as ${name} lasts ${Math.max(Math.round(node.days), 1)} days`, `${name} starts ${when}`);
    if (node.done > 0) lines.push(`${name} is ${Math.round(node.done)}% completed`);
  });
  return [...lines, '@endgantt'].join('\n');
};

export const gantt = { parse: parseGantt, generators: { plantuml: toPlantUml, mermaid: toMermaid }, render, kinds: ['task', 'milestone'] };
