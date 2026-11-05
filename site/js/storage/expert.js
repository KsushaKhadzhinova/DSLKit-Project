// The rules of the expert system. The originals are in site/js/expert; a developer can change a rule, the change is kept in the browser and used instead of the original.
// Only the role "developer" may write: the store refuses everybody else (the same rule as the documentation store).
import { ruleProblems } from '../expert/engine.js';

const KEY = 'expert-rules';

export const createExpertStore = ({ storage, bases }) => {
  const read = () => {
    const saved = storage.get(KEY, {});
    return saved !== null && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  };
  const slot = (kb, id) => `${kb}/${id}`;
  const original = (kb, id) => bases[kb]?.rules.find((item) => item.id === id) ?? null;
  const isDeveloper = (user) => user?.role === 'developer';

  // The rules of a base as they work now: the edited rule instead of the original one.
  const rules = (kb) => {
    const saved = read();
    return (bases[kb]?.rules ?? []).map((item) => (ruleProblems(saved[slot(kb, item.id)]).length === 0 ? saved[slot(kb, item.id)] : item));
  };
  const edited = (kb, id) => ruleProblems(read()[slot(kb, id)]).length === 0;
  const set = (user, kb, id, rule) => {
    if (!isDeveloper(user)) return { ok: false, error: 'forbidden' };
    if (original(kb, id) === null) return { ok: false, error: 'unknown' };
    const problems = ruleProblems(rule);
    if (problems.length > 0 || rule.id !== id) return { ok: false, error: 'invalid', problems };
    return storage.set(KEY, { ...read(), [slot(kb, id)]: rule }) ? { ok: true } : { ok: false, error: 'storage' };
  };
  const reset = (user, kb, id) => {
    if (!isDeveloper(user)) return { ok: false, error: 'forbidden' };
    const { [slot(kb, id)]: removed, ...rest } = read();
    return storage.set(KEY, rest) ? { ok: true, was: removed !== undefined } : { ok: false, error: 'storage' };
  };
  const resetAll = (user) => {
    if (!isDeveloper(user)) return { ok: false, error: 'forbidden' };
    return storage.set(KEY, {}) ? { ok: true } : { ok: false, error: 'storage' };
  };
  return { rules, edited, original, set, reset, resetAll };
};
