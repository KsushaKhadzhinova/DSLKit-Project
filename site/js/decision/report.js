import { explainResult } from './methods.js';

const METHOD_NAMES = {
  ru: { wsm: 'Взвешенная сумма', ahp: 'Метод анализа иерархий (AHP)', topsis: 'TOPSIS' },
  en: { wsm: 'Weighted sum', ahp: 'Analytic hierarchy process (AHP)', topsis: 'TOPSIS' },
};
export const methodName = (method, lang) => METHOD_NAMES[lang === 'en' ? 'en' : 'ru'][method];

const percent = (value) => `${Math.round(value * 1000) / 10} %`;
const cell = (text) => String(text).replace(/\|/g, '/');
const clean = (text) => String(text).replace(/["\\]/g, "'").replace(/\s+/g, ' ').trim();

// The result as Markdown: the method, the weights, the ranking, the explanation and, for AHP, the consistency of the judgements.
export const toMarkdown = (problem, result, lang = 'ru') => {
  const en = lang === 'en';
  const lines = [
    `# ${problem.title}`,
    '',
    `${en ? 'Method' : 'Метод'}: ${methodName(result.method, lang)}`,
    '',
    `## ${en ? 'Criteria' : 'Критерии'}`,
    '',
    `| ${en ? 'Criterion' : 'Критерий'} | ${en ? 'Weight' : 'Вес'} | ${en ? 'Better' : 'Лучше'} |`,
    '| --- | --- | --- |',
    ...problem.criteria.map(
      (item, index) =>
        `| ${cell(item.name)} | ${percent(result.weights[index])} | ${item.direction === 'max' ? (en ? 'more' : 'больше') : en ? 'less' : 'меньше'} |`,
    ),
    '',
    `## ${en ? 'Ranking' : 'Ранжирование'}`,
    '',
    `| # | ${en ? 'Alternative' : 'Альтернатива'} | ${en ? 'Score' : 'Оценка'} |`,
    '| --- | --- | --- |',
    ...result.ranking.map((item) => `| ${item.place} | ${cell(item.name)} | ${percent(item.score)} |`),
    '',
    explainResult(problem, result, lang),
  ];
  if (result.method === 'ahp')
    lines.push(
      '',
      `${en ? 'Consistency ratio CR' : 'Отношение согласованности CR'} = ${result.cr}${result.warning ? (en ? ' (above 0.1: revise the comparisons)' : ' (больше 0,1: пересмотрите сравнения)') : ''}`,
    );
  return lines.join(String.fromCharCode(10));
};

// The result as a diagram of DSLKit (a decision tree): the task is the question, the alternatives are the outcomes in the order of the ranking.
export const toDsl = (problem, result) => {
  const out = [`diagram decision "${clean(problem.title)}"`, `question q "${clean(problem.title)}"`];
  result.ranking.forEach((item) => out.push(`outcome a${item.place} "${item.place}. ${clean(item.name)} (${percent(item.score)})"`));
  result.ranking.forEach((item) => out.push(`answer q -> a${item.place} "${item.place}"`));
  return out.join(String.fromCharCode(10));
};
