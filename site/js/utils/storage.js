export function createMemoryBackend() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

export function createStorage(backend, prefix = 'dslkit.') {
  const fullKey = (key) => `${prefix}${key}`;

  return {
    get(key, fallback = null) {
      try {
        const raw = backend.getItem(fullKey(key));
        if (raw === null) {
          return fallback;
        }
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        backend.setItem(fullKey(key), JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        backend.removeItem(fullKey(key));
        return true;
      } catch {
        return false;
      }
    },
  };
}

// When the browser gives no storage (private mode, blocked site data) the data lives in memory until the page closes; `volatile` tells the callers
// that nothing is kept, so an account cannot be made or signed in to as if it were saved.
const inMemory = () => ({ ...createStorage(createMemoryBackend()), volatile: true });

export function getStorage(win = globalThis) {
  try {
    const local = win.localStorage;
    if (local === undefined || local === null) {
      return inMemory();
    }
    return createStorage(local);
  } catch {
    return inMemory();
  }
}
