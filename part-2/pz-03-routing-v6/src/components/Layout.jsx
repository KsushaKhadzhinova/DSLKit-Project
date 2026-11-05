import { Suspense, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import Breadcrumbs from './Breadcrumbs';
import SiteFooter from '../shell/SiteFooter';
import SiteHeader, { LogoContent } from '../shell/SiteHeader';

const NAV = [
  { to: '/', label: 'Главная', end: true },
  { to: '/catalog', label: 'Каталог' },
  { to: '/about', label: 'О проекте' },
  { to: '/dashboard', label: 'Кабинет' },
];

// A double click on the sign-in or sign-out link acts once: the first click already changes the link,
// so the second click would land on the new link (sign-in after sign-out) and send the user to the login page.
const ignoreRepeatClick = (event) => {
  if (event.detail > 1) event.preventDefault();
};

export default function Layout() {
  const { isAuth } = useAuth();
  const { pathname } = useLocation();
  const main = useRef(null);
  const first = useRef(true);

  // A route change does not reload the page, so the focus would stay on the clicked link and a screen reader would say nothing.
  // Moving the focus to the content announces the new page and lets a keyboard user start reading it.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    main.current?.focus();
  }, [pathname]);

  const items = (
    <>
      {NAV.map(({ to, label, end }) => (
        <li className="nav__item" key={to}>
          <NavLink className="nav__link" to={to} end={end}>
            {label}
          </NavLink>
        </li>
      ))}
      <li className="nav__item">
        <NavLink className="nav__link" to={isAuth ? '/logout' : '/login'} onClick={ignoreRepeatClick}>
          {isAuth ? 'Выйти' : 'Войти'}
        </NavLink>
      </li>
    </>
  );

  const footerLinks = (
    <>
      <li className="footer__item">
        <Link className="footer__link" to="/catalog">
          Каталог шаблонов
        </Link>
      </li>
      <li className="footer__item">
        <Link className="footer__link" to="/about">
          О проекте
        </Link>
      </li>
    </>
  );

  // A plain `<a href="#main">` only works with BrowserRouter: in hash mode (VITE_ROUTER=hash) the address bar
  // already holds the route after the hash, so "#main" is read by HashRouter as the route "main" and a click
  // on the skip-link lands on the 404 page instead of moving focus. Focusing the ref directly works the same
  // way in every router mode.
  const skipToMain = (event) => {
    event.preventDefault();
    main.current?.focus();
  };

  return (
    <>
      <a className="skip-link" href="#main" onClick={skipToMain}>
        Перейти к основному содержимому
      </a>
      <SiteHeader
        logo={
          <Link className="header__logo" to="/">
            <LogoContent />
          </Link>
        }
        nav={items}
      />
      <main className="main" id="main" tabIndex={-1} ref={main}>
        <Breadcrumbs />
        <Suspense
          fallback={
            <p className="empty" role="status">
              Загрузка страницы…
            </p>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter links={footerLinks} />
    </>
  );
}
