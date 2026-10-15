import { createContext, useCallback, useContext, useState } from 'react';

export const AUTH_KEY = 'dslkit.isAuth';

const AuthContext = createContext(null);

// Fake authentication: the flag lives in state and in localStorage, no real server is involved.
export function AuthProvider({ children }) {
  const [isAuth, setIsAuth] = useState(() => localStorage.getItem(AUTH_KEY) === 'true');

  const login = () => {
    localStorage.setItem(AUTH_KEY, 'true');
    setIsAuth(true);
  };
  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuth(false);
  }, []);

  return <AuthContext.Provider value={{ isAuth, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
