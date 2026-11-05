import { SAATY_SCALE, explainResult, problemErrors, reciprocal, sensitivity, solve } from '../decision/methods.js';
import { methodName, toDsl, toMarkdown } from '../decision/report.js';
import { createDecisionStore } from '../decision/store.js';
import { TASK_KEYS, TASKS, taskProblem } from '../decision/tasks.js';
import { currentUser } from '../storage/accounts.js';
import { notify } from './toast.js';

const TEXTS = {
  ru: {
    template: 'Шаблон задачи',
    method: 'Метод',
    criteria: 'Критерии и оценки',
    criterion: 'Критерий {n}: название',
    weight: 'Вес критерия {n}',
    direction: 'Что лучше для критерия {n}',
    more: 'больше',
    less: 'меньше',
    alternative: 'Альтернатива {n}: название',
    score: 'Оценка {a} по критерию {c}',
    removeCriterion: 'Убрать критерий {n}',
    removeAlternative: 'Убрать альтернативу {n}',
    addCriterion: 'Добавить критерий',
    addAlternative: 'Добавить альтернативу',
    alternatives: 'Альтернативы',
    pairs: 'Попарные сравнения критериев (шкала Саати)',
    pair: 'Насколько «{a}» важнее «{b}»',
    consistency: 'Отношение согласованности CR = {cr}, λmax = {lambda}.',
    inconsistent: 'CR больше 0,1: суждения противоречивы, пересмотрите сравнения.',
    consistent: 'Суждения согласованы (CR не больше 0,1).',
    result: 'Результат',
    ranking: 'Ранжирование',
    bars: 'Оценки альтернатив: {list}',
    sensitivity: 'Анализ чувствительности',
    sensitivityHint: 'Победитель при весе критерия 0, 0,1 … 1 (остальные веса сохраняют пропорции).',
    stable: 'победитель не меняется',
    changes: 'победитель меняется при весе {list}',
    export: 'Экспорт',
    copyMd: 'Скопировать Markdown',
    copyDsl: 'Скопировать диаграмму DSLKit',
    copied: 'Скопировано.',
    copyFailed: 'Не удалось скопировать.',
    open: 'Открыть диаграмму в редакторе',
    saveName: 'Название для сохранения',
    save: 'Сохранить задачу',
    saved: 'Задача «{name}» сохранена.',
    saveFailed: 'Не удалось сохранить: введите название.',
    storage: 'Не удалось сохранить: нет места в браузере.',
    savedList: 'Сохранённые задачи',
    savedEmpty: 'Сохранённых задач пока нет.',
    load: 'Открыть',
    remove: 'Удалить',
    loaded: 'Задача «{name}» открыта.',
    removed: 'Задача удалена.',
    invalid: 'Задачу нельзя решить: нужны хотя бы один критерий с весом и две альтернативы с числовыми оценками.',
    place: 'место',
  },
  en: {
    template: 'Task template',
    method: 'Method',
    criteria: 'Criteria and scores',
    criterion: 'Criterion {n}: name',
    weight: 'Weight of criterion {n}',
    direction: 'What is better for criterion {n}',
    more: 'more',
    less: 'less',
    alternative: 'Alternative {n}: name',
    score: 'Score of {a} on {c}',
    removeCriterion: 'Remove criterion {n}',
    removeAlternative: 'Remove alternative {n}',
    addCriterion: 'Add a criterion',
    addAlternative: 'Add an alternative',
    alternatives: 'Alternatives',
    pairs: 'Pairwise comparison of criteria (Saaty scale)',
    pair: 'How much more important is "{a}" than "{b}"',
    consistency: 'Consistency ratio CR = {cr}, λmax = {lambda}.',
    inconsistent: 'CR is above 0.1: the judgements contradict each other, revise the comparisons.',
    consistent: 'The judgements are consistent (CR is at most 0.1).',
    result: 'Result',
    ranking: 'Ranking',
    bars: 'Scores of the alternatives: {list}',
    sensitivity: 'Sensitivity analysis',
    sensitivityHint: 'The winner when the weight of a criterion is 0, 0.1 … 1 (the other weights keep their proportions).',
    stable: 'the winner does not change',
    changes: 'the winner changes at the weight {list}',
    export: 'Export',
    copyMd: 'Copy Markdown',
    copyDsl: 'Copy the DSLKit diagram',
    copied: 'Copied.',
    copyFailed: 'Could not copy.',
    open: 'Open the diagram in the editor',
    saveName: 'Name to save under',
    save: 'Save the task',
    saved: 'The task "{name}" is saved.',
    saveFailed: 'Not saved: enter a name.',
    storage: 'Not saved: the browser has no room.',
    savedList: 'Saved tasks',
    savedEmpty: 'No saved tasks yet.',
    load: 'Open',
    remove: 'Delete',
    loaded: 'The task "{name}" is open.',
    removed: 'The task is deleted.',
    invalid: 'The task cannot be solved: it needs at least one criterion with a weight and two alternatives with numeric scores.',
    place: 'place',
  },
};
const SAATY_LABELS = SAATY_SCALE.map((value) => (value >= 1 ? String(value) : `1/${Math.round(1 / value)}`));
const SVG = 'http://www.w3.org/2000/svg';
const SHARE_KEY = 's=';

// The ratio of two weights as the nearest number of the Saaty scale (compared on the log scale).
export const nearestSaaty = (ratio) => {
  const target = Math.log(ratio > 0 && Number.isFinite(ratio) ? ratio : 1);
  return SAATY_SCALE.reduce((best, value) => (Math.abs(Math.log(value) - target) < Math.abs(Math.log(best) - target) ? value : best), 1);
};

const percent = (value) => `${Math.round(value * 1000) / 10} %`;

// The decision page: the table of criteria and alternatives, three methods, the pairwise comparisons of AHP with its consistency,
// the ranking with bars, the sensitivity of the winner, the export and the tasks kept in the browser.
export const initDecision = ({ root = document, storage, clipboard } = {}) => {
  const table = root.querySelector('[data-decision-table]');
  if (!table) return null;
  const view = root.defaultView;
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const t = (key, params = {}) => TEXTS[lang][key].replace(/\{(\w+)\}/g, (_, name) => params[name]);
  const store = createDecisionStore({ storage });
  const q = (selector) => root.querySelector(selector);
  const el = (tag, className, text) => {
    const node = root.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (text, className = 'button button--quiet') => {
    const node = el('button', className, text);
    node.type = 'button';
    return node;
  };
  const templateBox = q('[data-decision-template]');
  const methodBox = q('[data-decision-method]');
  const nameBox = q('[data-decision-name]');
  const pairsBox = q('[data-decision-pairs]');
  const resultBox = q('[data-decision-result]');
  const sensitivityBox = q('[data-decision-sensitivity]');
  const savedList = q('[data-decision-saved]');
  const openLink = q('[data-decision-open]');
  const status = q('.decision__status');
  const writeClipboard = clipboard ?? { writeText: (text) => view.navigator.clipboard.writeText(text) };

  let problem = taskProblem('notation', lang);
  let method = 'wsm';
  let pairs = {};
  let last = null;

  const say = (text, kind) => {
    status.textContent = text;
    if (text !== '') notify(root, text, kind);
    return text;
  };

  TASK_KEYS.forEach((key) => templateBox.append(Object.assign(el('option', '', TASKS[key].title[lang]), { value: key })));
  ['wsm', 'ahp', 'topsis'].forEach((key) => methodBox.append(Object.assign(el('option', '', methodName(key, lang)), { value: key })));

  const defaultPairs = () => {
    pairs = {};
    problem.criteria.forEach((a, i) =>
      problem.criteria.forEach((b, j) => {
        if (i < j) pairs[`${i}-${j}`] = nearestSaaty(a.weight / b.weight);
      }),
    );
  };
  const matrix = () => {
    const n = problem.criteria.length;
    return reciprocal(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i < j ? pairs[`${i}-${j}`] : 0))));
  };

  // ----- the table
  const field = (value, label, type = 'text') => {
    const node = el('input', 'decision__input');
    node.type = type;
    node.value = String(value);
    node.setAttribute('aria-label', label);
    if (type === 'number') node.step = 'any';
    return node;
  };
  const renderTable = () => {
    const head = el('tr');
    head.append(el('th', 'decision__corner', t('alternatives')));
    problem.criteria.forEach((criterion, c) => {
      const cell = el('th', 'decision__head');
      const name = field(criterion.name, t('criterion', { n: c + 1 }));
      name.dataset.decisionCriterion = String(c);
      const weight = field(criterion.weight, t('weight', { n: c + 1 }), 'number');
      weight.min = '0';
      weight.dataset.decisionWeight = String(c);
      const direction = el('select', 'decision__select');
      direction.setAttribute('aria-label', t('direction', { n: c + 1 }));
      direction.dataset.decisionDirection = String(c);
      direction.append(Object.assign(el('option', '', t('more')), { value: 'max' }), Object.assign(el('option', '', t('less')), { value: 'min' }));
      direction.value = criterion.direction;
      const remove = button('×', 'button button--icon');
      remove.setAttribute('aria-label', t('removeCriterion', { n: c + 1 }));
      remove.dataset.decisionRemoveCriterion = String(c);
      cell.append(name, weight, direction, remove);
      head.append(cell);
    });
    const rows = problem.alternatives.map((alternative, a) => {
      const row = el('tr');
      const first = el('th', 'decision__row-head');
      const name = field(alternative.name, t('alternative', { n: a + 1 }));
      name.dataset.decisionAlternative = String(a);
      const remove = button('×', 'button button--icon');
      remove.setAttribute('aria-label', t('removeAlternative', { n: a + 1 }));
      remove.dataset.decisionRemoveAlternative = String(a);
      first.append(name, remove);
      row.append(first);
      alternative.scores.forEach((score, c) => {
        const cell = el('td');
        const input = field(score, t('score', { a: alternative.name, c: problem.criteria[c].name }), 'number');
        input.dataset.decisionScore = `${a}-${c}`;
        cell.append(input);
        row.append(cell);
      });
      return row;
    });
    table.replaceChildren(el('thead'), el('tbody'));
    table.tHead.append(head);
    table.tBodies[0].append(...rows);
  };

  // ----- AHP: the comparisons of criteria
  const renderPairs = () => {
    pairsBox.hidden = method !== 'ahp';
    if (method !== 'ahp') return;
    const rows = [];
    problem.criteria.forEach((a, i) =>
      problem.criteria.forEach((b, j) => {
        if (i >= j) return;
        const row = el('li', 'decision__pair');
        const label = el('label', 'decision__pair-label', t('pair', { a: a.name, b: b.name }));
        const select = el('select', 'decision__select');
        select.dataset.decisionPair = `${i}-${j}`;
        select.id = `decision-pair-${i}-${j}`;
        label.htmlFor = select.id;
        SAATY_SCALE.forEach((value, k) => select.append(Object.assign(el('option', '', SAATY_LABELS[k]), { value: String(value) })));
        select.value = String(pairs[`${i}-${j}`]);
        row.append(label, select);
        rows.push(row);
      }),
    );
    pairsBox.querySelector('[data-decision-pair-list]').replaceChildren(...rows);
  };

  // ----- reading the table back into the problem
  const readProblem = () => {
    const number = (node) => (node.value.trim() === '' ? Number.NaN : Number(node.value));
    problem = {
      title: problem.title,
      criteria: problem.criteria.map((criterion, c) => ({
        name: table.querySelector(`[data-decision-criterion="${c}"]`).value,
        weight: number(table.querySelector(`[data-decision-weight="${c}"]`)),
        direction: table.querySelector(`[data-decision-direction="${c}"]`).value,
      })),
      alternatives: problem.alternatives.map((alternative, a) => ({
        name: table.querySelector(`[data-decision-alternative="${a}"]`).value,
        scores: alternative.scores.map((_, c) => number(table.querySelector(`[data-decision-score="${a}-${c}"]`))),
      })),
    };
  };

  // ----- the result
  const bars = (result) => {
    const svg = root.createElementNS(SVG, 'svg');
    const height = 26;
    svg.setAttribute('viewBox', `0 0 320 ${result.ranking.length * height}`);
    svg.setAttribute('class', 'decision__chart');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', t('bars', { list: result.ranking.map((item) => `${item.name} ${percent(item.score)}`).join(', ') }));
    const top = Math.max(0.0001, ...result.ranking.map((item) => item.score));
    result.ranking.forEach((item, row) => {
      const rect = root.createElementNS(SVG, 'rect');
      rect.setAttribute('class', row === 0 ? 'decision__bar decision__bar--best' : 'decision__bar');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', String(row * height + 4));
      rect.setAttribute('height', '16');
      rect.setAttribute('width', String(Math.max(2, (item.score / top) * 300)));
      svg.append(rect);
    });
    return svg;
  };

  const render = () => {
    const errors = problemErrors(problem);
    resultBox.replaceChildren();
    sensitivityBox.replaceChildren();
    last = null;
    if (errors.length > 0) {
      resultBox.append(el('p', 'decision__warning', t('invalid')));
      return null;
    }
    const result = solve(problem, method, matrix());
    last = result;
    const list = el('ol', 'decision__ranking');
    list.append(...result.ranking.map((item) => el('li', '', `${item.name} — ${percent(item.score)}`)));
    resultBox.append(list, bars(result), el('p', 'decision__explain', explainResult(problem, result, lang)));
    if (method === 'ahp') {
      resultBox.append(el('p', 'decision__cr', t('consistency', { cr: result.cr, lambda: result.lambda })));
      resultBox.append(el('p', result.warning ? 'decision__warning' : 'decision__ok', t(result.warning ? 'inconsistent' : 'consistent')));
    }
    const sens = sensitivity(problem, method === 'topsis' ? 'topsis' : 'wsm');
    const body = el('tbody');
    sens.forEach((item) => {
      const row = el('tr');
      row.append(el('th', '', item.criterion), ...item.points.map((point) => el('td', '', point.winner)));
      row.append(el('td', 'decision__note', item.stable ? t('stable') : t('changes', { list: item.changes.join(', ') })));
      body.append(row);
    });
    const header = el('tr');
    header.append(el('th', '', ''), ...sens[0].points.map((point) => el('th', '', String(point.weight))), el('th', '', ''));
    const thead = el('thead');
    thead.append(header);
    const sensTable = el('table', 'decision__table decision__table--sensitivity');
    sensTable.append(thead, body);
    const scroll = el('div', 'decision__scroll');
    scroll.append(sensTable);
    sensitivityBox.append(el('p', 'decision__hint', t('sensitivityHint')), scroll);
    openLink.href = `editor.html#${SHARE_KEY}${pack(toDsl(problem, result))}`;
    return result;
  };
  const pack = (text) =>
    view
      .btoa(String.fromCharCode(...new TextEncoder().encode(text)))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');

  const recalc = () => {
    readProblem();
    renderPairs();
    return render();
  };
  const setProblem = (next) => {
    problem = next;
    defaultPairs();
    renderTable();
    renderPairs();
    return render();
  };

  // ----- saved tasks
  const renderSaved = () => {
    const items = store.list(currentUser(storage));
    savedList.replaceChildren(
      ...(items.length > 0
        ? items.map((entry) => {
            const row = el('li', 'decision__saved-item');
            const open = button(`${t('load')}: ${entry.name}`);
            open.dataset.decisionLoad = entry.id;
            const remove = button(t('remove'));
            remove.dataset.decisionDelete = entry.id;
            row.append(open, remove);
            return row;
          })
        : [el('li', 'decision__empty', t('savedEmpty'))]),
    );
  };

  // ----- wiring
  table.addEventListener('input', recalc);
  table.addEventListener('change', recalc);
  table.addEventListener('click', (event) => {
    const criterion = event.target.closest('[data-decision-remove-criterion]');
    const alternative = event.target.closest('[data-decision-remove-alternative]');
    if (!criterion && !alternative) return;
    readProblem();
    if (criterion) {
      const at = Number(criterion.dataset.decisionRemoveCriterion);
      problem.criteria.splice(at, 1);
      problem.alternatives.forEach((item) => item.scores.splice(at, 1));
    } else problem.alternatives.splice(Number(alternative.dataset.decisionRemoveAlternative), 1);
    setProblem(problem);
  });
  q('[data-decision-add-criterion]').addEventListener('click', () => {
    readProblem();
    problem.criteria.push({ name: `${t('criterion', { n: problem.criteria.length + 1 }).split(':')[0]}`, weight: 1, direction: 'max' });
    problem.alternatives.forEach((item) => item.scores.push(5));
    setProblem(problem);
  });
  q('[data-decision-add-alternative]').addEventListener('click', () => {
    readProblem();
    problem.alternatives.push({ name: `${t('alternative', { n: problem.alternatives.length + 1 }).split(':')[0]}`, scores: problem.criteria.map(() => 5) });
    setProblem(problem);
  });
  templateBox.addEventListener('change', () => setProblem(taskProblem(templateBox.value, lang)));
  methodBox.addEventListener('change', () => {
    method = methodBox.value;
    renderPairs();
    render();
  });
  pairsBox.addEventListener('change', (event) => {
    const select = event.target;
    pairs[select.dataset.decisionPair] = Number(select.value);
    render();
  });
  const copy = async (text) => {
    try {
      await writeClipboard.writeText(text);
      return say(t('copied'), 'success');
    } catch {
      return say(t('copyFailed'), 'error');
    }
  };
  q('[data-decision-copy-md]').addEventListener('click', () => (last ? copy(toMarkdown(problem, last, lang)) : say(t('invalid'), 'error')));
  q('[data-decision-copy-dsl]').addEventListener('click', () => (last ? copy(toDsl(problem, last)) : say(t('invalid'), 'error')));
  q('[data-decision-save]').addEventListener('click', () => {
    const result = store.save(currentUser(storage), nameBox.value, { problem, method, pairs });
    if (!result.ok) return say(t(result.error === 'name' ? 'saveFailed' : 'storage'), 'error');
    renderSaved();
    return say(t('saved', { name: result.entry.name }), 'success');
  });
  savedList.addEventListener('click', (event) => {
    const user = currentUser(storage);
    const load = event.target.closest('[data-decision-load]');
    const remove = event.target.closest('[data-decision-delete]');
    if (load) {
      const entry = store.list(user).find((item) => item.id === load.dataset.decisionLoad);
      method = entry.state.method;
      methodBox.value = method;
      nameBox.value = entry.name;
      setProblem(entry.state.problem);
      pairs = entry.state.pairs;
      renderPairs();
      render();
      say(t('loaded', { name: entry.name }), 'info');
    } else if (remove) {
      store.remove(user, remove.dataset.decisionDelete);
      renderSaved();
      say(t('removed'), 'info');
    }
  });

  setProblem(problem);
  renderSaved();
  return { setProblem, recalc, render, method: () => method, problem: () => problem, last: () => last };
};
