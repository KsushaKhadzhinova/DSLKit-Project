import { ID, STR, escapeXml, problem, unquote } from './common.js';
import { INK, MUTED, svgDocument, text } from './svg.js';

const LIFELINE = new RegExp(`^lifeline\\s+(${ID})(?:\\s+${STR})?\\s+states\\s+(.+?)\\s*$`);
const EVENT = new RegExp(`^at\\s+(\\d+(?:\\.\\d+)?)\\s+(${ID})\\s+(.+?)\\s*$`);

export const parseTiming = (lines, header) => {
  const model = { notation: 'uml-timing', kind: 'timing', title: header.title, lifelines: [], events: [], problems: [] };
  lines.forEach(({ n, text: line }) => {
    let match;
    if ((match = LIFELINE.exec(line))) {
      const known = model.lifelines.find((item) => item.id === match[1]);
      if (known) model.problems.push(problem(n, 'error', 'duplicate', { id: match[1], first: known.line }));
      else model.lifelines.push({ id: match[1], label: unquote(match[2] ?? match[1]), states: match[3].split(/\s*,\s*/), line: n });
    } else if ((match = EVENT.exec(line))) {
      model.events.push({ time: Number(match[1]), lifeline: match[2], state: match[3], line: n });
    } else model.problems.push(problem(n, 'error', 'syntax', { text: line }));
  });
  model.lifelines
    .filter((item) => item.states.length < 2)
    .forEach((item) => model.problems.push(problem(item.line, 'warning', 'uml-timing-states', { id: item.id })));
  const last = new Map();
  model.events.forEach((event) => {
    const lifeline = model.lifelines.find((item) => item.id === event.lifeline);
    if (!lifeline) model.problems.push(problem(event.line, 'error', 'unknown-ref', { id: event.lifeline }));
    else if (!lifeline.states.includes(event.state))
      model.problems.push(problem(event.line, 'error', 'uml-timing-state', { id: event.lifeline, state: event.state }));
    else if (event.time < (last.get(event.lifeline) ?? 0))
      model.problems.push(problem(event.line, 'error', 'uml-timing-order', { id: event.lifeline, time: event.time }));
    else last.set(event.lifeline, event.time);
  });
  model.events = model.events.filter((event) => model.lifelines.some((item) => item.id === event.lifeline && item.states.includes(event.state)));
  model.lifelines
    .filter((item) => !model.events.some((event) => event.lifeline === item.id))
    .forEach((item) => model.problems.push(problem(item.line, 'warning', 'isolated', { id: item.id })));
  model.empty = model.lifelines.length === 0;
  return model;
};

const toPlantUml = (model) => {
  const lines = ['@startuml', ...(model.title ? [`title ${model.title.replace(/\r?\n/g, ' ')}`] : [])];
  model.lifelines.forEach((item) => lines.push(`robust "${item.label.replace(/"/g, "'")}" as ${item.id.replace(/\W+/g, '_')}`));
  [...new Set(model.events.map((event) => event.time))]
    .sort((a, b) => a - b)
    .forEach((time) => {
      lines.push(`@${time}`);
      model.events
        .filter((event) => event.time === time)
        .forEach((event) => lines.push(`${event.lifeline.replace(/\W+/g, '_')} is "${event.state.replace(/"/g, "'")}"`));
    });
  return [...lines, '@enduml'].join('\n');
};

const STEP = 26;
const render = (model) => {
  const end = Math.max(...model.events.map((event) => event.time), 1);
  const scale = 560 / end;
  const left = 150;
  let top = 70;
  const rows = model.lifelines.map((item) => {
    const height = item.states.length * STEP;
    const y = (state) => top + (item.states.indexOf(state) + 0.5) * STEP;
    const events = model.events.filter((event) => event.lifeline === item.id).sort((a, b) => a.time - b.time);
    let path = '';
    events.forEach((event, index) => {
      const x = left + event.time * scale;
      path += index === 0 ? `M${x} ${y(event.state)}` : `V${y(event.state)}`;
      const next = events[index + 1];
      path += `H${left + (next ? next.time : end) * scale}`;
    });
    const labels = item.states
      .map((state) => `<text x="${left - 10}" y="${y(state)}" dy="0.35em" text-anchor="end" font-size="11" fill="${MUTED}">${escapeXml(state)}</text>`)
      .join('');
    const block = `<g class="notation__node" data-id="${escapeXml(item.id)}">${text(50, top + height / 2, [item.label], 12, 700, '#0f172a')}${labels}<path d="M${left} ${top}V${top + height}H${left + end * scale}" fill="none" stroke="${MUTED}" stroke-width="1"/><path d="${path}" fill="none" stroke="${INK}" stroke-width="2"/></g>`;
    top += height + 34;
    return block;
  });
  return svgDocument(left + end * scale + 50, top + 10, model.title, rows.join(''));
};

export const generators = { plantuml: toPlantUml };
export { render };
