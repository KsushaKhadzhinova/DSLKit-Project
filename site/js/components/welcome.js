import { NOTATIONS } from '../notations/index.js';
import { currentUser } from '../storage/accounts.js';
import { createTemplateStore } from '../storage/projects.js';

// The templates of the user are listed after the built-in ones on the page "Templates"; a card opens a new diagram from the template.
export const initWelcome = ({ root = document, storage } = {}) => {
  const list = root.querySelector('.template-list');
  if (!list) return null;
  const mine = createTemplateStore({ storage, owner: currentUser(storage)?.id ?? null }).list();
  mine.forEach((template) => {
    const item = root.createElement('li');
    item.className = 'template-list__item';
    const card = root.createElement('article');
    card.className = 'template-card';
    const preview = root.createElement('div');
    preview.className = 'template-card__preview';
    preview.setAttribute('aria-hidden', 'true');
    const title = root.createElement('h2');
    title.className = 'template-card__title';
    const link = root.createElement('a');
    link.className = 'template-card__link';
    link.href = `editor.html?my=${encodeURIComponent(template.id)}`;
    link.textContent = template.title;
    title.append(link);
    const caption = root.createElement('p');
    caption.className = 'template-card__caption';
    caption.textContent = `${NOTATIONS[template.notation]?.short ?? template.notation.toUpperCase()} · ${root.documentElement.lang === 'en' ? 'My template' : 'Мой шаблон'}`;
    card.append(preview, title, caption);
    item.append(card);
    list.append(item);
  });
  return { count: mine.length };
};
