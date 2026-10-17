import { useEffect, useId, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { safeReturnPath, useAuth, validateUserName } from '../auth';
import { findTemplate, TEMPLATES } from '../data/templates';
import limits from '../limits.json';
import ErrorPage from '../shell/ErrorPage';
import { usePageTitle } from '../usePageTitle';

function PageHead({ title, lead }) {
  return (
    <div className="page-head">
      <h1 className="page__title">{title}</h1>
      {lead && <p className="page-head__lead">{lead}</p>}
    </div>
  );
}

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

export function Catalog() {
  usePageTitle('Каталог шаблонов');
  return (
    <>
      <PageHead title="Каталог шаблонов" lead="Выберите шаблон, чтобы открыть его страницу по адресу /catalog/номер." />
      <ul className="cards">
        {TEMPLATES.map((t) => (
          <li className="cards__item" key={t.id}>
            <article className="card">
              <h2 className="card__title">{t.title}</h2>
              <p className="card__meta">
                <span className="badge">{t.notation}</span>
              </p>
              <p className="card__text">{t.description}</p>
              <Link className="card__link" to={`/catalog/${t.id}`} aria-label={`Открыть шаблон: ${t.title}`}>
                Открыть шаблон
              </Link>
            </article>
          </li>
        ))}
      </ul>
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
      <PageHead title="Вход" lead="Имитация входа: имя нужно только для приветствия, пароль не спрашивается и ничего не отправляется на сервер." />
      {location.state?.from && (
        <div className="note">
          <p className="note__text" role="alert">
            Эта страница доступна после входа.
          </p>
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

export function Dashboard() {
  usePageTitle('Личный кабинет');
  const { userName } = useAuth();
  return (
    <>
      <PageHead title="Личный кабинет" lead={`Здравствуйте, ${userName}.`} />
      <p className="prose">Здесь будут ваши диаграммы. Страница доступна только после входа.</p>
    </>
  );
}

export function NotFound() {
  usePageTitle('Страница не найдена');
  return (
    <ErrorPage
      code="404"
      title="Ошибка 404: страница не найдена"
      text="По этому адресу нет страницы DSLKit. Возможно, в адресе есть опечатка, страница была переименована или перенесена, либо ссылка, по которой вы пришли, устарела."
      hints={[
        'Проверьте адрес в строке браузера: написание слов, регистр букв и наклонные черты между разделами.',
        'Вернитесь на предыдущую страницу и перейдите по ссылке из меню или нижней навигации.',
        'Откройте главную страницу и найдите нужный раздел.',
      ]}
    >
      <Link className="button button--primary" to="/">
        На главную
      </Link>
    </ErrorPage>
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
