import { COLOR, unquote } from '../notations/common.js';
import { QUOTED, declares, setNodePosition } from './node-position.js';

const HEAD = /^(\s*)([\w-]+)(\s+)(\S+)(.*)$/;
const COLOR_WORD = /(^|\s)color=\S+/;

const escapeLabel = (text) => text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');

// A declaration line cut into its parts: `task t "Label" color=#fff pos=1x2` is the keyword, the id, the label and the attributes.
const cut = (line) => {
  const parts = line.split(QUOTED);
  const [, indent, keyword, gap, id, between] = HEAD.exec(parts[0]);
  const labelled = parts.length > 1 && between.trim() === '';
  return {
    indent,
    keyword,
    gap,
    id,
    label: labelled ? unquote(parts[1].slice(1, -1)) : '',
    attrs: labelled ? parts.slice(2).join('') : between + parts.slice(1).join(''),
  };
};

const join = ({ indent, keyword, gap, id, label, attrs }) => `${indent}${keyword}${gap}${id}${label === '' ? '' : ` "${escapeLabel(label)}"`}${attrs}`;

const findLine = (lines, id) => lines.findIndex((line) => declares(line, id));

// What the properties panel shows about a node: its keyword (the shape), label and colour. Null when the code has no such node.
export const readNode = (source, id) => {
  const lines = String(source).split('\n');
  const index = findLine(lines, id);
  if (index < 0) return null;
  const { keyword, label, attrs } = cut(lines[index]);
  const colour = COLOR_WORD.exec(attrs);
  return { keyword, label, color: colour ? colour[0].trim().slice('color='.length) : null };
};

// Writes the changes of the panel into the line of the node: `label` (text), `color` (#rgb, #rrggbb or null to remove), `kind` (the keyword)
// and `x`, `y` (the place of the centre). Returns the new code, or null when the node is missing or a value is not acceptable.
export const editNode = (source, id, changes) => {
  const lines = String(source).split('\n');
  const index = findLine(lines, id);
  if (index < 0) return null;
  const part = cut(lines[index]);
  if ('label' in changes) {
    if (typeof changes.label !== 'string') return null;
    part.label = changes.label.trim() === id ? '' : changes.label.trim();
  }
  if ('kind' in changes) {
    if (typeof changes.kind !== 'string' || !/^[\w-]+$/.test(changes.kind)) return null;
    part.keyword = changes.kind;
  }
  if ('color' in changes) {
    if (changes.color !== null && !COLOR.test(String(changes.color))) return null;
    part.attrs = part.attrs.replace(COLOR_WORD, '') + (changes.color === null ? '' : ` color=${changes.color}`);
  }
  lines[index] = join(part);
  const next = lines.join('\n');
  return 'x' in changes || 'y' in changes ? setNodePosition(next, id, changes.x, changes.y) : next;
};
