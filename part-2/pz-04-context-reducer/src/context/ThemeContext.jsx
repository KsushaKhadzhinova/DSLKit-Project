import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const THEME_KEY = 'dslkit.theme';

const ThemeContext = createContext(null);

const systemTheme = () => (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

// A saved choice wins, otherwise the system preference decides (light first, as on the Part 1 site).
// Anything else in storage is ignored.
export function readTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage is blocked: use the system preference.
  }
  return systemTheme();
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readTheme);

  // The root attribute lets the colour tokens of dslkit.css switch the whole page.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo(() => {
    const setTheme = (next) => {
      setThemeState(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // The choice lives in memory only.
      }
    };
    return { theme, setTheme, toggleTheme: () => setTheme(theme === 'light' ? 'dark' : 'light') };
  }, [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
