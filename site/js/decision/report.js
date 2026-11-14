import { explainResult, percent } from './methods.js';
import { formatNumber, normalizeLanguage, pick } from '../utils/lang.js';

const METHOD_NAMES = {
  ru: { wsm: 'Взвешенная сумма', ahp: 'Метод анализа иерархий (AHP)', topsis: 'TOPSIS' },
  en: { wsm: 'Weighted sum', ahp: 'Analytic hierarchy process (AHP)', topsis: 'TOPSIS' },
};
export const methodName = (method, lang) => METHOD_NAMES[normalizeLanguage(lang)][method];

const TEXTS = {
  method: { ru: 'Метод', en: 'Method' },
  criteria: { ru: 'Критерии', en: 'Criteria' },
  criterion: { ru: 'Критерий', en: 'Criterion' },
  weight: { ru: 'Вес', en: 'Weight' },
  better: { ru: 'Лучше', en: 'Better' },
  more: { ru: 'больше', en: 'more' },
  less: { ru: 'меньше', en: 'less' },
  ranking: { ru: 'Ранжирование', en: 'Ranking' },
  alternative: { ru: 'Альтернатива', en: 'Alternative' },
  score: { ru: 'Оценка', en: 'Score' },
  consistency: { ru: 'Отношение согласованности CR', en: 'Consistency ratio CR' },
  revise: { ru: ' (больше 0,1: пересмотрите сравнения)', en: ' (above 0.1: revise the comparisons)' },
};
const cell = (text) => String(text).replace(/\|/g, '/');
const clean = (text) => String(text).replace(/["\\]/g, "'").replace(/\s+/g, ' ').trim();

// The result as Markdown: the method, the weights, the ranking, the explanation and, for AHP, the consistency of the judgements.
export const toMarkdown = (problem, result, lang = 'ru') => {
  const t = (key) => pick(TEXTS[key], lang);
  const lines = [
    `# ${problem.title}`,
    '',
    `${t('method')}: ${methodName(result.method, lang)}`,
    '',
    `## ${t('criteria')}`,
    '',
    `| ${t('criterion')} | ${t('weight')} | ${t('better')} |`,
    '| --- | --- | --- |',
    ...problem.criteria.map(
      (item, index) => `| ${cell(item.name)} | ${percent(result.weights[index], lang)} | ${t(item.direction === 'max' ? 'more' : 'less')} |`,
    ),
    '',
    `## ${t('ranking')}`,
    '',
    `| # | ${t('alternative')} | ${t('score')} |`,
    '| --- | --- | --- |',
    ...result.ranking.map((item) => `| ${item.place} | ${cell(item.name)} | ${percent(item.score, lang)} |`),
    '',
    explainResult(problem, result, lang),
  ];
  if (result.method === 'ahp')
    lines.push('', `${t('consistency')} = ${formatNumber(result.cr, lang, { maximumFractionDigits: 4 })}${result.warning ? t('revise') : ''}`);
  return lines.join(String.fromCharCode(10));
};

// The result as a diagram of DSLKit (a decision tree): the task is the question, the alternatives are the outcomes in the order of the ranking.
export const toDsl = (problem, result, lang = 'ru') => {
  const out = [`diagram decision "${clean(problem.title)}"`, `question q "${clean(problem.title)}"`];
  result.ranking.forEach((item) => out.push(`outcome a${item.place} "${item.place}. ${clean(item.name)} (${percent(item.score, lang)})"`));
  result.ranking.forEach((item) => out.push(`answer q -> a${item.place} "${item.place}"`));
  return out.join(String.fromCharCode(10));
};
