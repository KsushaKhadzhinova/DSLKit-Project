import { currentUser } from '../storage/accounts.js';

// A page marked with data-requires-auth is only for a signed-in user: a guest is sent to the sign-in page.
// A sign-out in another tab removes the "session" key; this tab notices through the "storage" event and
// leaves too, so a page left open after a cross-tab sign-out cannot act on the signed-out user's data.
export const initAuthGate = ({ root = document, storage, navigate = (url) => root.defaultView.location.replace(url) } = {}) => {
  if (root.body?.dataset.requiresAuth === undefined) return null;
  const guard = () => {
    if (currentUser(storage) !== null) return false;
    navigate('login.html');
    return true;
  };
  const redirected = guard();
  root.defaultView?.addEventListener?.('storage', (event) => {
    if (event.key === null || event.key === 'session') guard();
  });
  return redirected ? { redirected: true } : null;
};
