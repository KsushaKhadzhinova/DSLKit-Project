// The last requests of the wizard, kept in the browser for every user apart.
const LIMIT = 10;
const MODES = ['code', 'idea', 'image'];

export const createRequestHistory = ({ storage, now = () => Date.now() }) => {
  const key = (user) => `automation-history.${user?.id ?? 'guest'}`;
  const list = (user) => {
    const saved = storage.get(key(user), []);
    return Array.isArray(saved) ? saved.filter((item) => MODES.includes(item?.mode) && typeof item.text === 'string') : [];
  };
  // The same request is moved to the top instead of being added twice.
  const add = (user, { mode, text, notation }) => {
    const entry = { mode, text: String(text).slice(0, 2000), notation: notation ?? 'auto', at: now() };
    const next = [entry, ...list(user).filter((item) => !(item.mode === entry.mode && item.text === entry.text))].slice(0, LIMIT);
    return storage.set(key(user), next) ? next : list(user);
  };
  const clear = (user) => storage.set(key(user), []);
  return { list, add, clear };
};
