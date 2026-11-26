import { NOTATIONS, parseDiagram } from '../notations/index.js';
import { declares } from './node-position.js';
import { labelOf, renameElement } from './palette.js';

// The properties of a block that the editor lets the user change by hand. The code stays the only source of truth:
// every property is read from the line that declares the block and written back into that same line.
const KEYWORD = /^(\s*)([\w-]+)(\s+)/;

const declaration = (code, id) => code.split('\n').findIndex((line) => declares(line, id));

// The keyword of the declaration of a block (`task`, `state`, `class` ...), or null when the code has no such block.
const keywordOf = (code, id) => {
  const at = declaration(code, id);
  return at < 0 ? null : KEYWORD.exec(code.split('\n')[at])[2];
};

// What can be edited: the label (when the declaration has one) and the kind (when the notation has several kinds of block
// and the block is of one of them). Colour and style are not offered: no notation of the editor writes them into the code.
export const propertiesOf = (code, id) => {
  const keyword = keywordOf(code, id);
  if (keyword === null) return null;
  const notation = parseDiagram(code).notation ?? 'idef0';
  const nodes = NOTATIONS[notation]?.nodes ?? {};
  const kinds = Object.hasOwn(nodes, keyword) && Object.keys(nodes).length > 1 ? Object.keys(nodes) : [];
  const label = labelOf(code, id);
  if (label === null && kinds.length === 0) return null;
  return { id, notation, keyword, kinds, label };
};

// The code with the label of the block changed, or null when the block has no label to change.
export const setLabel = (code, id, label) => renameElement(code, id, label);

// The code with the block declared by another keyword, or null when the keyword is not one of the notation or the notation
// does not read the block back as that kind (a port without its owner, for instance).
export const setKind = (code, id, keyword) => {
  const properties = propertiesOf(code, id);
  if (properties === null || !properties.kinds.includes(keyword)) return null;
  const lines = code.split('\n');
  const at = declaration(code, id);
  lines[at] = lines[at].replace(KEYWORD, (_, indent, word, space) => `${indent}${keyword}${space}`);
  const next = lines.join('\n');
  const node = parseDiagram(next).nodes?.find((item) => item.id === id);
  return node?.kind === NOTATIONS[properties.notation].nodes[keyword] ? next : null;
};
