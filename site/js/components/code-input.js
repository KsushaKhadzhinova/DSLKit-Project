import { readCode, showCode } from './code-lines.js';

export const RUN_DELAY_MS = 350;
const INDENT = '  ';

const CURSOR_TEXT = {
  ru: (line, column) => `стр. ${line}, стлб. ${column}`,
  en: (line, column) => `line ${line}, col. ${column}`,
};
const CURSOR_PATTERN = { ru: /стр\. \d+, стлб\. \d+/, en: /line \d+, col\. \d+/ };

// The code of the editor is typed into a text field that lies over the coloured lines: the field is what the user edits, the lines are what the user sees.
// Both always hold the same text, so templates, import, undo and the palette (which write the lines) change the field too.
export const initCodeInput = ({ root = document, setTimer = setTimeout, clearTimer = clearTimeout } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const input = page?.querySelector('.code__input');
  const codeLines = page?.querySelector('.code__lines');
  if (!input || !codeLines) return null;
  const view = root.defaultView;
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const cursor = page.querySelector('.editor-status__cursor');
  let timer = null;

  const fit = () => {
    input.style.width = `${Math.max(codeLines.scrollWidth, input.parentElement.clientWidth)}px`;
    input.style.height = `${codeLines.scrollHeight + 8}px`;
  };

  const position = () => {
    const before = input.value.slice(0, input.selectionStart);
    const lines = before.split('\n');
    return { line: lines.length, column: lines[lines.length - 1].length + 1 };
  };
  const showCursor = () => {
    if (!cursor) return;
    const { line, column } = position();
    cursor.textContent = cursor.textContent.replace(CURSOR_PATTERN[lang], CURSOR_TEXT[lang](line, column));
  };

  // The lines changed from outside (a template, an import, undo, the palette): the field follows.
  const pull = () => {
    const text = readCode(codeLines);
    if (input.value !== text) input.value = text;
    fit();
  };
  new view.MutationObserver(pull).observe(codeLines, { childList: true, subtree: true, characterData: true });
  pull();

  // The user typed: the lines are drawn again and, after a short pause, the drawing and the problems are updated.
  const run = () => {
    timer = null;
    page.dispatchEvent(new view.CustomEvent('dslkit:run', { bubbles: true }));
  };
  const change = () => {
    showCode(root, codeLines, input.value);
    if (timer !== null) clearTimer(timer);
    timer = setTimer(run, RUN_DELAY_MS);
    showCursor();
  };
  input.addEventListener('input', change);

  // Tab writes an indent, Enter keeps the indent of the line and adds one more after an opening brace.
  const insert = (text) => {
    input.setRangeText(text, input.selectionStart, input.selectionEnd, 'end');
    change();
  };
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      insert(INDENT);
    } else if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      event.preventDefault();
      const start = input.value.lastIndexOf('\n', input.selectionStart - 1) + 1;
      const head = input.value.slice(start, input.selectionStart);
      const indent = /^\s*/.exec(head)[0];
      insert(`\n${indent}${head.trimEnd().endsWith('{') ? INDENT : ''}`);
    } else if (event.key === '}' && !event.ctrlKey && !event.metaKey) {
      // A closing brace on an indented empty line steps one indent back.
      const start = input.value.lastIndexOf('\n', input.selectionStart - 1) + 1;
      const head = input.value.slice(start, input.selectionStart);
      if (head !== '' && head.trim() === '' && head.endsWith(INDENT)) input.setSelectionRange(input.selectionStart - INDENT.length, input.selectionStart);
    }
  });
  ['keyup', 'click', 'focus'].forEach((name) => input.addEventListener(name, showCursor));

  // A link of the problems panel puts the cursor on the line of the problem.
  page.addEventListener('click', (event) => {
    const link = event.target.closest('.problems__location');
    const line = /#line-(\d+)/.exec(link?.getAttribute('href') ?? '')?.[1];
    if (!line) return;
    event.preventDefault();
    const offset =
      input.value
        .split('\n')
        .slice(0, Number(line) - 1)
        .join('\n').length + (Number(line) > 1 ? 1 : 0);
    input.focus();
    input.setSelectionRange(offset, offset);
    showCursor();
  });

  return { input, pull, position, pending: () => timer !== null };
};
