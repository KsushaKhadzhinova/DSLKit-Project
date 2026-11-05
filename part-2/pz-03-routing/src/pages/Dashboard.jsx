import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import { usePageTitle } from '../usePageTitle';
import PageHead from './PageHead';

// Three sub-sections share one URL base: the second part of the path after /dashboard chooses which one
// is active. The list is read by both the tab menu below and by Breadcrumbs.jsx, which needs the same
// path/label pairs to build the trail "Главная / Кабинет / Проекты".
export const DASHBOARD_TABS = [
  { to: '/dashboard', label: 'Обзор', end: true },
  { to: '/dashboard/projects', label: 'Проекты' },
  { to: '/dashboard/profile', label: 'Профиль' },
];

// Layout route for the signed-in area (nested inside PrivateRoute, which already redirects a guest to
// /login). Dashboard itself stays the one lazy-loaded chunk for the whole section: App.jsx wraps the
// overview/projects/profile sub-pages in their own `lazy()` calls that point at this same module, so
// opening any of the three only downloads this file once. One <h1> (PageHead) covers every sub-page,
// Outlet renders the one that matches the current address, same pattern as the top-level Layout.
export default function Dashboard() {
  usePageTitle('Личный кабинет');
  const { userName } = useAuth();
  return (
    <>
      <PageHead title="Личный кабинет" lead={`Здравствуйте, ${userName}.`} />
      <nav className="tabs" aria-label="Разделы кабинета">
        <ul className="nav__list">
          {DASHBOARD_TABS.map(({ to, label, end }) => (
            <li className="nav__item" key={to}>
              <NavLink className="nav__link" to={to} end={end}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </>
  );
}

// Index route /dashboard: the original overview text, plus the admin-only link, unchanged in substance.
export function DashboardOverview() {
  const { role } = useAuth();
  return (
    <>
      <p className="prose">Здесь будут ваши диаграммы. Страница доступна только после входа.</p>
      {role === 'admin' && (
        <p className="actions">
          <Link className="button" to="/admin">
            Раздел администратора
          </Link>
        </p>
      )}
    </>
  );
}

// A short fake list, just enough to show that a nested route can carry its own content and its own
// empty state, independent from the top-level /catalog page (which is the real, tested list with a
// search filter; this one is deliberately small, a real project list would come from the server).
const RECENT_PROJECTS = [
  { id: 'p1', title: 'Вход в систему', notation: 'UML' },
  { id: 'p2', title: 'Согласование заказа', notation: 'BPMN' },
];

export function DashboardProjects() {
  return (
    <>
      <h2 className="page__subtitle">Проекты</h2>
      {RECENT_PROJECTS.length === 0 ? (
        <p className="empty">Пока нет ни одного проекта.</p>
      ) : (
        <ul className="cards">
          {RECENT_PROJECTS.map((p) => (
            <li className="cards__item" key={p.id}>
              <article className="card">
                <h3 className="card__title">{p.title}</h3>
                <p className="card__meta">
                  <span className="badge">{p.notation}</span>
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
      <p className="actions">
        <Link className="link" to="/catalog">
          Открыть каталог шаблонов
        </Link>
      </p>
    </>
  );
}

export function DashboardProfile() {
  const { userName, role } = useAuth();
  return (
    <>
      <h2 className="page__subtitle">Профиль</h2>
      <dl className="prose">
        <dt>Имя</dt>
        <dd>{userName}</dd>
        <dt>Роль</dt>
        <dd>{role === 'admin' ? 'Администратор' : 'Пользователь'}</dd>
      </dl>
      <p className="prose">Имитация входа не хранит пароль и не отправляет данные на сервер, поэтому здесь нечего редактировать.</p>
    </>
  );
}
