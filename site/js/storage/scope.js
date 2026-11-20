import { currentUser } from './accounts.js';

// Data that belongs to an account (settings, the versions of the Git panel) is kept under a key of the account, like the projects:
// a guest uses the plain key, a signed-in user "<key>.<id>", so two accounts of one browser never see each other's data.
export const scopedKey = (storage, key) => {
  const user = currentUser(storage);
  return user ? `${key}.${user.id}` : key;
};
