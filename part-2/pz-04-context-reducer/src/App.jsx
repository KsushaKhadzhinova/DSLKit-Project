import LanguageSwitch from './components/Settings';
import PropDrilling from './components/PropDrilling';
import { FavoritesPanel, TemplateList } from './components/Templates';
import { FavoritesProvider } from './context/FavoritesContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import SiteFooter from './shell/SiteFooter';
import SiteHeader, { LogoContent } from './shell/SiteHeader';

const SECTIONS = [
  ['templates', 'title'],
  ['favorites', 'favorites'],
  ['drilling', 'drillingTitle'],
];

function Page() {
  const { t } = useLanguage();

  const nav = SECTIONS.map(([id, key]) => (
    <li className="nav__item" key={id}>
      <a className="nav__link" href={`#${id}`}>
        {t(key)}
      </a>
    </li>
  ));
  const links = SECTIONS.map(([id, key]) => (
    <li className="footer__item" key={id}>
      <a className="footer__link" href={`#${id}`}>
        {t(key)}
      </a>
    </li>
  ));

  return (
    <>
      <a className="skip-link" href="#main">
        {t('skip')}
      </a>
      <SiteHeader
        logo={
          <a className="header__logo" href="/">
            <LogoContent />
          </a>
        }
        nav={nav}
        tools={<LanguageSwitch />}
        labels={{ menu: t('menu'), nav: t('nav') }}
        themeLabels={{ dark: t('themeDark'), light: t('themeLight') }}
      />
      <main className="main" id="main" tabIndex={-1}>
        <div className="page-head">
          <h1 className="page__title">DSLKit</h1>
          <p className="page-head__lead">{t('lead')}</p>
        </div>
        <TemplateList />
        <FavoritesPanel />
        <PropDrilling userName="Ксения" />
      </main>
      <SiteFooter links={links} labels={{ nav: t('footerNav'), copy: t('copy') }} />
    </>
  );
}

// Three providers wrap the tree once, any component below reads the state with a hook.
export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <FavoritesProvider>
          <Page />
        </FavoritesProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
