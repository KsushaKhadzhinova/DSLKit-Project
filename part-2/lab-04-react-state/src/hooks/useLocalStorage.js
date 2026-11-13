import { useEffect, useState } from 'react';

export const INVALID_SUFFIX = '.invalid';

// The saving effect overwrites the key with the fallback on the next run, so the unreadable original is first
// copied to `<key>.invalid` (the last bad copy only) and the user can still recover it by hand.
function keepInvalid(key, raw) {
  try {
    localStorage.setItem(key + INVALID_SUFFIX, raw);
  } catch {
    // Storage is full or blocked: nothing more can be done.
  }
}

function readStorage(key, fallback, validate, repair) {
  let raw = null;
  try {
    raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    if (validate(parsed)) return parsed;
    // Data of a wrong shape may still hold usable parts: repair keeps them, null means nothing can be saved.
    const repaired = repair?.(parsed);
    if (repaired == null) keepInvalid(key, raw);
    return repaired ?? fallback;
  } catch {
    if (raw !== null) keepInvalid(key, raw);
    return fallback;
  }
}

// State that is loaded once from localStorage (lazy initializer) and saved on every change.
// `validate` rejects stored data of a wrong shape, then the initial value is used.
export function useLocalStorage(key, initialValue, validate = () => true, repair) {
  const [value, setValue] = useState(() => readStorage(key, initialValue, validate, repair));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage is full or blocked: keep working in memory.
    }
  }, [key, value]);

  return [value, setValue];
}
