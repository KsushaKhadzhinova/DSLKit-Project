import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

const NAV = [
  { to: '/', label: 'Главная', end: true },
  { to: '/catalog', label: 'Каталог' },
  { to: '/about', label: 'О проекте' },
  { to: '/dashboard', label: 'Кабинет' },
];

const linkClass = ({ isActive }) => (isActive ? 'nav__link nav__link--active' : 'nav__link');

export default function Layout() {
  const { isAuth } = useAuth();

  return (
    <>
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      <header className="header">
        <nav className="nav" aria-label="Основная навигация">
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              {label}
            </NavLink>
          ))}
          {isAuth ? (
            <NavLink to="/logout" className={linkClass}>
              Выйти
            </NavLink>
          ) : (
            <NavLink to="/login" className={linkClass}>
              Войти
            </NavLink>
          )}
        </nav>
      </header>
      <main className="page" id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
