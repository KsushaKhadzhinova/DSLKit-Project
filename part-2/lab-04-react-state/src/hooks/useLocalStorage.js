import { useEffect, useState } from 'react';

function readStorage(key, fallback, validate) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

// State that is loaded once from localStorage (lazy initializer) and saved on every change.
// `validate` rejects stored data of a wrong shape, then the initial value is used.
export function useLocalStorage(key, initialValue, validate = () => true) {
  const [value, setValue] = useState(() => readStorage(key, initialValue, validate));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage is full or blocked: keep working in memory.
    }
  }, [key, value]);

  return [value, setValue];
}
