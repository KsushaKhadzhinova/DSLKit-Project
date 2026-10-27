import { readCode, showCode } from './code-lines.js';
import { addCommit, assistant, diffLines, diffText, replaceAll, searchLines } from '../utils/editor-tools.js';

const TEXTS = {
  search: { ru: 'Поиск', en: 'Search' },
  git: { ru: 'Git: история версий', en: 'Git: version history' },
  ai: { ru: 'AI-помощник', en: 'AI assistant' },
  close: { ru: 'Закрыть панель', en: 'Close the panel' },
  find: { ru: 'Найти', en: 'Find' },
  replace: { ru: 'Заменить на', en: 'Replace with' },
  replaceAll: { ru: 'Заменить всё', en: 'Replace all' },
  matchCase: { ru: 'Учитывать регистр', en: 'Match case' },
  found: { ru: 'Найдено: {n}', en: 'Found: {n}' },
  replaced: { ru: 'Заменено: {n}', en: 'Replaced: {n}' },
  line: { ru: 'стр. {line}, стлб. {column}', en: 'line {line}, col {column}' },
  message: { ru: 'Сообщение коммита', en: 'Commit message' },
  commit: { ru: 'Закоммитить', en: 'Commit' },
  committed: { ru: 'Коммит {id} создан.', en: 'Commit {id} created.' },
  unchanged: { ru: 'Нет изменений с прошлого коммита.', en: 'No changes since the last commit.' },
  empty: { ru: 'Коммитов пока нет.', en: 'No commits yet.' },
  changes: { ru: 'Изменений с последнего коммита: +{add} −{del}', en: 'Changes since the last commit: +{add} −{del}' },
  clean: { ru: 'Рабочая копия совпадает с последним коммитом.', en: 'The working copy equals the last commit.' },
  untracked: { ru: 'Коммитов нет, весь код не отслеживается.', en: 'No commits, all the code is untracked.' },
  diff: { ru: 'Сравнить', en: 'Compare' },
  restore: { ru: 'Вернуть', en: 'Restore' },
  restored: { ru: 'Код возвращён к коммиту {id}.', en: 'The code is restored to commit {id}.' },
  copyPatch: { ru: 'Скопировать diff', en: 'Copy the diff' },
  patchCopied: { ru: 'Diff скопирован в буфер обмена.', en: 'The diff is copied to the clipboard.' },
  patchFailed: { ru: 'Не удалось скопировать diff.', en: 'The diff could not be copied.' },
  ask: { ru: 'Спросите помощника', en: 'Ask the assistant' },
  send: { ru: 'Отправить', en: 'Send' },
  fix: { ru: 'Исправить ошибки', en: 'Fix errors' },
  explain: { ru: 'Объяснить диаграмму', en: 'Explain the diagram' },
  format: { ru: 'Форматировать', en: 'Format' },
  fixPrompt: { ru: 'исправь ошибки', en: 'fix errors' },
  explainPrompt: { ru: 'объясни диаграмму', en: 'explain the diagram' },
  formatPrompt: { ru: 'форматируй код', en: 'format the code' },
  you: { ru: 'Вы', en: 'You' },
  helper: { ru: 'Помощник', en: 'Assistant' },
  output: { ru: 'Вывод', en: 'Output' },
  versions: { ru: 'Версии', en: 'Versions' },
  run: { ru: 'Запуск: {status}', en: 'Run: {status}' },
  noOutput: { ru: 'Запусков пока не было.', en: 'No runs yet.' },
};

const STORAGE_KEY = 'git-commits';
const VIEWS = ['search', 'git', 'ai'];

// The panels of the activity bar and the tabs under the code: search and replace, local Git history, the offline assistant, the run output.
export const initEditorTools = ({ root = document, storage, now = () => Date.now(), clipboard = root.defaultView.navigator.clipboard } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const codeLines = page?.querySelector('.code__lines');
  if (!codeLines) return null;
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const t = (key, params = {}) => TEXTS[key][lang].replace(/\{(\w+)\}/g, (_, name) => params[name]);
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
  const input = (placeholder, label) => {
    const node = el('input', 'editor-tools__input');
    node.type = 'text';
    node.placeholder = placeholder;
    node.setAttribute('aria-label', label);
    return node;
  };
  const code = () => readCode(codeLines);
  const write = (text) => {
    showCode(root, codeLines, text);
    page.dispatchEvent(new root.defaultView.CustomEvent('dslkit:run', { bubbles: true }));
  };
  const status = el('p', 'editor-tools__status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const say = (text) => {
    status.textContent = text;
    return text;
  };

  const loadCommits = () => {
    const saved = storage.get(STORAGE_KEY, []);
    return Array.isArray(saved) ? saved : [];
  };
  let commits = loadCommits();
  const saveCommits = () => storage.set(STORAGE_KEY, commits);

  // ----- search and replace
  const searchView = el('section', 'editor-tools__view');
  const findBox = input(t('find'), t('find'));
  const replaceBox = input(t('replace'), t('replace'));
  const caseLabel = el('label', 'editor-tools__check');
  const caseBox = el('input');
  caseBox.type = 'checkbox';
  caseLabel.append(caseBox, ` ${t('matchCase')}`);
  const replaceButton = button(t('replaceAll'));
  const results = el('ul', 'editor-tools__list');
  const search = () => {
    const matches = searchLines(code(), findBox.value, caseBox.checked);
    results.replaceChildren(
      ...matches.map((match) => {
        const item = el('li');
        const go = button(`${t('line', match)}: ${match.text.trim()}`, 'button button--quiet editor-tools__hit');
        go.dataset.line = String(match.line);
        item.append(go);
        return item;
      }),
    );
    return say(t('found', { n: matches.length }));
  };
  findBox.addEventListener('input', search);
  caseBox.addEventListener('change', search);
  results.addEventListener('click', (event) => {
    const hit = event.target.closest('[data-line]');
    if (!hit) return;
    const line = codeLines.querySelectorAll('.code__line')[Number(hit.dataset.line) - 1];
    codeLines.querySelectorAll('.code__line--found').forEach((node) => node.classList.remove('code__line--found'));
    line.classList.add('code__line--found');
    line.scrollIntoView?.({ block: 'center' });
  });
  replaceButton.addEventListener('click', () => {
    const done = replaceAll(code(), findBox.value, replaceBox.value, caseBox.checked);
    if (done.count > 0) write(done.text);
    search();
    return say(t('replaced', { n: done.count }));
  });
  searchView.append(findBox, caseLabel, replaceBox, replaceButton, results);

  // ----- local Git
  const gitView = el('section', 'editor-tools__view');
  const messageBox = input(t('message'), t('message'));
  const commitButton = button(t('commit'), 'button button--primary');
  const patchButton = button(t('copyPatch'));
  const summary = el('p', 'editor-tools__summary');
  const log = el('ul', 'editor-tools__list editor-tools__log');
  const diffBox = el('pre', 'editor-tools__diff');
  diffBox.hidden = true;
  const showSummary = () => {
    if (commits.length === 0) summary.textContent = t('untracked');
    else {
      const ops = diffLines(commits[0].text, code());
      const add = ops.filter((op) => op.type === 'add').length;
      const del = ops.filter((op) => op.type === 'del').length;
      summary.textContent = add + del === 0 ? t('clean') : t('changes', { add, del });
    }
    const branch = page.querySelector('.editor-status__branch');
    if (branch) branch.lastChild.textContent = commits.length > 0 && summary.textContent !== t('clean') ? ' main*' : ' main';
  };
  const renderLog = () => {
    const rows = commits.map((commit) => {
      const item = el('li', 'editor-tools__commit');
      item.dataset.id = commit.id;
      const title = el('span', 'editor-tools__commit-title', `${commit.id} ${commit.message}`);
      const time = el('time', 'editor-tools__commit-time', new Date(commit.at).toISOString().slice(0, 16).replace('T', ' '));
      const compare = button(t('diff'));
      compare.dataset.act = 'diff';
      const back = button(t('restore'));
      back.dataset.act = 'restore';
      item.append(title, time, compare, back);
      return item;
    });
    log.replaceChildren(...(rows.length > 0 ? rows : [el('li', 'editor-tools__empty', t('empty'))]));
    showSummary();
  };
  const commit = () => {
    const result = addCommit(commits, code(), messageBox.value, now());
    if (!result.added) return say(t('unchanged'));
    commits = result.commits;
    saveCommits();
    messageBox.value = '';
    renderLog();
    return say(t('committed', { id: commits[0].id }));
  };
  commitButton.addEventListener('click', commit);
  log.addEventListener('click', (event) => {
    const target = event.target.closest('[data-act]');
    const entry = target && commits.find((item) => item.id === target.closest('li').dataset.id);
    if (!entry) return;
    if (target.dataset.act === 'diff') {
      diffBox.textContent = diffText(diffLines(entry.text, code()));
      diffBox.hidden = false;
      return;
    }
    write(entry.text);
    renderLog();
    say(t('restored', { id: entry.id }));
  });
  patchButton.addEventListener('click', async () => {
    try {
      await clipboard.writeText(diffText(diffLines(commits[0]?.text ?? '', code())));
      say(t('patchCopied'));
    } catch {
      say(t('patchFailed'));
    }
  });
  gitView.append(messageBox, commitButton, patchButton, summary, log, diffBox);

  // ----- the assistant
  const aiView = el('section', 'editor-tools__view');
  const chat = el('ol', 'editor-tools__chat');
  const askBox = input(t('ask'), t('ask'));
  const sendButton = button(t('send'), 'button button--primary');
  const quick = [
    ['fix', 'fixPrompt'],
    ['explain', 'explainPrompt'],
    ['format', 'formatPrompt'],
  ].map(([label, prompt]) => {
    const node = button(t(label));
    node.dataset.prompt = t(prompt);
    return node;
  });
  const message = (who, text) => {
    const item = el('li', `editor-tools__message editor-tools__message--${who === t('you') ? 'user' : 'bot'}`);
    item.append(el('strong', '', `${who}: `), root.createTextNode(text));
    chat.append(item);
    item.scrollIntoView?.({ block: 'nearest' });
  };
  const ask = (prompt) => {
    if (prompt.trim() === '') return null;
    message(t('you'), prompt);
    const answer = assistant(prompt, code(), lang);
    if (answer.code !== undefined) write(answer.code);
    message(t('helper'), answer.text);
    askBox.value = '';
    return answer;
  };
  sendButton.addEventListener('click', () => ask(askBox.value));
  askBox.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') ask(askBox.value);
  });
  quick.forEach((node) => node.addEventListener('click', () => ask(node.dataset.prompt)));
  aiView.append(chat, askBox, sendButton, ...quick);
  message(t('helper'), assistant('?', '', lang).text);

  // ----- the drawer with the three views
  const drawer = el('aside', 'editor-tools');
  drawer.hidden = true;
  const heading = el('h2', 'editor-tools__heading');
  const closeButton = button(t('close'), 'button button--icon editor-tools__close');
  closeButton.setAttribute('aria-label', t('close'));
  closeButton.textContent = '×';
  const views = { search: searchView, git: gitView, ai: aiView };
  drawer.append(el('div', 'editor-tools__head'), status);
  drawer.firstChild.append(heading, closeButton);
  drawer.insertBefore(searchView, status);
  drawer.insertBefore(gitView, status);
  drawer.insertBefore(aiView, status);
  page.append(drawer);
  const buttons = [...page.querySelectorAll('[data-panel]')].filter((node) => VIEWS.includes(node.dataset.panel));
  let current = null;
  const open = (name) => {
    current = name;
    drawer.hidden = name === null;
    VIEWS.forEach((view) => (views[view].hidden = view !== name));
    buttons.forEach((node) => node.setAttribute('aria-pressed', String(node.dataset.panel === name)));
    if (name === null) return null;
    heading.textContent = t(name);
    if (name === 'search') {
      findBox.focus();
      search();
    } else if (name === 'git') {
      renderLog();
      say('');
    } else askBox.focus();
    return name;
  };
  buttons.forEach((node) => node.addEventListener('click', () => open(current === node.dataset.panel ? null : node.dataset.panel)));
  closeButton.addEventListener('click', () => open(null));
  drawer.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') open(null);
  });
  page.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      open('search');
    }
  });

  // ----- the tabs under the code: problems, assistant, output, versions
  const panel = page.querySelector('.problems');
  const tabs = [...page.querySelectorAll('[data-problems-tab]')];
  const outputList = el('ul', 'editor-tools__list problems__extra');
  const versionsList = el('ul', 'editor-tools__list problems__extra');
  const extra = { output: outputList, versions: versionsList };
  Object.values(extra).forEach((node) => {
    node.hidden = true;
    panel?.append(node);
  });
  const lines = [];
  const showOutput = () => outputList.replaceChildren(...(lines.length > 0 ? lines : [el('li', 'editor-tools__empty', t('noOutput'))]));
  const showVersions = () => {
    versionsList.replaceChildren(
      ...(commits.length > 0 ? commits : [{ id: '', message: t('empty') }]).map((entry) =>
        el('li', 'editor-tools__empty', `${entry.id} ${entry.message}`.trim()),
      ),
    );
  };
  const selectTab = (name) => {
    if (name === 'ai') open('ai');
    tabs.forEach((node) => {
      const active = node.dataset.problemsTab === name;
      node.setAttribute('aria-pressed', String(active));
      node.classList.toggle('problems__tab--active', active);
    });
    panel?.querySelectorAll('.problems__list, .problems__status').forEach((node) => (node.hidden = name !== 'problems'));
    Object.entries(extra).forEach(([key, node]) => (node.hidden = key !== name));
    if (name === 'output') showOutput();
    if (name === 'versions') showVersions();
    return name;
  };
  tabs.forEach((node) => node.addEventListener('click', () => selectTab(node.dataset.problemsTab)));
  page.addEventListener('dslkit:run', () => {
    setTimeout(() => {
      const text = page.querySelector('.problems__status')?.textContent ?? '';
      lines.unshift(el('li', '', `${new Date(now()).toISOString().slice(11, 19)} ${t('run', { status: text })}`));
      lines.length = Math.min(lines.length, 50);
      if (!outputList.hidden) showOutput();
    }, 0);
  });

  // The Fix button of a problem repairs the code with the same rules as the assistant.
  panel?.addEventListener('click', (event) => {
    if (!event.target.closest('.problems__item .button')) return;
    open('ai');
    ask(t('fixPrompt'));
  });

  renderLog();
  return { open, selectTab, commit, ask, commits: () => commits, current: () => current };
};
