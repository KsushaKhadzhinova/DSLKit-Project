import { buildQuestions, completeFromAnswers } from '../utils/diagram-questions.js';
import { readCode, showCode } from './code-lines.js';
import { notify } from './toast.js';

const TEXTS = {
  ru: {
    title: 'Уточнение и дополнение',
    close: 'Закрыть',
    intro: 'Система задаёт вопросы о том, чего не хватает диаграмме, и достраивает её по вашим ответам. Любой вопрос можно пропустить.',
    progress: 'Вопрос {n} из {total}',
    back: 'Назад',
    skip: 'Пропустить',
    next: 'Далее',
    finish: 'Применить ответы',
    yes: 'Да',
    no: 'Нет',
    answer: 'Ваш ответ',
    line: 'строка {line}',
    none: 'Вопросов нет: диаграмма выглядит полной.',
    noAnswers: 'Ответов нет: отвечайте на вопросы или закройте окно.',
    working: 'Применяем ответы…',
    applied: 'Применено ответов: {n}.',
    valid: 'Диаграмма проходит проверку.',
    left: 'В диаграмме остались замечания, их можно уточнить повторно.',
    nothing: 'Ответы ничего не изменили, код остался прежним.',
    worse: 'С этими ответами диаграмма стала бы хуже, код не изменён. Попробуйте другие ответы.',
    again: 'Задать вопросы заново',
    ai: 'ИИ добавил вопросов: {n}.',
  },
  en: {
    title: 'Clarify and complete',
    close: 'Close',
    intro: 'The system asks what the diagram is missing and completes it from your answers. You can skip any question.',
    progress: 'Question {n} of {total}',
    back: 'Back',
    skip: 'Skip',
    next: 'Next',
    finish: 'Apply the answers',
    yes: 'Yes',
    no: 'No',
    answer: 'Your answer',
    line: 'line {line}',
    none: 'No questions: the diagram looks complete.',
    noAnswers: 'No answers yet: answer the questions or close the window.',
    working: 'Applying the answers…',
    applied: 'Answers applied: {n}.',
    valid: 'The diagram passes the check.',
    left: 'The diagram still has remarks; you can run the questions again.',
    nothing: 'The answers changed nothing, the code stays as it was.',
    worse: 'These answers would make the diagram worse, the code is unchanged. Try other answers.',
    again: 'Ask the questions again',
    ai: 'The AI added {n} questions.',
  },
};

// The dialog "Clarify and complete" of the editor: one question at a time with progress, skip, back and finish.
// The answers are written into the code in one step, so one press of undo takes the whole completion back.
export const initClarify = ({ root = document, fetchImpl } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const codeLines = page?.querySelector('.code__lines');
  if (!codeLines) return null;
  const view = root.defaultView;
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const t = (key, params = {}) => TEXTS[lang][key].replace(/\{(\w+)\}/g, (_, name) => params[name]);
  const call = fetchImpl ?? ((...args) => view.fetch(...args));
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

  let questions = [];
  let at = 0;
  let answers = {};
  let session = 0;

  // ----- the panel
  const panel = el('section', 'auto clarify');
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'clarify-title');
  const head = el('div', 'auto__head');
  const title = el('h2', 'auto__title', t('title'));
  title.id = 'clarify-title';
  const closeButton = button('×', 'button button--icon');
  closeButton.setAttribute('aria-label', t('close'));
  head.append(title, closeButton);
  const intro = el('p', 'auto__note', t('intro'));
  const count = el('p', 'clarify__count');
  count.setAttribute('aria-live', 'polite');
  const bar = el('progress', 'clarify__bar');
  bar.setAttribute('aria-hidden', 'true');
  const form = el('fieldset', 'clarify__question');
  const legend = el('legend', 'clarify__text');
  const controls = el('div', 'clarify__controls');
  const where = el('p', 'auto__hint');
  form.append(legend, controls, where);
  const nav = el('div', 'auto__actions clarify__nav');
  const backButton = button(t('back'));
  const skipButton = button(t('skip'));
  const nextButton = button(t('next'), 'button button--primary');
  const finishButton = button(t('finish'));
  nav.append(backButton, skipButton, nextButton, finishButton);
  const status = el('p', 'auto__status clarify__status');
  status.setAttribute('role', 'status');
  const againButton = button(t('again'));
  againButton.hidden = true;
  panel.append(head, intro, count, bar, form, nav, status, againButton);
  page.append(panel);

  // ----- the question on the screen
  const current = () => questions[at];
  const read = () => {
    if (current()?.kind === 'text') return controls.querySelector('input').value.trim();
    return controls.querySelector('input:checked')?.value ?? '';
  };
  const remember = () => {
    const value = read();
    if (value === '') delete answers[current()?.id];
    else answers[current().id] = value;
  };
  const choice = (question, name, value, label) => {
    const row = el('label', 'clarify__option');
    const input = el('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.checked = answers[question.id] === value;
    row.append(input, root.createTextNode(` ${label}`));
    return row;
  };
  const render = () => {
    const question = current();
    const empty = question === undefined;
    form.hidden = empty;
    [backButton, skipButton, nextButton, finishButton].forEach((node) => (node.hidden = empty));
    count.textContent = empty ? '' : t('progress', { n: at + 1, total: questions.length });
    bar.hidden = empty;
    if (empty) return;
    bar.max = questions.length;
    bar.value = at + 1;
    legend.textContent = question.text[lang];
    where.textContent = question.target.line > 0 ? t('line', { line: question.target.line }) : '';
    where.hidden = where.textContent === '';
    if (question.kind === 'text') {
      const input = el('input', 'auto__select');
      input.type = 'text';
      input.maxLength = 120;
      input.value = answers[question.id] ?? '';
      input.setAttribute('aria-label', t('answer'));
      controls.replaceChildren(input);
    } else {
      const list =
        question.kind === 'yesno'
          ? [
              { value: 'yes', label: { ru: t('yes'), en: t('yes') } },
              { value: 'no', label: { ru: t('no'), en: t('no') } },
            ]
          : question.options;
      controls.replaceChildren(...list.map((item) => choice(question, `clarify-${question.id}`, item.value, item.label[lang])));
    }
    backButton.disabled = at === 0;
    nextButton.textContent = at === questions.length - 1 ? t('finish') : t('next');
    finishButton.hidden = at === questions.length - 1;
  };
  const focusControl = () => controls.querySelector('input')?.focus();

  const say = (text, kind) => {
    status.textContent = text;
    if (text !== '' && kind) notify(root, text, kind);
    return text;
  };

  // ----- the answers become code
  const asked = () =>
    questions.filter((item) => answers[item.id] !== undefined).map((item) => ({ id: item.id, answer: answers[item.id], text: item.text[lang] }));
  const send = async (body) => {
    const answer = await call('/api/ai/clarify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, lang }) });
    return answer.ok ? answer.json() : null;
  };
  const complete = async (list, code) => {
    const local = () => completeFromAnswers(code, list);
    if (!ai.available) return local();
    try {
      const remote = await send({ step: 'complete', code, answers: list });
      return remote?.ok ? remote : local();
    } catch {
      return local();
    }
  };
  const finish = async (save = true) => {
    if (save) remember();
    const list = asked();
    if (list.length === 0) return say(t('noAnswers'), 'info');
    say(t('working'));
    const code = readCode(codeLines);
    const result = await complete(list, code);
    if (!result.ok) return say(t(result.reason === 'worse' ? 'worse' : 'nothing'), 'error');
    showCode(root, codeLines, result.code);
    page.dispatchEvent(new view.CustomEvent('dslkit:run', { bubbles: true }));
    againButton.hidden = false;
    answers = {};
    return say(`${t('applied', { n: result.applied.length })} ${t(result.valid ? 'valid' : 'left')}`, 'success');
  };

  const go = (step) => {
    at = Math.min(Math.max(at + step, 0), questions.length - 1);
    render();
    focusControl();
  };
  const next = () => {
    remember();
    return at === questions.length - 1 ? finish(false) : go(1);
  };

  // ----- the optional extra questions of the AI
  let ai = { available: false };
  const askAi = async (token, code) => {
    try {
      const status = await call('/api/ai/status');
      ai = { available: status.ok && (await status.json()).available === true };
      if (!ai.available) return 0;
      const data = await send({ step: 'questions', code });
      const extra = (data?.questions ?? []).filter((item) => item.id.startsWith('ai-'));
      if (token !== session || extra.length === 0) return 0;
      questions = [...questions, ...extra];
      render();
      say(t('ai', { n: extra.length }));
      return extra.length;
    } catch {
      return 0;
    }
  };

  const open = async () => {
    session += 1;
    const code = readCode(codeLines);
    questions = buildQuestions(code);
    at = 0;
    answers = {};
    againButton.hidden = true;
    say(questions.length === 0 ? t('none') : '');
    panel.hidden = false;
    render();
    focusControl();
    if (questions.length === 0) closeButton.focus();
    return askAi(session, code);
  };
  const close = () => {
    session += 1;
    panel.hidden = true;
    return false;
  };

  // ----- wiring
  backButton.addEventListener('click', () => {
    remember();
    go(-1);
  });
  skipButton.addEventListener('click', () => {
    delete answers[current().id];
    return at === questions.length - 1 ? finish(false) : go(1);
  });
  nextButton.addEventListener('click', next);
  finishButton.addEventListener('click', () => finish());
  againButton.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
    else if (event.key === 'Enter' && event.target.type === 'text') {
      event.preventDefault();
      next();
    }
  });
  root.querySelectorAll('[data-clarify-open]').forEach((node) => node.addEventListener('click', open));
  return { open, close, finish, answers: () => ({ ...answers }), questions: () => questions };
};
