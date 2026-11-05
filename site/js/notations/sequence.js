import { ID, STR, escapeXml, problem, unquote } from './common.js';
import { INK, MUTED, SHAPES, svgDocument, text } from './svg.js';

const PARTICIPANT = new RegExp(`^(participant|actor)\\s+(${ID})(?:\\s+${STR})?\\s*$`);
const MESSAGE = new RegExp(`^(${ID})\\s*(-->|->>|->)\\s*(${ID})\\s*(?::\\s*(.*?))?\\s*$`);
const KINDS = { '->': 'sync', '->>': 'async', '-->': 'return' };

// Messages keep the order of the lines: that order is the time axis of the diagram.
export const parseSequence = (lines, header) => {
  const model = { notation: 'uml-sequence', kind: 'sequence', title: header.title, participants: [], messages: [], problems: [] };
  lines.forEach(({ n, text: line }) => {
    let match;
    if ((match = PARTICIPANT.exec(line))) {
      const known = model.participants.find((item) => item.id === match[2]);
      if (known) model.problems.push(problem(n, 'error', 'duplicate', { id: match[2], first: known.line }));
      else model.participants.push({ id: match[2], label: unquote(match[3] ?? match[2]), kind: match[1], line: n });
    } else if ((match = MESSAGE.exec(line))) {
      model.messages.push({ from: match[1], to: match[3], kind: KINDS[match[2]], text: match[4] ?? '', line: n });
    } else model.problems.push(problem(n, 'error', 'syntax', { text: line }));
  });
  const known = (id) => model.participants.some((item) => item.id === id);
  model.messages.forEach((message) => {
    [message.from, message.to].filter((id) => !known(id)).forEach((id) => model.problems.push(problem(message.line, 'error', 'unknown-ref', { id })));
  });
  model.messages = model.messages.filter((message) => known(message.from) && known(message.to));
  const calls = [];
  model.messages.forEach((message) => {
    if (message.kind === 'return') {
      const at = calls.findIndex((call) => call.from === message.to && call.to === message.from);
      if (at < 0) model.problems.push(problem(message.line, 'warning', 'seq-return', { from: message.from, to: message.to }));
      else calls.splice(at, 1);
    } else calls.push(message);
  });
  model.participants
    .filter((item) => !model.messages.some((message) => message.from === item.id || message.to === item.id))
    .forEach((item) => model.problems.push(problem(item.line, 'warning', 'isolated', { id: item.id })));
  model.empty = model.participants.length === 0;
  return model;
};

const word = (id) => `p${id.replace(/\W+/g, '_')}`;
const clean = (value) => String(value).replace(/"/g, "'");

const toMermaid = (model) => {
  const arrows = { sync: '->>', async: '-)', return: '-->>' };
  return [
    'sequenceDiagram',
    ...model.participants.map((item) => `  ${item.kind} ${word(item.id)} as ${clean(item.label)}`),
    ...model.messages.map((message) => `  ${word(message.from)}${arrows[message.kind]}${word(message.to)}: ${message.text || '-'}`),
  ].join('\n');
};

const toPlantUml = (model) => {
  const arrows = { sync: '->', async: '->>', return: '-->' };
  return [
    '@startuml',
    ...(model.title ? [`title ${clean(model.title)}`] : []),
    ...model.participants.map((item) => `${item.kind} "${clean(item.label)}" as ${word(item.id)}`),
    ...model.messages.map((message) => `${word(message.from)} ${arrows[message.kind]} ${word(message.to)} : ${message.text}`),
    '@enduml',
  ].join('\n');
};

const COLUMN = 170;
const ROW = 44;
const TOP = 90;
const STYLE = {
  sync: { dash: '', marker: 'arrow' },
  async: { dash: '', marker: 'open' },
  return: { dash: ' stroke-dasharray="6 4"', marker: 'open' },
};

const render = (model) => {
  const x = new Map(model.participants.map((item, index) => [item.id, 60 + index * COLUMN]));
  const width = 120 + Math.max(model.participants.length - 1, 0) * COLUMN;
  const height = TOP + 40 + model.messages.length * ROW;
  const heads = model.participants
    .map((item) => {
      const cx = x.get(item.id);
      const head =
        item.kind === 'actor'
          ? SHAPES.actor({ cx, y: 44, lines: [item.label] })
          : `<rect x="${cx - 60}" y="46" width="120" height="30" fill="#ffffff" stroke="${INK}" stroke-width="1.5"/>${text(cx, 61, [item.label], 12, 700, '#0f172a')}`;
      return `<g class="notation__node" data-id="${escapeXml(item.id)}">${head}<path d="M${cx} ${item.kind === 'actor' ? 112 : 76}V${height - 20}" stroke="${MUTED}" stroke-dasharray="5 5"/></g>`;
    })
    .join('');
  const messages = model.messages
    .map((message, index) => {
      const y = TOP + 30 + index * ROW;
      const a = x.get(message.from);
      const b = x.get(message.to);
      const look = STYLE[message.kind];
      const path = message.from === message.to ? `M${a} ${y - 8}H${a + 34}V${y + 8}H${a + 2}` : `M${a} ${y}H${b}`;
      const labelX = message.from === message.to ? a + 40 : (a + b) / 2;
      const anchor = message.from === message.to ? 'start' : 'middle';
      return (
        `<path class="notation__edge" d="${path}" fill="none" stroke="${INK}" stroke-width="1.5"${look.dash} marker-end="url(#m-${look.marker})"/>` +
        `<text x="${labelX}" y="${y - 10}" text-anchor="${anchor}" font-size="12" fill="${INK}">${escapeXml(message.text)}</text>`
      );
    })
    .join('');
  return svgDocument(width, height, model.title, heads + messages);
};

export const generators = { mermaid: toMermaid, plantuml: toPlantUml };
export { render };
