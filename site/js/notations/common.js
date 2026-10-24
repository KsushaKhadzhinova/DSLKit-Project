// Shared helpers for every notation parser: line reading, header parsing, problems and text utilities.
export const ID = '[\\w.]+(?:-[\\w.]+)*';
export const STR = '"((?:[^"\\\\]|\\\\.)*)"';
const HEADER = /^diagram\s+([\w-]+)(?:\s+([\w-]+))?(?:\s+"((?:[^"\\]|\\.)*)")?\s*$/;

export const escapeXml = (text) =>
  String(text)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export const unquote = (text) => String(text).replace(/\\(.)/g, (_, char) => (char === 'n' ? '\n' : char));

export const quoteDot = (text) => `"${String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n')}"`;

export const problem = (line, severity, code, params = {}) => ({ line, severity, code, params });

// Lines with their 1-based numbers; blank lines and `//` comments are dropped.
export const sourceLines = (source) =>
  String(source)
    .split(/\r?\n/)
    .map((raw, index) => ({ n: index + 1, text: raw.trim() }))
    .filter(({ text }) => text !== '' && !text.startsWith('//'));

export const parseHeader = (text) => {
  const match = HEADER.exec(text);
  return match ? { notation: match[1].toLowerCase(), kind: (match[2] ?? '').toLowerCase(), title: unquote(match[3] ?? '') } : null;
};

// The width of a line of text in pixels, from the widths of letters in a typical sans-serif face (Helvetica, Arial), in units of the font size.
// The earlier rule of seven pixels for every character was too narrow for capitals and wide letters (W, M, Ж, Ш) and too wide for narrow ones (i, l, t),
// so a label could run over the edge of its shape or leave it half empty.
const NARROW = new Set([...` .,:;!|'\`ijlI`]);
const SLIM = new Set([...'()[]{}-/\\trf']);
const WIDE = new Set([...'mwMWЖШЩЮЫжшщюы']);
export const textWidth = (line, size = 12) =>
  [...String(line)].reduce((sum, char) => {
    let em = 0.55;
    if (NARROW.has(char)) em = 0.28;
    else if (SLIM.has(char)) em = 0.34;
    else if (WIDE.has(char)) em = 0.84;
    else if (/[0-9]/.test(char)) em = 0.56;
    else if (char !== char.toLowerCase()) em = 0.68;
    return sum + em * size;
  }, 0);

// Greedy word wrap that keeps explicit line breaks.
export const wrap = (text, width) =>
  String(text)
    .split('\n')
    .flatMap((paragraph) => {
      const rows = [''];
      paragraph.split(/\s+/).forEach((word) => {
        const last = rows[rows.length - 1];
        if (last === '') rows[rows.length - 1] = word;
        else if (last.length + 1 + word.length <= width) rows[rows.length - 1] = `${last} ${word}`;
        else rows.push(word);
      });
      return rows;
    });

// `key=value` and bare flags after a node or edge declaration.
export const parseAttrs = (tail) =>
  Object.fromEntries(
    String(tail ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => {
        const at = part.indexOf('=');
        return at < 0 ? [part, true] : [part.slice(0, at), part.slice(at + 1)];
      }),
  );

// Depth-first search for a directed cycle; returns the edges that form it, or an empty list.
export const findCycle = (edges) => {
  const state = new Map();
  const stack = [];
  const visit = (id) => {
    state.set(id, 1);
    for (const edge of edges.filter((candidate) => candidate.from === id)) {
      stack.push(edge);
      if (state.get(edge.to) === 1) return stack.slice(stack.findIndex((item) => item.from === edge.to));
      if (!state.has(edge.to)) {
        const found = visit(edge.to);
        if (found) return found;
      }
      stack.pop();
    }
    state.set(id, 2);
    return null;
  };
  for (const edge of edges) {
    if (!state.has(edge.from)) {
      const found = visit(edge.from);
      if (found) return found;
    }
  }
  return [];
};
