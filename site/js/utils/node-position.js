const QUOTED = /("(?:[^"\\]|\\.)*")/;
const POSITION_WORD = /(^|\s)pos=\S+/;

const round = (value) => Math.round(value * 10) / 10;
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Text outside the quoted strings, where attributes live. Odd parts of a split by the quotes are the strings themselves.
const outsideQuotes = (line) => line.split(QUOTED).map((part, index) => (index % 2 === 0 ? part : '""'));

// A line that declares the node: a keyword and the id, no arrow, not the header.
const declares = (line, id) => {
  const text = outsideQuotes(line).join('').trim();
  return !text.startsWith('diagram ') && !text.includes('->') && new RegExp(`^[\\w-]+\\s+${escapeRegExp(id)}(\\s|$)`).test(text);
};

// The line with pos=XxY: an old position is replaced, a new one is added at the end.
const withPosition = (line, value) => {
  const parts = line.split(QUOTED);
  const at = parts.findIndex((part, index) => index % 2 === 0 && POSITION_WORD.test(part));
  if (at < 0) return `${line.trimEnd()} ${value}`;
  parts[at] = parts[at].replace(POSITION_WORD, (_, space) => `${space}${value}`);
  return parts.join('');
};

// Writes the place of a node into the code. Returns the new code, or null when the code has no such node.
export const setNodePosition = (source, id, x, y) => {
  const lines = String(source).split('\n');
  const index = lines.findIndex((line) => declares(line, id));
  if (index < 0) return null;
  lines[index] = withPosition(lines[index], `pos=${round(x)}x${round(y)}`);
  return lines.join('\n');
};
