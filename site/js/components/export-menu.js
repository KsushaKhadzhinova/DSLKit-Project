import { parseDiagram } from '../notations/index.js';
import { drawioFile, fileName, htmlFile, rasterize, serializeSvg, sizeOf } from '../utils/exporters.js';
import { readCode } from './code-lines.js';

const TEXT = {
  ru: {
    none: 'Нет диаграммы для экспорта: сначала нажмите «Запустить».',
    saved: (name) => `Файл ${name} сохранён.`,
    failed: 'Не удалось подготовить файл. Попробуйте ещё раз.',
  },
  en: { none: 'There is no diagram to export: press Run first.', saved: (name) => `File ${name} saved.`, failed: 'The file could not be prepared. Try again.' },
};

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
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const say = (text) => {
    if (status) status.textContent = text;
  };

  const exportAs = async (format) => {
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
  return { exportAs };
};
