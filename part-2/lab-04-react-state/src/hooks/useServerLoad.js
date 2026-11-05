import { useEffect, useState } from 'react';

// Simulates loading the list from a server: 1 second after start (task, part 4).
// The delay lives in an object so the test setup can switch it off for the other tests.
export const loadConfig = { delay: 1000 };

export function useServerLoad() {
  const [loading, setLoading] = useState(() => loadConfig.delay > 0);

  useEffect(() => {
    if (!loading) return undefined;
    const timer = setTimeout(() => setLoading(false), loadConfig.delay);
    return () => clearTimeout(timer);
  }, [loading]);

  return loading;
}
