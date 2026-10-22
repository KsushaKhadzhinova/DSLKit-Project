import { useEffect, useState } from 'react';

function readStorage(key, fallback, validate, repair) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    if (validate(parsed)) return parsed;
    // Data of a wrong shape may still hold usable parts: repair keeps them, null means nothing can be saved.
    return repair?.(parsed) ?? fallback;
  } catch {
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
