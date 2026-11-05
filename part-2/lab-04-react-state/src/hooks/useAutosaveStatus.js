import { useEffect, useState } from 'react';

export const AUTOSAVE_DELAY = 500;

// Shows "saving" right after a change and "saved" once the data has been quiet for 500 ms (debounce).
export function useAutosaveStatus(value) {
  const [status, setStatus] = useState('saved');

  useEffect(() => {
    setStatus('saving');
    const timer = setTimeout(() => setStatus('saved'), AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [value]);

  return status;
}
