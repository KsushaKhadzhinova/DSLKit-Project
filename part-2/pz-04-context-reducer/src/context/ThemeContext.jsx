import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

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
  const chosen = useRef(false);

  // The root attribute lets the colour tokens of dslkit.css switch the whole page.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo(() => {
    // Only the two known themes are accepted, anything else is ignored.
    const setTheme = (next) => {
      if (next !== 'light' && next !== 'dark') return;
      chosen.current = true;
      setThemeState(next);
    };
    // The functional update makes two toggles in a row flip twice, not once.
    const toggleTheme = () => {
      chosen.current = true;
      setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
    };
    return { theme, setTheme, toggleTheme };
  }, [theme]);

  // Only a choice made by the user is stored, so the system preference is still followed until then.
  useEffect(() => {
    if (!chosen.current) return;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // The choice lives in memory only.
    }
  }, [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Outside the provider there is no value to read: fail with a message that names the provider.
export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (value === null) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
};
