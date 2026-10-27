import { KEYWORDS, TEMPLATES, NOTATIONS, parseDiagram, notationName } from '../notations/index.js';
import { formatCode } from './format-code.js';

const COMMIT_LIMIT = 50;

// Search: every place of the query in the code, with the line and the column (both from 1).
export const searchLines = (text, query, caseSensitive = false) => {
  if (query === '') return [];
  const needle = caseSensitive ? query : query.toLowerCase();
  return text.split('\n').flatMap((line, index) => {
    const hay = caseSensitive ? line : line.toLowerCase();
    const found = [];
    for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + needle.length)) found.push({ line: index + 1, column: at + 1, text: line });
    return found;
  });
};

export const replaceAll = (text, query, replacement, caseSensitive = false) => {
  const matches = searchLines(text, query, caseSensitive);
  if (matches.length === 0) return { text, count: 0 };
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { text: text.replace(new RegExp(escaped, caseSensitive ? 'g' : 'gi'), () => replacement), count: matches.length };
};

// Line diff by the longest common subsequence: the same view `git diff` gives.
export const diffLines = (before, after) => {
  const a = before === '' ? [] : before.split('\n');
  const b = after === '' ? [] : after.split('\n');
  const table = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1)
    for (let j = b.length - 1; j >= 0; j -= 1) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push({ type: 'del', text: a[i] });
      i += 1;
    } else {
      out.push({ type: 'add', text: b[j] });
      j += 1;
    }
  }
  a.slice(i).forEach((text) => out.push({ type: 'del', text }));
  b.slice(j).forEach((text) => out.push({ type: 'add', text }));
  return out;
};

export const diffText = (ops) => ops.map((op) => `${{ same: ' ', add: '+', del: '-' }[op.type]}${op.text}`).join('\n');

export const shortHash = (text) => {
  let hash = 5381;
  for (const char of text) hash = ((hash << 5) + hash + char.codePointAt(0)) >>> 0;
  return hash.toString(16).padStart(8, '0').slice(0, 7);
};

// The local history of the code: a commit keeps the whole text, the newest commit goes first.
export const addCommit = (commits, text, message, at) => {
  const last = commits[0];
  if (last && last.text === text) return { commits, added: false };
  const commit = { id: shortHash(`${text}${at}${commits.length}`), message: message.trim() || 'Без сообщения', text, at };
  return { commits: [commit, ...commits].slice(0, COMMIT_LIMIT), added: true };
};

const distance = (a, b) => {
  let row = Array.from({ length: b.length + 1 }, (_, k) => k);
  for (let i = 1; i <= a.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= b.length; j += 1) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
};

export const nearestKeyword = (word) => {
  if (word.length < 3 || KEYWORDS.has(word)) return null;
  const best = [...KEYWORDS].map((keyword) => ({ keyword, d: distance(word, keyword) })).sort((x, y) => x.d - y.d)[0];
  return best && best.d <= 2 ? best.keyword : null;
};

// Repairs what can be repaired without guessing: a mistyped keyword and a block that is not closed.
export const fixCode = (code) => {
  const lines = code.split('\n');
  const fixes = [];
  const model = parseDiagram(code);
  model.problems
    .filter((item) => item.severity === 'error' && item.code !== 'unclosed')
    .forEach((item) => {
      const match = /^(\s*)([A-Za-z]+)(.*)$/.exec(lines[item.line - 1]);
      const keyword = match && nearestKeyword(match[2]);
      if (keyword) {
        fixes.push({ line: item.line, from: match[2], to: keyword });
        lines[item.line - 1] = `${match[1]}${keyword}${match[3]}`;
      }
    });
  model.problems
    .filter((item) => item.code === 'unclosed')
    .reverse()
    .forEach((item) => {
      const next = lines.findIndex((text, index) => index >= item.line && /^\S/.test(text));
      lines.splice(next === -1 ? lines.length : next, 0, '}');
      fixes.push({ line: item.line, from: '', to: '}' });
    });
  return { code: lines.join('\n'), fixes };
};

const REPLIES = {
  help: {
    ru: 'Я умею: «исправь ошибки», «объясни диаграмму», «форматируй код», «создай <нотацию>» (например, «создай erd» или «создай idef0»).',
    en: 'I can: "fix errors", "explain the diagram", "format the code", "create <notation>" (for example "create erd" or "create idef0").',
  },
  fixed: { ru: 'Исправлено: {n}. Проверьте результат и нажмите «Запустить».', en: 'Fixed: {n}. Check the result and press Run.' },
  nothing: { ru: 'Исправлять нечего: ошибок, которые можно починить без догадок, нет.', en: 'Nothing to fix: no error can be repaired without guessing.' },
  explain: {
    ru: 'Нотация: {notation}. Название: «{title}». Строк кода: {lines}. Ошибок: {errors}, предупреждений: {warnings}.',
    en: 'Notation: {notation}. Title: "{title}". Lines of code: {lines}. Errors: {errors}, warnings: {warnings}.',
  },
  formatted: { ru: 'Код отформатирован.', en: 'Code formatted.' },
  created: {
    ru: 'Создан шаблон {name}. Он в редакторе, код можно менять.',
    en: 'The {name} template is created. It is in the editor, change the code freely.',
  },
};
const reply = (key, lang, params = {}) => REPLIES[key][lang].replace(/\{(\w+)\}/g, (_, name) => params[name]);

// The assistant works offline on the rules of the editor: no code leaves the browser.
export const assistant = (prompt, code, lang = 'ru') => {
  const ask = prompt.toLowerCase();
  if (/исправ|почин|fix|repair/.test(ask)) {
    const result = fixCode(code);
    return result.fixes.length === 0 ? { text: reply('nothing', lang) } : { text: reply('fixed', lang, { n: result.fixes.length }), code: result.code };
  }
  if (/объясн|опиши|explain|describe/.test(ask)) {
    const model = parseDiagram(code);
    const count = (severity) => model.problems.filter((item) => item.severity === severity).length;
    return {
      text: reply('explain', lang, {
        notation: notationName(model, lang),
        title: model.title || '—',
        lines: code.split('\n').filter((line) => line.trim() !== '').length,
        errors: count('error'),
        warnings: count('warning'),
      }),
    };
  }
  if (/форматир|format/.test(ask)) return { text: reply('formatted', lang), code: formatCode(code) };
  if (/созда|нарису|сгенер|create|generate|draw/.test(ask)) {
    const key = Object.keys(TEMPLATES)
      .sort((x, y) => y.length - x.length)
      .find((name) => ask.includes(name) && name in NOTATIONS);
    if (key) return { text: reply('created', lang, { name: key.toUpperCase() }), code: TEMPLATES[key] };
  }
  return { text: reply('help', lang) };
};
