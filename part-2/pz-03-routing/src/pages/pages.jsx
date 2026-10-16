import { useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { findTemplate, TEMPLATES } from '../data/templates';

export function Home() {
  return (
    <>
      <h1>DSLKit</h1>
      <p>Редактор диаграмм как кода: пишите текст, получайте UML, BPMN, ERD, DFD и IDEF0.</p>
      <Link to="/catalog">Открыть каталог шаблонов</Link>
    </>
  );
}

export function About() {
  return (
    <>
      <h1>О проекте</h1>
      <p>DSLKit это SaaS-сервис для описания диаграмм текстом. Страница нужна для практического занятия по маршрутизации.</p>
    </>
  );
}

export function Catalog() {
  return (
    <>
      <h1>Каталог шаблонов</h1>
      <ul>
        {TEMPLATES.map((t) => (
          <li key={t.id}>
            <Link to={`/catalog/${t.id}`}>{t.title}</Link> ({t.notation})
          </li>
        ))}
      </ul>
    </>
  );
}

// Dynamic route /catalog/:id. An unknown id renders the 404 page in place, the URL stays as typed.
export function CatalogItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const template = findTemplate(id);

  // history.state.idx is 0 on the first entry, so there is nothing to go back to: open the catalog instead.
  const goBack = () => (window.history.state?.idx === 0 ? navigate('/catalog') : navigate(-1));

  if (!template) return <NotFound />;

  return (
    <>
      <h1>{template.title}</h1>
      <p>Нотация: {template.notation}</p>
      <p>{template.description}</p>
      <button type="button" onClick={goBack}>
        Назад
      </button>
    </>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // After the fake sign-in go back to the page that required it, by default to the dashboard.
  const handleSubmit = (event) => {
    event.preventDefault();
    login();
    navigate(location.state?.from ?? '/dashboard', { replace: true });
  };

  return (
    <>
      <h1>Вход</h1>
      {location.state?.from && <p role="alert">Эта страница доступна после входа.</p>}
      <form onSubmit={handleSubmit}>
        <p>Имитация входа: данные не проверяются и никуда не отправляются.</p>
        <button type="submit">Войти</button>
      </form>
    </>
  );
}

export function Dashboard() {
  return (
    <>
      <h1>Личный кабинет</h1>
      <p>Здесь будут ваши диаграммы. Страница доступна только после входа.</p>
    </>
  );
}

export function NotFound() {
  return (
    <>
      <h1>404</h1>
      <p>Страница не найдена.</p>
      <Link to="/">На главную</Link>
    </>
  );
}

// /logout clears the fake session and leaves for the home page; the redirect is declarative,
// so it cannot race with PrivateRoute.
export function Logout() {
  const { logout } = useAuth();
  useEffect(() => {
    logout();
  }, [logout]);
  return <Navigate to="/" replace />;
}
