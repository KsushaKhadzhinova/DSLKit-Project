import { expertStore } from '../expert/bases.js';
import { reviewDiagram } from '../expert/review.js';

const TEXTS = {
  ru: {
    run: 'Рецензировать диаграмму',
    open: 'Открыть экспертную систему',
    summary: 'Замечаний: {n}.',
    clean: 'Замечаний нет: диаграмма прошла проверку правил.',
    why: 'Почему',
    line: 'стр. {lines}',
    high: 'важно',
    medium: 'средне',
    low: 'мелочь',
    certainty: 'уверенность {cf} %',
  },
  en: {
    run: 'Review the diagram',
    open: 'Open the expert system',
    summary: 'Remarks: {n}.',
    clean: 'No remarks: the diagram passed the rules.',
    why: 'Why',
    line: 'line {lines}',
    high: 'important',
    medium: 'medium',
    low: 'minor',
    certainty: 'certainty {cf} %',
  },
};

// The tab "Expert" under the code: the review of the diagram on the screen by the rules of the expert system, with the reasons.
export const createExpertPanel = ({ root, lang, storage, getCode }) => {
  const t = (key, params = {}) => TEXTS[lang][key].replace(/\{(\w+)\}/g, (_, name) => params[name]);
  const el = (tag, className, text) => {
    const node = root.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const store = expertStore(storage);
  const node = el('section', 'expert-panel problems__extra');
  const run = el('button', 'button button--quiet', t('run'));
  run.type = 'button';
  const link = el('a', 'button button--quiet', t('open'));
  link.href = 'expert.html';
  const summary = el('p', 'expert-panel__summary');
  summary.setAttribute('role', 'status');
  const list = el('ul', 'expert-panel__list');
  node.append(run, link, summary, list);

  const refresh = () => {
    const review = reviewDiagram(getCode(), lang, store.rules('review'));
    summary.textContent = review.recommendations.length > 0 ? t('summary', { n: review.recommendations.length }) : t('clean');
    list.replaceChildren(
      ...review.recommendations.map((item) => {
        const row = el('li', `expert-panel__item expert-panel__item--${item.priority}`);
        const where = item.lines.length > 0 ? ` (${t('line', { lines: item.lines.join(', ') })})` : '';
        row.append(el('strong', '', `${t(item.priority)}: `), root.createTextNode(`${item.text}${where}`));
        const details = el('details', 'expert-panel__why');
        details.append(el('summary', '', t('why')), el('p', '', `${item.reason} (${t('certainty', { cf: Math.round(item.cf * 100) })})`));
        row.append(details);
        return row;
      }),
    );
    return review;
  };
  run.addEventListener('click', refresh);
  return { node, refresh };
};
