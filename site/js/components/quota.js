import { currentUser } from '../storage/accounts.js';
import { createProjectStore, showQuota } from '../storage/projects.js';

// The quota block of the side bar shows the real number of diagrams created today on every page of the application.
export const initQuota = ({ root = document, storage, now = () => Date.now() } = {}) => {
  const text = root.querySelector('.app-nav__quota-text');
  if (!text) return null;
  const store = createProjectStore({ storage, now, owner: currentUser(storage)?.id ?? null });
  const refresh = () => showQuota(text, root.querySelector('.app-nav__progress'), store.createdOn(), root.documentElement.lang === 'en' ? 'en' : 'ru');
  refresh();
  return { refresh };
};
