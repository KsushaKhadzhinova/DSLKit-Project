import { KEYWORDS } from '../notations/index.js';

// One line of code as the editor draws it: indentation, an optional keyword span, the rest.
export const createCodeLine = (root, text) => {
  const item = root.createElement('li');
  item.className = 'code__line';
  const code = root.createElement('code');
  const [, indent, word, rest] = /^(\s*)([a-z]*)(.*)$/.exec(text);
  code.append(indent);
  if (KEYWORDS.has(word)) {
    const keyword = root.createElement('span');
    keyword.className = 'code__keyword';
    keyword.textContent = word;
    code.append(keyword, rest);
  } else code.append(word + rest);
  item.append(code);
  return item;
};

export const showCode = (root, codeLines, text) => codeLines.replaceChildren(...text.split('\n').map((line) => createCodeLine(root, line)));

export const readCode = (codeLines) => [...codeLines.querySelectorAll('.code__line code')].map((line) => line.textContent).join('\n');
