import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <div className="settings">
      <button type="button" onClick={toggleTheme}>
        {t('theme')}: {t(theme)}
      </button>
      <button type="button" onClick={toggleLanguage}>
        {t('language')}: {language.toUpperCase()}
      </button>
    </div>
  );
}
