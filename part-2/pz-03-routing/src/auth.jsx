import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import limits from './limits.json';

export const AUTH_KEY = 'dslkit.isAuth';
export const USER_KEY = 'dslkit.userName';

const AuthContext = createContext(null);

// Returns an error text for a user name or null. A whitespace-only value counts as empty; limits live in limits.json.
export function validateUserName(value) {
  const length = typeof value === 'string' ? value.trim().length : 0;
  if (length < limits.userName.minLength) return 'Введите имя пользователя';
  if (length > limits.userName.maxLength) return `Имя не длиннее ${limits.userName.maxLength} символов`;
  return null;
}

// A return address must be a path on this site. "//host", "https://host" and "/login" itself are not followed.
export function safeReturnPath(value, fallback = '/dashboard') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value === '/login' || value.startsWith('/login?') || value.startsWith('/login#') || value === '/logout') return fallback;
  return value;
}

const readStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const readAuth = () => {
  const name = readStorage(USER_KEY);
  // A stored flag counts only together with a valid name, so a hand-written "true" is not enough to show a profile.
  return readStorage(AUTH_KEY) === 'true' && validateUserName(name) === null ? name.trim() : null;
};

// Fake authentication: the session lives in state and in localStorage, no real server is involved.
// A real check can only be made on a server, so this guard hides pages in the interface and does not protect data.
export function AuthProvider({ children }) {
  const [userName, setUserName] = useState(readAuth);

  const login = useCallback((name) => {
    try {
      localStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem(USER_KEY, name.trim());
    } catch {
      // Storage is blocked: the session lasts until the page is reloaded.
    }
    setUserName(name.trim());
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // Nothing to clear.
    }
    setUserName(null);
  }, []);

  // Signing out in another tab signs out here too.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === null || event.key === AUTH_KEY || event.key === USER_KEY) setUserName(readAuth());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ isAuth: userName !== null, userName, login, logout }), [userName, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
