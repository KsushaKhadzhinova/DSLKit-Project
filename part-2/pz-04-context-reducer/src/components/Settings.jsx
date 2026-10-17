import { useLanguage } from '../context/LanguageContext';

// The language button of the header tools. The theme switch is the shared moon and sun checkbox of the shell,
// which reads the same ThemeContext.
export default function LanguageSwitch() {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <button type="button" className="button button--quiet header__lang" aria-label={`${t('language')}: ${language.toUpperCase()}`} data-tip={t('switchLanguage')} onClick={toggleLanguage}>
      {language.toUpperCase()}
    </button>
  );
}
