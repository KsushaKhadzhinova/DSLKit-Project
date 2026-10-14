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

export function getStorage(win = globalThis) {
  try {
    const local = win.localStorage;
    if (local === undefined || local === null) {
      return createStorage(createMemoryBackend());
    }
    return createStorage(local);
  } catch {
    return createStorage(createMemoryBackend());
  }
}
