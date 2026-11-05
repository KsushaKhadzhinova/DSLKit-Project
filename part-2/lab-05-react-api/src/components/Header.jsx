// Page header of Part 1: logo, navigation, theme switch. The burger and the theme switch are CSS-only checkboxes, as on the site.
export default function Header({ signedIn, onLogout }) {
  return (
    <header className="header">
      <div className="header__inner">
        <a className="header__logo" href="/">
          <img className="header__logo-image" src="/logo.svg" alt="" width="32" height="32" />
          <span className="header__logo-text">DSLKit</span>
        </a>
        <input className="burger__input" type="checkbox" id="burger-toggle" aria-label="Открыть меню" />
        <label className="burger__button" htmlFor="burger-toggle">
          <span className="burger__label">Меню</span>
          <span className="burger__icon" aria-hidden="true"></span>
        </label>
        <nav className="nav" aria-label="Основная навигация">
          <ul className="nav__list">
            <li className="nav__item">
              <a className="nav__link" href="#main" aria-current="page">
                Диаграммы
              </a>
            </li>
            {signedIn && (
              <li className="nav__item">
                <button type="button" className="nav__link" onClick={onLogout}>
                  Выйти
                </button>
              </li>
            )}
          </ul>
        </nav>
        <div className="header__tools">
          <input className="theme__input" type="checkbox" id="theme-toggle" aria-label="Тёмная тема" />
          <label className="theme__button" htmlFor="theme-toggle" title="Тёмная тема">
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
            <span className="theme__label">Тёмная тема</span>
          </label>
        </div>
      </div>
    </header>
  );
}
