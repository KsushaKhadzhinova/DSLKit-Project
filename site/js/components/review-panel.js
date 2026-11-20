// @ts-nocheck -- type-check debt: remove this line when the file passes npm run typecheck
import { pageLanguage } from '../utils/lang.js';
import { diffLines, reviewCode } from '../utils/diagram-review.js';
import { readCode, showCode } from './code-lines.js';
import { notify } from './toast.js';

const TEXTS = {
  ru: {
    title: 'Проверить и исправить',
    close: 'Закрыть',
    again: 'Проверить заново',
    ai: 'Предложить варианты с ИИ',
    aiWorking: 'ИИ проверяет диаграмму…',
    aiDone: 'Варианты ИИ добавлены.',
    aiNone: 'ИИ не предложил подходящих вариантов.',
    aiFailed: 'ИИ недоступен, показаны варианты по правилам.',
    clean: 'Ошибок и предупреждений нет. Диаграмма в порядке.',
    found: 'Найдено: ошибок {e}, предупреждений {w}, советов {i}.',
    issues: 'Что не так',
    variants: 'Исправленные варианты',
    noVariants: 'Автоматически исправить нечего: исправьте оставшиеся замечания вручную.',
    error: 'Ошибка',
    warning: 'Предупреждение',
    info: 'Совет',
    line: 'строка {n}',
    fix: 'Исправление: {text}',
    manual: 'Исправить нужно вручную.',
    left: 'Было',
    right: 'Станет',
    removed: 'удалено',
    added: 'добавлено',
    same: 'без изменений',
    result: 'После исправления: ошибок {e}, предупреждений {w}.',
    changes: 'Что изменится',
    apply: 'Применить этот вариант',
    applied: 'Вариант применён. Отменить можно кнопкой «Отменить».',
    fromAi: 'Вариант ИИ',
  },
  en: {
    title: 'Check and fix',
    close: 'Close',
    again: 'Check again',
    ai: 'Suggest variants with AI',
    aiWorking: 'The AI is checking the diagram…',
    aiDone: 'The AI variants are added.',
    aiNone: 'The AI offered no suitable variants.',
    aiFailed: 'The AI is not available, the variants by rules are shown.',
    clean: 'No errors and no warnings. The diagram is fine.',
    found: 'Found: {e} errors, {w} warnings, {i} hints.',
    issues: 'What is wrong',
    variants: 'Corrected variants',
    noVariants: 'Nothing can be fixed automatically: fix the remaining remarks by hand.',
    error: 'Error',
    warning: 'Warning',
    info: 'Hint',
    line: 'line {n}',
    fix: 'Fix: {text}',
    manual: 'This one has to be fixed by hand.',
    left: 'Before',
    right: 'After',
    removed: 'removed',
    added: 'added',
    same: 'unchanged',
    result: 'After the fix: {e} errors, {w} warnings.',
    changes: 'What changes',
    apply: 'Apply this variant',
    applied: 'The variant is applied. Use "Undo" to take it back.',
    fromAi: 'AI variant',
  },
};
const MARKS = { del: '−', add: '+', same: ' ' };
const WORDS = { del: 'removed', add: 'added', same: 'same' };

// The panel "Check and fix": the problems of the code of the editor, the corrected variants side by side as a difference,
// and a button that writes a variant into the editor like any other change, so "Undo" takes it back.
export const initReviewPanel = ({ root = document, fetchImpl } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const codeLines = page?.querySelector('.code__lines');
  if (!codeLines) return null;
  const view = root.defaultView;
  const lang = pageLanguage(root);
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

  let current = null;
  let aiAvailable = false;

  const panel = el('section', 'review');
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'review-title');
  const head = el('div', 'review__head');
  const title = el('h2', 'review__title', t('title'));
  title.id = 'review-title';
  title.tabIndex = -1;
  const closeButton = button('×', 'button button--icon');
  closeButton.setAttribute('aria-label', t('close'));
  head.append(title, closeButton);
  const status = el('p', 'review__status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const actions = el('div', 'review__actions');
  const againButton = button(t('again'), 'button button--primary');
  const aiButton = button(t('ai'));
  aiButton.hidden = true;
  actions.append(againButton, aiButton);
  const issuesTitle = el('h3', 'review__subtitle', t('issues'));
  const issuesList = el('ul', 'review__list');
  const variantsTitle = el('h3', 'review__subtitle', t('variants'));
  const variantsBox = el('div', 'review__variants');
  panel.append(head, status, actions, issuesTitle, issuesList, variantsTitle, variantsBox);
  page.append(panel);

  const issueItem = (issue) => {
    const item = el('li', `review__item review__item--${issue.severity}`);
    item.append(el('strong', 'review__severity', t(issue.severity)));
    item.append(el('span', 'review__message', issue.message[lang]));
    const link = el('a', 'review__location', t('line', { n: issue.line }));
    link.href = `#line-${issue.line}`;
    item.append(link, el('span', 'review__fix', issue.fix ? t('fix', { text: issue.fix.title[lang] }) : t('manual')));
    return item;
  };

  const column = (heading, rows, hide) => {
    const box = el('div', 'review__column');
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', heading);
    box.append(el('p', 'review__column-title', heading));
    const lines = el('div', 'review__code');
    rows.forEach((row) => {
      const line = el('div', `review__line review__line--${row.type}`);
      line.append(el('span', 'review__mark', MARKS[row.type]), el('span', 'visually-hidden', `${t(WORDS[row.type])}: `));
      line.append(el('code', 'review__text', row.text === '' ? ' ' : row.text));
      lines.append(line);
    });
    box.append(lines);
    return box;
  };

  const variantItem = (variant, code) => {
    const item = el('article', 'review__variant');
    item.append(el('h4', 'review__variant-title', `${variant.title[lang]}${variant.source === 'ai' ? ` (${t('fromAi')})` : ''}`));
    item.append(el('p', 'review__result', t('result', { e: variant.errors, w: variant.warnings })));
    if (variant.changes.length > 0) {
      const changes = el('ul', 'review__changes');
      changes.append(...variant.changes.map((change) => el('li', '', change[lang])));
      item.append(el('p', 'review__column-title', t('changes')), changes);
    }
    const rows = diffLines(code, variant.code);
    const diff = el('div', 'review__diff');
    diff.append(
      column(
        t('left'),
        rows.filter((row) => row.type !== 'add'),
      ),
      column(
        t('right'),
        rows.filter((row) => row.type !== 'del'),
      ),
    );
    const apply = button(t('apply'), 'button button--primary review__apply');
    apply.dataset.reviewApply = variant.id;
    apply.addEventListener('click', () => {
      showCode(root, codeLines, variant.code);
      page.dispatchEvent(new view.CustomEvent('dslkit:run', { bubbles: true }));
      notify(root, t('applied'), 'success');
      show(readCode(codeLines), reviewCode(readCode(codeLines), { lang }));
    });
    item.append(diff, apply);
    return item;
  };

  const show = (code, result) => {
    current = { code, result };
    const count = (severity) => result.issues.filter((issue) => issue.severity === severity).length;
    const problems = result.issues.filter((issue) => issue.severity !== 'info').length;
    status.textContent = problems === 0 && count('info') === 0 ? t('clean') : t('found', { e: count('error'), w: count('warning'), i: count('info') });
    issuesList.replaceChildren(...result.issues.map(issueItem));
    issuesTitle.hidden = issuesList.hidden = result.issues.length === 0;
    const empty = problems === 0 ? [] : [el('p', 'review__empty', t('noVariants'))];
    variantsBox.replaceChildren(...(result.variants.length > 0 ? result.variants.map((variant) => variantItem(variant, code)) : empty));
    variantsTitle.hidden = variantsBox.hidden = result.variants.length === 0 && problems === 0;
    return result;
  };

  const check = () => show(readCode(codeLines), reviewCode(readCode(codeLines), { lang }));

  const askAi = async () => {
    const code = readCode(codeLines);
    status.textContent = t('aiWorking');
    panel.setAttribute('aria-busy', 'true');
    aiButton.disabled = true;
    try {
      const answer = await call('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'review', text: code, lang }),
      });
      const data = await answer.json().catch(() => ({}));
      if (!answer.ok || !Array.isArray(data.variants)) throw new Error('refused');
      const result = show(code, { ...current.result, variants: data.variants });
      status.textContent = data.ai ? (result.variants.some((variant) => variant.source === 'ai') ? t('aiDone') : t('aiNone')) : t('aiFailed');
    } catch {
      status.textContent = t('aiFailed');
    } finally {
      panel.setAttribute('aria-busy', 'false');
      aiButton.disabled = false;
    }
    return status.textContent;
  };

  const refreshAi = async () => {
    try {
      const answer = await call('/api/ai/status');
      aiAvailable = answer.ok && (await answer.json()).available === true;
    } catch {
      aiAvailable = false;
    }
    aiButton.hidden = !aiAvailable;
    return aiAvailable;
  };

  const open = async () => {
    panel.hidden = false;
    check();
    title.focus();
    return refreshAi();
  };
  const close = () => {
    panel.hidden = true;
    return false;
  };
  againButton.addEventListener('click', check);
  aiButton.addEventListener('click', askAi);
  closeButton.addEventListener('click', close);
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  root.querySelectorAll('[data-review-open]').forEach((node) => node.addEventListener('click', open));
  return { open, close, check, askAi, refreshAi, current: () => current };
};
