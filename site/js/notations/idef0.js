import { parseDsl } from '../utils/dataParser.js';
import { problem } from './common.js';

const INPUT_PORTS = ['input', 'control', 'mechanism'];
const BOX_ID = /^A-?\d+$/;
const CONTEXT = 'A-0';

const validate = (model) => {
  const out = model.skipped.map((line) => problem(line, 'error', 'syntax-short'));
  const seen = new Map();
  model.boxes.forEach((box, index) => {
    const line = model.boxLines[index];
    if (seen.has(box.id)) out.push(problem(line, 'error', 'duplicate', { id: box.id, first: seen.get(box.id) }));
    else seen.set(box.id, line);
    if (!BOX_ID.test(box.id)) out.push(problem(line, 'warning', 'idef0-id', { id: box.id }));
  });
  const known = (id) => model.boxes.some((box) => box.id === id);
  model.arrows.forEach((arrow, index) => {
    const line = model.arrowLines[index];
    [arrow.from, arrow.to].filter((id) => !known(id)).forEach((id) => out.push(problem(line, 'error', 'unknown-ref', { id })));
    if (arrow.fromPort !== '' && arrow.fromPort !== 'output') out.push(problem(line, 'error', 'idef0-arrow-from', { port: arrow.fromPort }));
    if (arrow.toPort !== '' && !INPUT_PORTS.includes(arrow.toPort)) out.push(problem(line, 'error', 'idef0-arrow-to', { port: arrow.toPort }));
  });
  model.boxes.forEach((box, index) => {
    const line = model.boxLines[index];
    const leaves = model.arrows.some((arrow) => arrow.from === box.id && (arrow.fromPort === '' || arrow.fromPort === 'output'));
    const controlled = model.arrows.some((arrow) => arrow.to === box.id && arrow.toPort === 'control');
    if (box.ports.output.length === 0 && !leaves) out.push(problem(line, 'error', 'idef0-no-output', { id: box.id }));
    if (box.ports.control.length === 0 && !controlled) out.push(problem(line, 'error', 'idef0-no-control', { id: box.id }));
  });
  const decomposed = model.boxes.filter((box) => box.id !== CONTEXT);
  if (model.boxes.length > decomposed.length && model.boxes.length > 1)
    out.push(problem(model.boxLines[model.boxes.findIndex((box) => box.id === CONTEXT)], 'warning', 'idef0-context', {}));
  if (decomposed.length > 0 && (decomposed.length < 3 || decomposed.length > 6))
    out.push(problem(model.boxLines[0], 'warning', 'idef0-count', { n: decomposed.length }));
  return out;
};

export const parseIdef0 = (source) => {
  const model = parseDsl(source);
  model.notation = 'idef0';
  model.problems = validate(model);
  model.empty = model.boxes.length === 0;
  return model;
};
