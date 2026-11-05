// The tasks of the decision page are kept in the browser, for every user of the browser apart (a guest has a list of his own).
const LIMIT = 30;

export const createDecisionStore = ({ storage, now = () => Date.now() }) => {
  const key = (user) => `decision-tasks.${user?.id ?? 'guest'}`;
  const list = (user) => {
    const saved = storage.get(key(user), []);
    return Array.isArray(saved) ? saved.filter((item) => typeof item?.id === 'string' && typeof item.name === 'string') : [];
  };
  // A task with the same name is replaced; the newest task goes first.
  const save = (user, name, state) => {
    const title = String(name).trim().slice(0, 80);
    if (title === '') return { ok: false, error: 'name' };
    const saved = list(user);
    const known = saved.find((item) => item.name === title);
    const entry = { id: known?.id ?? `t${now().toString(36)}`, name: title, state, updated: now() };
    const next = [entry, ...saved.filter((item) => item.id !== entry.id)].slice(0, LIMIT);
    return storage.set(key(user), next) ? { ok: true, entry } : { ok: false, error: 'storage' };
  };
  const remove = (user, id) => {
    const saved = list(user);
    if (!saved.some((item) => item.id === id)) return { ok: false, error: 'unknown' };
    return storage.set(
      key(user),
      saved.filter((item) => item.id !== id),
    )
      ? { ok: true }
      : { ok: false, error: 'storage' };
  };
  return { list, save, remove };
};
