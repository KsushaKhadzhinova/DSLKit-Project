import { BASES, expertStore } from '../expert/bases.js';
import { answerQuestion, conclusions, createFacts, infer, nextQuestion } from '../expert/engine.js';
import { factsFromDescription, reviewDiagram, traceLines } from '../expert/review.js';
import { NOTATIONS } from '../notations/index.js';
import { createAccountStore } from '../storage/accounts.js';
import { notify } from './toast.js';

const TEXTS = {
  ru: {
    notationRun: 'Определить по описанию',
    reviewRun: 'Проверить диаграмму',
    notationLabel: 'Опишите задачу своими словами (необязательно) и ответьте на вопросы эксперта',
    reviewLabel: 'Код диаграммы DSLKit',
    restart: 'Начать заново',
    yes: 'Да',
    no: 'Нет',
    answers: 'Ответы',
    results: 'Вывод',
    none: 'Пока нет вывода: ответьте на вопросы.',
    certainty: 'уверенность {cf} %',
    why: 'Почему такой вывод',
    reviewClean: 'Замечаний нет.',
    reviewEmpty: 'Вставьте код диаграммы.',
    line: 'стр. {lines}',
    rules: 'Правила',
    when: 'если',
    and: ' и ',
    then: 'то',
    edit: 'Править',
    save: 'Сохранить',
    reset: 'Сбросить к исходному',
    resetAll: 'Сбросить все правила',
    cancel: 'Отмена',
    edited: 'изменено разработчиком',
    saved: 'Правило сохранено.',
    resetDone: 'Возвращено исходное правило.',
    resetAllDone: 'Все правила возвращены к исходным.',
    forbidden: 'Менять правила может только разработчик.',
    invalid: 'Правило неверное: {problems}.',
    json: 'Это не JSON.',
    failed: 'Не удалось сохранить.',
    roleOn: 'Роль «разработчик» включена.',
    adminOn: 'Роль «администратор» включена: правила она не меняет.',
    roleOff: 'Вы вышли из роли.',
    roleWrong: 'Код неверный.',
    roleSignIn: 'Сначала войдите в аккаунт.',
    honest: 'Это экспертная система на правилах «если — то» с коэффициентами уверенности, а не нейросеть.',
    high: 'важно',
    medium: 'средне',
    low: 'мелочь',
  },
  en: {
    notationRun: 'Detect from the description',
    reviewRun: 'Check the diagram',
    notationLabel: 'Describe the task in your own words (optional) and answer the questions of the expert',
    reviewLabel: 'DSLKit diagram code',
    restart: 'Start again',
    yes: 'Yes',
    no: 'No',
    answers: 'Answers',
    results: 'Conclusion',
    none: 'No conclusion yet: answer the questions.',
    certainty: 'certainty {cf} %',
    why: 'Why this conclusion',
    reviewClean: 'No remarks.',
    reviewEmpty: 'Paste the code of a diagram.',
    line: 'line {lines}',
    rules: 'Rules',
    when: 'if',
    and: ' and ',
    then: 'then',
    edit: 'Edit',
    save: 'Save',
    reset: 'Reset to the original',
    resetAll: 'Reset all rules',
    cancel: 'Cancel',
    edited: 'changed by a developer',
    saved: 'The rule is saved.',
    resetDone: 'The original rule is back.',
    resetAllDone: 'All rules are back to the originals.',
    forbidden: 'Only a developer can change the rules.',
    invalid: 'The rule is wrong: {problems}.',
    json: 'This is not JSON.',
    failed: 'It could not be saved.',
    roleOn: 'The role "developer" is on.',
    adminOn: 'The role "admin" is on: it does not change the rules.',
    roleOff: 'You left the role.',
    roleWrong: 'The code is wrong.',
    roleSignIn: 'Sign in first.',
    honest: 'This is an expert system of "if — then" rules with certainty factors, not a neural network.',
    high: 'important',
    medium: 'medium',
    low: 'minor',
  },
};
const KBS = ['notation', 'review'];

// The page of the expert system: a dialog that asks about the missing facts (which notation), the review of a code, the trace of the reasoning,
// the list of rules and, for the role "developer" only, their editing.
export const initExpert = ({ root = document, storage, developerHash, adminHash } = {}) => {
  const work = root.querySelector('.expert__work');
  if (!work) return null;
  const view = root.defaultView;
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const t = (key, params = {}) => TEXTS[lang][key].replace(/\{(\w+)\}/g, (_, name) => params[name]);
  const store = expertStore(storage);
  const accounts = createAccountStore({ storage, ...(developerHash ? { developerHash } : {}), ...(adminHash ? { adminHash } : {}) });
  const q = (selector) => root.querySelector(selector);
  const el = (tag, className, text) => {
    const node = root.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const kbButtons = [...root.querySelectorAll('[data-expert-kb]')];
  const title = q('.expert__title');
  const label = q('.expert__label');
  const textBox = q('.expert__text');
  const runButton = q('[data-expert-run]');
  const restartButton = q('[data-expert-restart]');
  const questionBox = q('[data-expert-question]');
  const answersList = q('[data-expert-answers]');
  const resultsList = q('[data-expert-results]');
  const ruleList = q('[data-expert-rules]');
  const editor = q('.expert__editor');
  const ruleText = q('.expert__rule-text');
  const resetAllButton = q('[data-expert-reset-all]');
  const status = q('.docs__status');

  let kb = KBS.includes(new view.URLSearchParams(view.location.search).get('kb')) ? new view.URLSearchParams(view.location.search).get('kb') : 'notation';
  let facts = createFacts({});
  let answers = [];
  let editing = null;

  const say = (text, kind) => {
    status.textContent = text;
    if (text !== '') notify(root, text, kind);
    return text;
  };
  const developer = () => accounts.current()?.role === 'developer';
  const rules = () => store.rules(kb);
  const base = () => BASES[kb];
  const percent = (cf) => Math.round(cf * 100);

  // ----- the dialog of "which notation"
  const renderQuestion = (question) => {
    questionBox.replaceChildren();
    if (question === null) return null;
    const group = el('div', 'expert__choices');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', question.ask[lang]);
    const heading = el('p', 'expert__ask', question.ask[lang]);
    const choices = question.options
      ? question.options.map((option) => ({ label: option[lang], value: option.id }))
      : [
          { label: t('yes'), value: true },
          { label: t('no'), value: false },
        ];
    group.append(
      ...choices.map((choice) => {
        const node = el('button', 'button button--quiet', choice.label);
        node.type = 'button';
        node.addEventListener('click', () => {
          answers.push(`${question.ask[lang]} — ${choice.label}`);
          facts = answerQuestion(question, facts, choice.value);
          update();
        });
        return node;
      }),
    );
    questionBox.append(heading, group);
    group.querySelector('button').focus();
    return question;
  };

  const renderResults = (items) => {
    resultsList.replaceChildren(
      ...(items.length > 0 ? items : [{ title: t('none'), cf: null, why: [] }]).map((item) => {
        const row = el('li', 'expert__result');
        row.append(el('strong', '', item.title));
        if (item.cf !== null) row.append(` — ${t('certainty', { cf: percent(item.cf) })}`);
        if (item.why.length > 0) {
          const details = el('details', 'expert__why');
          details.append(el('summary', '', t('why')), ...item.why.map((line) => el('p', 'expert__trace', line)));
          row.append(details);
        }
        return row;
      }),
    );
  };

  const updateNotation = () => {
    const { facts: all, trace } = infer(rules(), facts);
    const ranking = conclusions(all, 'notation:');
    renderQuestion(nextQuestion(base(), facts, trace));
    answersList.replaceChildren(...answers.map((text) => el('li', '', text)));
    renderResults(
      ranking.map((item) => {
        const key = item.fact.slice('notation:'.length);
        const why = traceLines(
          trace.filter((step) => step.fact === item.fact),
          rules(),
          lang,
        );
        return { title: NOTATIONS[key].name[lang], cf: item.cf, why };
      }),
    );
  };

  const runReview = () => {
    const code = textBox.value;
    if (code.trim() === '') {
      renderResults([]);
      return say(t('reviewEmpty'), 'error');
    }
    const review = reviewDiagram(code, lang, rules());
    renderResults(
      review.recommendations.length > 0
        ? review.recommendations.map((item) => ({
            title: `${t(item.priority)}: ${item.text}${item.lines.length > 0 ? ` (${t('line', { lines: item.lines.join(', ') })})` : ''}`,
            cf: item.cf,
            why: [item.reason],
          }))
        : [{ title: t('reviewClean'), cf: null, why: [] }],
    );
    return say('');
  };

  function update() {
    if (kb === 'notation') updateNotation();
  }

  // ----- the list of rules
  const premiseText = (premise) => `${premise.fact}${premise.op ? ` ${premise.op} ${premise.value}` : ''}`;
  const renderRules = () => {
    ruleList.replaceChildren(
      ...rules().map((rule) => {
        const row = el('li', 'expert__rule');
        const text = `${rule.id}: ${t('when')} ${rule.if.map(premiseText).join(t('and'))} ${t('then')} ${rule.then.fact} (${rule.then.cf}) — ${rule.reason[lang]}`;
        row.append(el('span', 'expert__rule-text-line', text));
        if (store.edited(kb, rule.id)) row.append(el('em', 'expert__edited', ` ${t('edited')}`));
        const edit = el('button', 'button button--quiet', t('edit'));
        edit.type = 'button';
        edit.dataset.expertEdit = rule.id;
        edit.hidden = !developer();
        row.append(edit);
        return row;
      }),
    );
    resetAllButton.hidden = !developer();
  };
  ruleList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-expert-edit]');
    if (!button) return;
    if (!developer()) return say(t('forbidden'), 'error');
    editing = button.dataset.expertEdit;
    ruleText.value = JSON.stringify(
      rules().find((rule) => rule.id === editing),
      null,
      2,
    );
    editor.hidden = false;
    return ruleText.focus();
  });
  const finish = (result, ok) => {
    if (!result.ok) {
      const key = result.error === 'invalid' ? 'invalid' : result.error === 'forbidden' ? 'forbidden' : 'failed';
      return say(t(key, { problems: (result.problems ?? []).join(', ') }), 'error');
    }
    editor.hidden = true;
    renderRules();
    update();
    return say(ok, 'success');
  };
  q('[data-expert-save]').addEventListener('click', () => {
    let rule;
    try {
      rule = JSON.parse(ruleText.value);
    } catch {
      return say(t('json'), 'error');
    }
    return finish(store.set(accounts.current(), kb, editing, rule), t('saved'));
  });
  q('[data-expert-reset]').addEventListener('click', () => finish(store.reset(accounts.current(), kb, editing), t('resetDone')));
  q('[data-expert-cancel]').addEventListener('click', () => {
    editor.hidden = true;
  });
  resetAllButton.addEventListener('click', () => finish(store.resetAll(accounts.current()), t('resetAllDone')));

  // ----- the developer role, as on the documentation page
  const roleForm = q('[data-expert-role]');
  const roleOff = q('[data-expert-role-off]');
  const syncRole = () => {
    const on = developer();
    roleOff.hidden = !on;
    roleForm.querySelector('[data-expert-role-on]').hidden = on;
    roleForm.querySelector('.docs__role-input').hidden = on;
    roleForm.querySelector('.docs__role-label').hidden = on;
    if (!on) editor.hidden = true;
    renderRules();
  };
  roleForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const field = roleForm.querySelector('.docs__role-input');
    const result = await accounts.becomeDeveloper(field.value);
    field.value = '';
    syncRole();
    return say(
      result.ok ? t(result.user.role === 'admin' ? 'adminOn' : 'roleOn') : t(result.error === 'signed-out' ? 'roleSignIn' : 'roleWrong'),
      result.ok ? 'success' : 'error',
    );
  });
  roleOff.addEventListener('click', () => {
    accounts.leaveDeveloper();
    syncRole();
    say(t('roleOff'), 'info');
  });

  // ----- the choice of the base
  const showKb = (name) => {
    kb = name;
    facts = createFacts({});
    answers = [];
    editor.hidden = true;
    kbButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.expertKb === name)));
    title.textContent = base().title[lang];
    label.textContent = t(`${name}Label`);
    runButton.textContent = t(`${name}Run`);
    restartButton.hidden = name !== 'notation';
    textBox.value = '';
    questionBox.replaceChildren();
    answersList.replaceChildren();
    renderResults([]);
    renderRules();
    update();
    return name;
  };
  kbButtons.forEach((button) => button.addEventListener('click', () => showKb(button.dataset.expertKb)));
  runButton.addEventListener('click', () => {
    if (kb === 'review') return runReview();
    facts = createFacts(factsFromDescription(textBox.value));
    answers = [];
    return update();
  });
  restartButton.addEventListener('click', () => {
    facts = createFacts({});
    answers = [];
    update();
  });
  view.addEventListener('storage', () => {
    syncRole();
    update();
  });

  showKb(kb);
  syncRole();
  return { showKb, kb: () => kb };
};
