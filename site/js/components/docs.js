import { renderMarkdown } from '../utils/markdown.js';
import { createAccountStore } from '../storage/accounts.js';
import { createDocsStore } from '../storage/docs.js';
import { DOCS as RU } from '../docs/content.ru.js';
import { DOCS as EN } from '../docs/content.en.js';

const KINDS = ['project', 'guides', 'code'];
const TEXTS = {
  ru: {
    saved: 'Раздел сохранён.',
    reset: 'Возвращён исходный текст.',
    forbidden: 'Менять документацию может только разработчик.',
    invalid: 'Текст пустой или слишком длинный.',
    failed: 'Не удалось сохранить.',
    edited: 'Изменено разработчиком',
    none: 'Раздела нет.',
    roleOn: 'Роль «разработчик» включена.',
    roleOff: 'Вы вышли из роли.',
    roleWrong: 'Код неверный.',
    roleSignIn: 'Сначала войдите в аккаунт.',
  },
  en: {
    saved: 'The section is saved.',
    reset: 'The original text is back.',
    forbidden: 'Only a developer can change the documentation.',
    invalid: 'The text is empty or too long.',
    failed: 'It could not be saved.',
    edited: 'Changed by a developer',
    none: 'There is no such section.',
    roleOn: 'The role "developer" is on.',
    roleOff: 'You left the role.',
    roleWrong: 'The code is wrong.',
    roleSignIn: 'Sign in first.',
  },
};

// The documentation page: sections of three kinds (program, guides, code) read from site/js/docs, and the editing of a section for the developer role.
export const initDocs = ({ root = document, storage, developerHash } = {}) => {
  const article = root.querySelector('.docs__article');
  if (!article) return null;
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const t = TEXTS[lang];
  const docs = createDocsStore({ storage, defaults: { ru: RU, en: EN } });
  const accounts = createAccountStore({ storage, ...(developerHash ? { developerHash } : {}) });
  const view = root.defaultView;
  const list = root.querySelector('.docs__list');
  const buttons = [...root.querySelectorAll('[data-docs-kind]')];
  const editor = root.querySelector('.docs__editor');
  const text = root.querySelector('.docs__text');
  const editButton = root.querySelector('[data-docs-edit]');
  const status = root.querySelector('.docs__status');

  const params = new view.URLSearchParams(view.location.search);
  let kind = KINDS.includes(params.get('kind')) ? params.get('kind') : 'project';
  let current = null;

  const say = (message) => {
    status.textContent = message;
    return message;
  };
  const developer = () => accounts.current()?.role === 'developer';

  const showSection = (id) => {
    const section = docs.get(lang, kind, id);
    editor.hidden = true;
    if (section === null) {
      article.replaceChildren(Object.assign(root.createElement('p'), { textContent: t.none }));
      editButton.hidden = true;
      return null;
    }
    current = id;
    const heading = root.createElement('h2');
    heading.textContent = section.title;
    article.replaceChildren(heading, renderMarkdown(root, section.body));
    if (section.edited) {
      const note = root.createElement('p');
      note.className = 'docs__edited';
      note.textContent = t.edited;
      article.append(note);
    }
    list.querySelectorAll('[data-docs-id]').forEach((button) => button.setAttribute('aria-current', String(button.dataset.docsId === id)));
    editButton.hidden = !developer();
    return id;
  };

  const showKind = (name) => {
    kind = name;
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.docsKind === kind)));
    const sections = docs.sections(lang, kind);
    list.replaceChildren(
      ...sections.map(({ id, title }) => {
        const item = root.createElement('li');
        const button = root.createElement('button');
        button.type = 'button';
        button.className = 'docs__link';
        button.dataset.docsId = id;
        button.textContent = title;
        item.append(button);
        return item;
      }),
    );
    return showSection(sections[0].id);
  };

  buttons.forEach((button) => button.addEventListener('click', () => showKind(button.dataset.docsKind)));
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-docs-id]');
    if (button) showSection(button.dataset.docsId);
  });

  editButton.addEventListener('click', () => {
    const section = docs.get(lang, kind, current);
    if (!developer()) return say(t.forbidden);
    text.value = section.body;
    editor.hidden = false;
    text.focus();
    return say('');
  });
  const write = (result, ok) => {
    if (!result.ok) return say(t[result.error === 'forbidden' || result.error === 'invalid' ? result.error : 'failed']);
    showSection(current);
    return say(ok);
  };
  root.querySelector('[data-docs-save]').addEventListener('click', () => write(docs.set(accounts.current(), lang, kind, current, text.value), t.saved));
  root.querySelector('[data-docs-reset]').addEventListener('click', () => write(docs.reset(accounts.current(), lang, kind, current), t.reset));
  root.querySelector('[data-docs-cancel]').addEventListener('click', () => {
    editor.hidden = true;
    say('');
  });
  // The form of the developer role: a code unlocks the editing, the role belongs to the account.
  const roleForm = root.querySelector('[data-docs-role]');
  const roleOff = root.querySelector('[data-docs-role-off]');
  const syncRole = () => {
    const on = developer();
    roleOff.hidden = !on;
    roleForm.querySelector('[data-docs-role-on]').hidden = on;
    roleForm.querySelector('.docs__role-input').hidden = on;
    roleForm.querySelector('.docs__role-label').hidden = on;
    editButton.hidden = !on || current === null;
  };
  roleForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const field = roleForm.querySelector('.docs__role-input');
    const result = await accounts.becomeDeveloper(field.value);
    field.value = '';
    syncRole();
    return say(result.ok ? t.roleOn : t[result.error === 'signed-out' ? 'roleSignIn' : 'roleWrong']);
  });
  roleOff.addEventListener('click', () => {
    accounts.leaveDeveloper();
    editor.hidden = true;
    syncRole();
    say(t.roleOff);
  });
  view.addEventListener('storage', () => {
    showSection(current);
    syncRole();
  });
  syncRole();

  showKind(kind);
  return { showKind, showSection, kind: () => kind, current: () => current };
};
