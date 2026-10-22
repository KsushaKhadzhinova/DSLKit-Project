import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const LANGUAGE_KEY = 'dslkit.language';

const DICTIONARY = {
  ru: {
    title: 'Шаблоны диаграмм',
    lead: 'Выберите шаблоны в избранное. Тема, язык и избранное лежат в контекстах и доступны любому компоненту без передачи через props.',
    theme: 'Тема',
    themeDark: 'Тёмная тема',
    themeLight: 'Светлая тема',
    language: 'Язык',
    switchLanguage: 'Сменить язык',
    skip: 'Перейти к основному содержимому',
    menu: 'Меню',
    nav: 'Основная навигация',
    footerNav: 'Нижняя навигация',
    copy: '© 2026 DSLKit. Учебный проект БГУИР.',
    add: 'В избранное',
    remove: 'Убрать',
    favorites: 'Избранное',
    empty: 'Пока ничего не выбрано.',
    clear: 'Очистить',
    count: 'Выбрано',
    increase: 'Увеличить количество',
    decrease: 'Уменьшить количество',
    quantity: 'Количество',
    drillingTitle: 'Демонстрация prop drilling',
    drillingHint: 'Имя пользователя проходит через Header, Navigation и UserMenu, которым оно не нужно.',
    drillingProblem: 'Проблема: имя передаётся через props на каждом уровне',
    drillingSolution: 'Решение: имя берётся из UserContext, промежуточные уровни его не знают',
    drillingSolutionHint: 'Та же вложенность, но Header, Navigation и UserMenu не получают props: UserAvatar читает имя хуком useUser.',
  },
  en: {
    title: 'Diagram templates',
    lead: 'Pick templates into favorites. The theme, the language and the favorites live in contexts and any component reads them without props.',
    theme: 'Theme',
    themeDark: 'Dark theme',
    themeLight: 'Light theme',
    language: 'Language',
    switchLanguage: 'Switch language',
    skip: 'Skip to the main content',
    menu: 'Menu',
    nav: 'Main navigation',
    footerNav: 'Footer navigation',
    copy: '© 2026 DSLKit. BSUIR study project.',
    add: 'Add to favorites',
    remove: 'Remove',
    favorites: 'Favorites',
    empty: 'Nothing selected yet.',
    clear: 'Clear',
    count: 'Selected',
    increase: 'Increase quantity',
    decrease: 'Decrease quantity',
    quantity: 'Quantity',
    drillingTitle: 'Prop drilling demo',
    drillingHint: 'The user name passes through Header, Navigation and UserMenu, which do not need it.',
    drillingProblem: 'Problem: the name is passed as a prop at every level',
    drillingSolution: 'Solution: the name comes from UserContext, the middle levels do not know it',
    drillingSolutionHint: 'The same nesting, but Header, Navigation and UserMenu get no props: UserAvatar reads the name with the useUser hook.',
  },
};

const LANGUAGES = Object.keys(DICTIONARY);

// Only a known language code is accepted from storage.
export function readLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (LANGUAGES.includes(saved)) return saved;
  } catch {
    // Storage is blocked: keep the default.
  }
  return 'ru';
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(readLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      // The choice lives in memory only.
    }
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      toggleLanguage: () => setLanguage((prev) => (prev === 'ru' ? 'en' : 'ru')),
      // A missing key falls back to Russian and then to the key itself, so the page never shows "undefined".
      t: (key) => DICTIONARY[language][key] ?? DICTIONARY.ru[key] ?? key,
    }),
    [language],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// Outside the provider there is no value to read: fail with a message that names the provider.
export const useLanguage = () => {
  const value = useContext(LanguageContext);
  if (value === null) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
};
