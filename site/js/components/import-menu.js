import { importDiagram } from '../utils/import-diagram.js';
import { showCode } from './code-lines.js';

const KINDS = {
  ru: { flowchart: 'блок-схема', sequence: 'диаграмма последовательности', state: 'диаграмма состояний', dsl: 'код DSLKit' },
  en: { flowchart: 'flowchart', sequence: 'sequence diagram', state: 'state diagram', dsl: 'DSLKit code' },
};
const TEXT = {
  ru: {
    done: (kind) => `Импортировано: ${kind}.`,
    skipped: (list) => ` Не перенесено: ${list.join(', ')}.`,
    empty: 'В тексте нет диаграммы для импорта.',
    unknown: 'Формат не распознан: нужен текст Mermaid или PlantUML.',
    unsupported: (name) => `Диаграмма «${name}» пока не поддерживается: импортируются блок-схемы, диаграммы последовательности и состояний.`,
    unreadable: 'Не удалось прочитать файл или буфер обмена.',
  },
  en: {
    done: (kind) => `Imported: ${kind}.`,
    skipped: (list) => ` Not carried over: ${list.join(', ')}.`,
    empty: 'There is no diagram to import in the text.',
    unknown: 'The format is not recognised: Mermaid or PlantUML text is needed.',
    unsupported: (name) => `The diagram "${name}" is not supported yet: flowcharts, sequence diagrams and state diagrams are imported.`,
    unreadable: 'The file or the clipboard could not be read.',
  },
};

// Import into the editor: a file or the clipboard with Mermaid or PlantUML text becomes DSLKit code that replaces the code on the screen.
export const initImport = ({ root = document, readClipboard } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const buttons = page ? [...page.querySelectorAll('[data-import]')] : [];
  const codeLines = page?.querySelector('.code__lines');
  if (buttons.length === 0 || !codeLines) return null;
  const status = page.querySelector('.canvas__status');
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const words = TEXT[lang];
  const input = page.querySelector('.editor-import__file');
  const clipboard = readClipboard ?? (() => root.defaultView.navigator.clipboard.readText());
  const say = (text) => {
    if (status) status.textContent = text;
  };

  const load = (source) => {
    const result = importDiagram(source);
    if (!result.ok) {
      say(result.reason === 'unsupported' ? words.unsupported(result.name) : words[result.reason]);
      return false;
    }
    showCode(root, codeLines, result.dsl);
    page.dispatchEvent(new root.defaultView.CustomEvent('dslkit:run', { bubbles: true }));
    say(words.done(KINDS[lang][result.kind]) + (result.skipped.length > 0 ? words.skipped(result.skipped) : ''));
    return true;
  };

  const importFrom = async (read) => {
    try {
      return load(await read());
    } catch {
      say(words.unreadable);
      return false;
    }
  };

  page.querySelector('[data-import="file"]')?.addEventListener('click', () => input?.click());
  page.querySelector('[data-import="clipboard"]')?.addEventListener('click', () => importFrom(clipboard));
  input?.addEventListener('change', async () => {
    const [file] = input.files;
    if (file) await importFrom(() => file.text());
    input.value = '';
  });
  return { load, importFrom };
};
