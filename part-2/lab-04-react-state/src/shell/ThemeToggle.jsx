import { useTheme } from './theme';

// Moon and sun icon switch from the Part 1 header: a checkbox with a label, a tooltip and an accessible name.
const DEFAULT_LABELS = { dark: 'Тёмная тема', light: 'Светлая тема' };

export default function ThemeToggle({ labels = DEFAULT_LABELS }) {
  const { theme, setTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <>
      <input className="theme__input" type="checkbox" id="theme-toggle" checked={dark} onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')} />
      <label className="theme__button" htmlFor="theme-toggle" data-tip={dark ? labels.light : labels.dark}>
        <svg className="theme__icon theme__icon--moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
        <svg className="theme__icon theme__icon--sun" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          />
        </svg>
        <span className="theme__label">{labels.dark}</span>
      </label>
    </>
  );
}
