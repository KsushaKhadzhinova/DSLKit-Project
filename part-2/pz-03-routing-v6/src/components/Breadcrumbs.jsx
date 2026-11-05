import { Link, useLocation } from 'react-router-dom';
import { findTemplate } from '../data/templates';

const LABELS = {
  catalog: 'Каталог',
  about: 'О проекте',
  dashboard: 'Кабинет',
  admin: 'Администратор',
  login: 'Вход',
};

// Second segment under /dashboard: a plain object again, so the same Object.hasOwn guard as LABELS applies.
const DASHBOARD_LABELS = {
  projects: 'Проекты',
  profile: 'Профиль',
};

// Builds the trail from the address: Главная / Каталог / name of the template.
// An unknown segment (the 404 page, an unknown template id) gives no trail at all instead of a wrong one.
export function buildCrumbs(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [];
  const crumbs = [{ to: '/', label: 'Главная' }];
  let path = '';
  for (let i = 0; i < parts.length; i += 1) {
    path += `/${parts[i]}`;
    // LABELS is a plain object, so a segment named __proto__, constructor, toString and the like must be
    // looked up with Object.hasOwn: a bare LABELS[parts[i]] would return an inherited Object.prototype value
    // (an object or a function, not a string) for those names instead of "not found".
    const label =
      parts[0] === 'catalog' && i === 1
        ? findTemplate(parts[i])?.title
        : i === 0 && Object.hasOwn(LABELS, parts[i])
          ? LABELS[parts[i]]
          : parts[0] === 'dashboard' && i === 1 && Object.hasOwn(DASHBOARD_LABELS, parts[i])
            ? DASHBOARD_LABELS[parts[i]]
            : undefined;
    if (typeof label !== 'string' || !label) return [];
    crumbs.push({ to: path, label });
  }
  return crumbs;
}

export default function Breadcrumbs() {
  const crumbs = buildCrumbs(useLocation().pathname);
  if (crumbs.length === 0) return null;
  return (
    <nav className="breadcrumbs" aria-label="Хлебные крошки">
      <ol className="breadcrumbs__list">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li className="breadcrumbs__item" key={crumb.to}>
              {last ? <span aria-current="page">{crumb.label}</span> : <Link to={crumb.to}>{crumb.label}</Link>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
