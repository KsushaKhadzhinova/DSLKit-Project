// @ts-nocheck -- type-check debt: remove this line when the file passes npm run typecheck
import { NOTATIONS, parseDiagram } from '../notations/index.js';
import { exportText } from '../export/text-formats.js';
import { drawioFile, fileName, htmlFile, rasterize, serializeSvg, sizeOf } from '../utils/exporters.js';
import { readCode } from './code-lines.js';
import { notify } from './toast.js';
import { pageLanguage } from '../utils/lang.js';

const TEXT = {
  ru: {
    none: 'Нет диаграммы для экспорта: сначала нажмите «Запустить».',
    saved: (name) => `Файл ${name} сохранён.`,
    failed: 'Не удалось подготовить файл. Попробуйте ещё раз.',
    refusal: {
      empty: 'Нет диаграммы для экспорта в текст: введите код диаграммы.',
      errors: (name) => `В коде диаграммы (${name}) есть ошибки: исправьте их, иначе файл был бы неполным. Экспорт в текст отключён.`,
      notation: (name, format) => `У нотации «${name}» нет точного соответствия в ${format}: экспорт отключён, чтобы не выдать неверный файл.`,
    },
  },
  en: {
    none: 'There is no diagram to export: press Run first.',
    saved: (name) => `File ${name} saved.`,
    failed: 'The file could not be prepared. Try again.',
    refusal: {
      empty: 'There is no diagram to export as text: enter the diagram code.',
      errors: (name) => `The diagram code (${name}) has errors: fix them, or the file would be incomplete. The text export is switched off.`,
      notation: (name, format) => `The notation "${name}" has no exact mapping in ${format}: the export is switched off so that no wrong file is produced.`,
    },
  },
};
const LANGUAGE_NAME = { plantuml: 'PlantUML', mermaid: 'Mermaid' };

// The browser downloads a file when a link to a temporary address of the data is clicked.
const download = (root) => (blob, name) => {
  const { URL } = root.defaultView;
  const link = root.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  root.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

const FORMATS = {
  svg: { extension: 'svg', make: ({ svg, window }) => new window.Blob([serializeSvg(svg, window)], { type: 'image/svg+xml' }) },
  png: { extension: 'png', make: ({ svg, window }) => rasterize({ svg, window, type: 'image/png' }) },
  jpeg: { extension: 'jpg', make: ({ svg, window }) => rasterize({ svg, window, type: 'image/jpeg' }) },
  drawio: {
    extension: 'drawio',
    make: ({ svg, window, title }) =>
      new window.Blob([drawioFile({ title, svgText: serializeSvg(svg, window), ...sizeOf(svg) })], { type: 'application/vnd.jgraph.mxfile' }),
  },
  puml: { text: 'plantuml' },
  mmd: { text: 'mermaid' },
  html: {
    extension: 'html',
    make: ({ svg, window, title, source, lang }) =>
      new window.Blob([htmlFile({ title, svgText: serializeSvg(svg, window), source, lang })], { type: 'text/html' }),
  },
};

// Export buttons of the editor: the diagram that is on the canvas now becomes a file in the chosen format.
export const initExport = ({ root = document, save = download(root) } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const buttons = page ? [...page.querySelectorAll('[data-export]')] : [];
  if (buttons.length === 0) return null;
  const status = page.querySelector('.canvas__status');
  const lang = pageLanguage(root);
  const say = (text) => {
    if (status) status.textContent = text;
    notify(root, text);
  };

  const sourceNow = () => readCode(page.querySelector('.code__lines'));
  const textButtons = buttons.filter((button) => FORMATS[button.dataset.export]?.text);
  const note = page.querySelector('[data-export-note]');
  // The sentence that says why a text format is not offered, or '' when it is.
  const reasonFor = (result, format) => {
    if (result.ok) return '';
    const name = NOTATIONS[result.notation]?.name[lang] ?? '';
    return TEXT[lang].refusal[result.reason](name, LANGUAGE_NAME[format]);
  };
  // The text formats follow the code: a button that has no faithful mapping is disabled and its reason is shown.
  const syncText = () => {
    const source = sourceNow();
    let shown = '';
    textButtons.forEach((button) => {
      const format = FORMATS[button.dataset.export].text;
      const reason = reasonFor(exportText(source, format), format);
      button.setAttribute('aria-disabled', String(reason !== ''));
      button.title = reason;
      shown ||= reason;
    });
    if (note) note.textContent = shown;
    return shown;
  };

  const exportTextFile = async (format) => {
    const result = exportText(sourceNow(), FORMATS[format].text);
    if (!result.ok) {
      say(reasonFor(result, FORMATS[format].text));
      return false;
    }
    const name = fileName(parseDiagram(sourceNow()).title, result.extension);
    save(new root.defaultView.Blob([result.text], { type: result.mime }), name);
    say(TEXT[lang].saved(name));
    return true;
  };

  const exportAs = async (format) => {
    if (FORMATS[format]?.text) return exportTextFile(format);
    const svg = page.querySelector('.canvas__remote:not([hidden]) svg');
    if (!svg || !(format in FORMATS)) {
      say(TEXT[lang].none);
      return false;
    }
    const source = readCode(page.querySelector('.code__lines'));
    const { title } = parseDiagram(source);
    try {
      const blob = await FORMATS[format].make({ svg, window: root.defaultView, title, source, lang });
      const name = fileName(title, FORMATS[format].extension);
      save(blob, name);
      say(TEXT[lang].saved(name));
      return true;
    } catch {
      say(TEXT[lang].failed);
      return false;
    }
  };
  buttons.forEach((button) => button.addEventListener('click', () => exportAs(button.dataset.export)));
  page.addEventListener('dslkit:run', syncText);
  syncText();
  return { exportAs, syncText };
};
