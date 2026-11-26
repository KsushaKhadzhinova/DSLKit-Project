import { NOTATIONS, parseDiagram } from '../notations/index.js';
import { isColor, normalizeColor } from './color.js';
import { declares } from './node-position.js';
import { labelOf, renameElement } from './palette.js';

// The properties of a block that the editor lets the user change by hand. The code stays the only source of truth:
// every property is read from the line that declares the block and written back into that same line.
const KEYWORD = /^(\s*)([\w-]+)(\s+)/;

const POSITION = /(?:^|\s)pos=(\S+)/;
const QUOTED = /"(?:[^"\\]|\\.)*"/g;
const QUOTED_PARTS = /("(?:[^"\\]|\\.)*")/;
const COLOR_WORD = /(^|\s)color=\S*/g;
const POSITION_WORD = /(^|\s)(pos=\S+)/;

const declaration = (code, id) => code.split('\n').findIndex((line) => declares(line, id));

// The keyword of the declaration of a block (`task`, `state`, `class` ...), or null when the code has no such block.
const keywordOf = (code, id) => {
  const at = declaration(code, id);
  return at < 0 ? null : KEYWORD.exec(code.split('\n')[at])[2];
};

// The pos=XxY of the declaration of a block (written by dragging it on the board), or null when it was never placed by hand.
const positionOf = (code, id) => {
  const line = code.split('\n')[declaration(code, id)];
  return POSITION.exec(line.replace(QUOTED, '""'))?.[1] ?? null;
};

// Only the notations that are drawn from tables of shapes (the graph notations) paint a block with a colour.
export const colorSupported = (notation) => Object.hasOwn(NOTATIONS, notation ?? '') && NOTATIONS[notation].colors === true;

// The color= of the declaration of a block, or null; a text in quotes never counts.
const colorOf = (code, id) => {
  const line = code.split('\n')[declaration(code, id)];
  return /(?:^|\s)color=(\S+)/.exec(line.replace(QUOTED, '""'))?.[1] ?? null;
};

// What can be edited: the label (when the declaration has one) and the kind (when the notation has several kinds of block
// and the block is of one of them), the colour (when the notation draws blocks from shapes) and the place, which is only read.
export const propertiesOf = (code, id) => {
  const keyword = keywordOf(code, id);
  if (keyword === null) return null;
  const notation = parseDiagram(code).notation;
  const nodes = NOTATIONS[notation]?.nodes ?? {};
  const kinds = Object.hasOwn(nodes, keyword) && Object.keys(nodes).length > 1 ? Object.keys(nodes) : [];
  const label = labelOf(code, id);
  if (label === null && kinds.length === 0 && !colorSupported(notation)) return null;
  return { id, notation, keyword, kinds, label, position: positionOf(code, id), color: colorOf(code, id), colorSupported: colorSupported(notation) };
};

// The code with the label of the block changed, or null when the block has no label to change.
export const setLabel = (code, id, label) => renameElement(code, id, label);

// The code with the block declared by another keyword, or null when the keyword is not one of the kinds of the block. The parser
// of every notation reads the first declaration of an id as the kind of its keyword, so no read-back check is needed.
export const setKind = (code, id, keyword) => {
  const properties = propertiesOf(code, id);
  if (properties === null || !properties.kinds.includes(keyword)) return null;
  const lines = code.split('\n');
  const at = declaration(code, id);
  lines[at] = lines[at].replace(KEYWORD, (_, indent, word, space) => `${indent}${keyword}${space}`);
  return lines.join('\n');
};

// The code with the colour of the block written as color=#rrggbb into its line (before pos=, which the editor keeps last),
// the colour removed when it is null, or null when the colour is not valid, the block is unknown or its notation has no colours.
export const setColor = (code, id, color) => {
  const properties = propertiesOf(code, id);
  if (properties === null || !properties.colorSupported) return null;
  if (color !== null && !isColor(color)) return null;
  const lines = code.split('\n');
  const at = declaration(code, id);
  const parts = lines[at].split(QUOTED_PARTS);
  const outside = (test) => parts.findIndex((part, index) => index % 2 === 0 && test.test(part));
  parts.forEach((part, index) => {
    if (index % 2 === 0) parts[index] = part.replace(COLOR_WORD, '');
  });
  if (color !== null) {
    const value = ` color=${normalizeColor(color)}`;
    const place = outside(POSITION_WORD);
    if (place >= 0) parts[place] = parts[place].replace(POSITION_WORD, (_, space, pos) => `${value}${space}${pos}`);
    else parts[parts.length - 1] = `${parts[parts.length - 1].trimEnd()}${value}`;
  }
  lines[at] = parts.join('');
  return lines.join('\n');
};
