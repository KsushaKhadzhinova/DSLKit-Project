import { useState } from 'react';
import logoUrl from '../assets/logo.svg';
import ThemeToggle from './ThemeToggle';

// The header of the Part 1 site: logo, a burger menu on a phone, navigation, tools and the theme switch.
// `nav` holds the <li> items, `tools` holds extra controls placed before the theme switch,
// `logo` is the logo link element so that a router can supply its own Link.
const DEFAULT_LABELS = { menu: 'Меню', nav: 'Основная навигация' };

export default function SiteHeader({ logo, nav = null, tools = null, labels = DEFAULT_LABELS, themeLabels }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="header">
      <div className="header__inner">
        {logo}
        {nav && (
          <>
            <input className="burger__input" type="checkbox" id="burger-toggle" checked={open} onChange={(e) => setOpen(e.target.checked)} />
            <label className="burger__button" htmlFor="burger-toggle">
              <span className="burger__label">{labels.menu}</span>
              <span className="burger__icon" aria-hidden="true"></span>
            </label>
            {/* A click on any link closes the phone menu. */}
            <nav className="nav" aria-label={labels.nav} onClick={(e) => e.target.closest('a') && setOpen(false)}>
              <ul className="nav__list">{nav}</ul>
            </nav>
          </>
        )}
        <div className="header__tools">
          {tools}
          <ThemeToggle labels={themeLabels} />
        </div>
      </div>
    </header>
  );
}

export function LogoContent() {
  return (
    <>
      <img className="header__logo-image" src={logoUrl} alt="" width="32" height="32" />
      <span className="header__logo-text">DSLKit</span>
    </>
  );
}
