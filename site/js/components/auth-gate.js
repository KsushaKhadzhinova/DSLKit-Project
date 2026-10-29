import { currentUser } from '../storage/accounts.js';

// A page marked with data-requires-auth is only for a signed-in user: a guest is sent to the sign-in page.
export const initAuthGate = ({ root = document, storage, navigate = (url) => root.defaultView.location.replace(url) } = {}) => {
  if (root.body?.dataset.requiresAuth === undefined) return null;
  if (currentUser(storage) !== null) return null;
  navigate('login.html');
  return { redirected: true };
};
