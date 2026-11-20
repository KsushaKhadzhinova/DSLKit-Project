import { currentUser } from '../storage/accounts.js';
import { can } from '../auth/permissions.js';
import { createProjectStore, showQuota } from '../storage/projects.js';
import { pageLanguage } from '../utils/lang.js';

// The quota block of the side bar shows the real number of diagrams created today on every page of the application.
export const initQuota = ({ root = document, storage, now = () => Date.now() } = {}) => {
  const text = root.querySelector('.app-nav__quota-text');
  if (!text) return null;
  const user = currentUser(storage);
  const store = createProjectStore({ storage, now, owner: user?.id ?? null });
  const refresh = () => showQuota(text, root.querySelector('.app-nav__progress'), store.createdOn(), pageLanguage(root), can(user, 'diagram.unlimited'));
  refresh();
  return { refresh };
};
