import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const DICTIONARY = {
  ru: {
    title: 'Шаблоны диаграмм',
    theme: 'Тема',
    light: 'Светлая',
    dark: 'Тёмная',
    language: 'Язык',
    add: 'В избранное',
    remove: 'Убрать',
    favorites: 'Избранное',
    empty: 'Пока ничего не выбрано.',
    clear: 'Очистить',
    count: 'Выбрано',
    drillingTitle: 'Демонстрация prop drilling',
    drillingHint: 'Имя пользователя проходит через Header, Navigation и UserMenu, которым оно не нужно.',
  },
  en: {
    title: 'Diagram templates',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
    add: 'Add to favorites',
    remove: 'Remove',
    favorites: 'Favorites',
    empty: 'Nothing selected yet.',
    clear: 'Clear',
    count: 'Selected',
    drillingTitle: 'Prop drilling demo',
    drillingHint: 'The user name passes through Header, Navigation and UserMenu, which do not need it.',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('ru');

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      toggleLanguage: () => setLanguage((prev) => (prev === 'ru' ? 'en' : 'ru')),
      t: (key) => DICTIONARY[language][key],
    }),
    [language],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
