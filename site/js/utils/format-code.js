const QUOTED = /"(?:[^"\\]|\\.)*"/g;
const POSITION = /\s+pos=\S+/g;
const INDENT = '  ';

// Braces outside the quoted strings decide the depth of a line.
const bare = (line) => line.replace(QUOTED, '""');

// Indents the code by its blocks: two spaces per open brace, no trailing spaces, at most one empty line in a row, no empty lines at the ends.
export const formatCode = (source) => {
  let depth = 0;
  const lines = [];
  String(source)
    .split('\n')
    .forEach((raw) => {
      const text = raw.trim();
      if (text === '') {
        if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('');
        return;
      }
      const code = bare(text);
      if (code.startsWith('}')) depth = Math.max(0, depth - 1);
      lines.push(INDENT.repeat(depth) + text);
      const opened = (code.match(/\{/g) ?? []).length;
      const closed = (code.match(/\}/g) ?? []).length;
      depth = Math.max(0, depth + opened - closed + (code.startsWith('}') ? 1 : 0));
    });
  while (lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
};

// Removes the places written by moving blocks with the mouse (pos=XxY), so the engine lays the diagram out again.
export const clearPositions = (source) =>
  String(source)
    .split('\n')
    .map((line) =>
      line
        .split(/("(?:[^"\\]|\\.)*")/)
        .map((part, index) => (index % 2 === 0 ? part.replace(POSITION, '') : part))
        .join('')
        .trimEnd(),
    )
    .join('\n');
