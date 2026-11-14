import { useEffect, useState } from 'react';

// Returns the value only after it stays unchanged for delayMs, so a request is not sent on every keystroke.
export function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
