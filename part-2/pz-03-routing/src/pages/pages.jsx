import { useEffect, useId, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom';
import { safeReturnPath, useAuth, validateUserName } from '../auth';
import { findTemplate } from '../data/templates';
import limits from '../limits.json';
import ErrorPage, { ErrorDetails } from '../shell/ErrorPage';
import { usePageTitle } from '../usePageTitle';
import PageHead from './PageHead';

export function Home() {
  usePageTitle('Главная');
  return (
    <>
      <PageHead title="DSLKit" lead="Редактор диаграмм как кода: пишите текст, получайте UML, BPMN, ERD, DFD и IDEF0." />
      <Link className="button button--primary button--hero" to="/catalog">
        Открыть каталог шаблонов
      </Link>
    </>
  );
}

export function About() {
  usePageTitle('О проекте');
  return (
    <>
      <PageHead title="О проекте" />
      <p className="prose">DSLKit это SaaS-сервис для описания диаграмм текстом. Страница нужна для практического занятия по маршрутизации.</p>
    </>
  );
}

// Dynamic route /catalog/:id. An unknown id renders the 404 page in place, the URL stays as typed.
// The id from the address is never put into the page as markup, only used to look a template up.
export function CatalogItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const template = findTemplate(id);

  // history.state.idx is 0 on the first entry, so there is nothing to go back to: open the catalog instead.
  const goBack = () => (window.history.state?.idx === 0 ? navigate('/catalog') : navigate(-1));

  if (!template) return <NotFound />;

  return <TemplatePage template={template} goBack={goBack} />;
}

function TemplatePage({ template, goBack }) {
  usePageTitle(template.title);
  return (
    <>
      <PageHead title={template.title} />
      <div className="prose">
        <p>
          <span className="badge">{template.notation}</span>
        </p>
        <p>Нотация: {template.notation}</p>
        <p>{template.description}</p>
        <p className="actions">
          <button type="button" className="button" onClick={goBack}>
            Назад
          </button>
          <Link className="link" to="/catalog">
            Весь каталог
          </Link>
        </p>
      </div>
    </>
  );
}

export function Login() {
  usePageTitle('Вход');
  const { isAuth, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const id = useId();
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const target = safeReturnPath(location.state?.from);

  // A signed-in user has nothing to do here.
  if (isAuth) return <Navigate to={target} replace />;

  // After the fake sign-in go back to the page that required it, by default to the dashboard.
  const handleSubmit = (event) => {
    event.preventDefault();
    const problem = validateUserName(name);
    setError(problem);
    if (problem) return;
    login(name);
    navigate(target, { replace: true });
  };

  return (
    <>
      <PageHead
        title="Вход"
        lead="Имитация входа: имя нужно только для приветствия, пароль не спрашивается и ничего не отправляется на сервер. Имя admin даёт роль администратора."
      />
      {location.state?.from && (
        <div className="note">
          <p className="note__text" role="alert">
            Эта страница доступна после входа.
          </p>
          <ErrorDetails kind="401" summary="Ошибка 401: почему я здесь и что делать" />
        </div>
      )}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form__field">
          <label className="form__label" htmlFor={`${id}-name`}>
            Имя пользователя
          </label>
          <input
            id={`${id}-name`}
            className="form__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="username"
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${id}-error` : `${id}-hint`}
          />
          {error ? (
            <span id={`${id}-error`} className="form__error" role="alert">
              {error}
            </span>
          ) : (
            <span id={`${id}-hint`} className="form__hint">
              До {limits.userName.maxLength} символов, пробелы по краям не считаются
            </span>
          )}
        </div>
        <button type="submit" className="button button--primary form__submit">
          Войти
        </button>
      </form>
    </>
  );
}

export function NotFound() {
  usePageTitle('Страница не найдена');
  return (
    <ErrorPage kind="404">
      <Link className="button button--primary" to="/">
        На главную
      </Link>
    </ErrorPage>
  );
}

// /logout clears the fake session and leaves for the home page; the redirect is declarative,
// so it cannot race with PrivateRoute.
// The session is only cleared when the user arrives here by an in-app click (the nav link uses a normal
// <NavLink>, which pushes a new history entry, so navigationType is "PUSH"). A bare GET to this address —
// an <a>/<img> on another site, an auto-redirect, a bookmark, a page reload, or the browser's back/forward
// buttons — reaches this component with navigationType "POP" or "REPLACE" and only sees a confirmation
// page: logging a visitor out is a real action and must not fire on a mere navigation that is not a click
// inside this app (logout-CSRF).
export function Logout() {
  const { isAuth, logout } = useAuth();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  usePageTitle('Выход');

  useEffect(() => {
    if (navigationType === 'PUSH') logout();
  }, [navigationType, logout]);

  if (navigationType === 'PUSH' || !isAuth) return <Navigate to="/" replace />;

  const confirmLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <>
      <PageHead title="Выход из системы" lead="Адрес /logout сам не завершает сессию: нажмите кнопку, чтобы подтвердить выход." />
      <p className="actions">
        <button type="button" className="button button--primary" onClick={confirmLogout}>
          Подтвердить выход
        </button>
        <Link className="link" to="/dashboard">
          Остаться в кабинете
        </Link>
      </p>
    </>
  );
}
