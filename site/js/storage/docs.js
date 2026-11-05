// The documentation of the program. The texts are in site/js/docs; a developer can change a section, the change is kept in the browser and shown instead of the original.
// Only the role "developer" may write: the store refuses everybody else.
const KEY = 'docs';

export const createDocsStore = ({ storage, defaults }) => {
  const read = () => {
    const saved = storage.get(KEY, {});
    return saved !== null && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  };
  const slot = (lang, kind, id) => `${lang}/${kind}/${id}`;
  const original = (lang, kind, id) => defaults[lang]?.[kind]?.find((section) => section.id === id) ?? null;

  const sections = (lang, kind) => (defaults[lang]?.[kind] ?? []).map(({ id, title }) => ({ id, title }));
  const get = (lang, kind, id) => {
    const base = original(lang, kind, id);
    if (base === null) return null;
    const edited = read()[slot(lang, kind, id)];
    return typeof edited === 'string' ? { ...base, body: edited, edited: true } : { ...base, edited: false };
  };
  const set = (user, lang, kind, id, body) => {
    if (user?.role !== 'developer') return { ok: false, error: 'forbidden' };
    if (original(lang, kind, id) === null) return { ok: false, error: 'unknown' };
    if (typeof body !== 'string' || body.trim() === '' || body.length > 100000) return { ok: false, error: 'invalid' };
    return storage.set(KEY, { ...read(), [slot(lang, kind, id)]: body }) ? { ok: true } : { ok: false, error: 'storage' };
  };
  const reset = (user, lang, kind, id) => {
    if (user?.role !== 'developer') return { ok: false, error: 'forbidden' };
    const { [slot(lang, kind, id)]: removed, ...rest } = read();
    return storage.set(KEY, rest) ? { ok: true, was: removed !== undefined } : { ok: false, error: 'storage' };
  };
  return { sections, get, set, reset };
};
