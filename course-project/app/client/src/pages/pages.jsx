import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { errorMessage, fetchDiagram, isCanceled } from '../api';
import { useAuth } from '../auth';
import Alert from '../components/Alert';
import AuthForm from '../components/AuthForm';
import CommentsSection from '../components/CommentsSection';
import DiagramsScreen from '../components/DiagramsScreen';
import ErrorHelp from '../components/ErrorHelp';
import ErrorPage from '../components/ErrorPage';
import Progress from '../components/Progress';
import { kindOfFailure } from '../errorCatalog';
import { safeReturnPath } from '../utils/returnPath';
import { usePageTitle } from '../utils/usePageTitle';
import { formatTime } from '../utils/validation';

// "/" has no content of its own: it leads to the list for a signed-in user and to the login form for a guest.
export function Home() {
  const { signedIn } = useAuth();
  return <Navigate to={signedIn ? '/diagrams' : '/login'} replace />;
}

// /login and /register. A signed-in user does not need them and goes to the page that was asked for before the login
// (the address comes from the route guard in location.state and is checked by safeReturnPath), or to the list.
export function AuthPage({ mode }) {
  const { signedIn, expired, loggedIn } = useAuth();
  const location = useLocation();
  const isLogin = mode === 'login';
  usePageTitle(isLogin ? 'Вход' : 'Регистрация');
  if (signedIn) return <Navigate to={safeReturnPath(location.state?.from)} replace />;
  return (
    <>
      <div>
        <h1 className="page-title">{isLogin ? 'Вход в DSLKit' : 'Регистрация в DSLKit'}</h1>
        <p className="page-lead">Диаграммы хранятся на сервере и доступны после входа.</p>
      </div>
      <AuthForm mode={mode} notice={expired && isLogin ? 'Сессия истекла. Войдите снова.' : undefined} onLoggedIn={loggedIn} />
    </>
  );
}

export function DiagramsPage() {
  usePageTitle('Диаграммы');
  return (
    <>
      <div>
        <h1 className="page-title">Диаграммы проекта</h1>
        <p className="page-lead">Список хранится на сервере: запись появляется сразу, а при отказе сервера возвращается как было.</p>
      </div>
      <DiagramsScreen />
    </>
  );
}

// One diagram with its comments. An id that is not a positive number is a missing page, like an id the server does not know.
export function DiagramPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const valid = /^[1-9]\d{0,9}$/.test(id);
  const [state, setState] = useState({ status: 'loading', diagram: null, message: null, kind: null });
  const [attempt, setAttempt] = useState(0);
  usePageTitle(state.diagram ? state.diagram.title : 'Диаграмма');

  useEffect(() => {
    if (!valid) return undefined;
    const controller = new AbortController();
    setState({ status: 'loading', diagram: null, message: null, kind: null });
    fetchDiagram(id, controller.signal)
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) setState({ status: 'error', diagram: null, message: 'Сервер вернул неожиданный ответ. Проверьте адрес сервера', kind: 'network' });
        else setState({ status: 'ready', diagram: data, message: null, kind: null });
      })
      .catch((failure) => {
        if (isCanceled(failure) || controller.signal.aborted) return;
        setState({ status: 'error', diagram: null, message: errorMessage(failure), kind: kindOfFailure(failure) });
      });
    return () => controller.abort();
  }, [id, valid, attempt]);

  if (!valid || state.kind === '404') return <NotFoundPage />;
  if (state.status === 'loading') return <Progress>Загрузка…</Progress>;
  if (state.status === 'error') {
    return (
      <>
        <Alert text={state.message} actionLabel="Повторить" onAction={() => setAttempt((n) => n + 1)} />
        <ErrorHelp kind={state.kind} level={2} />
      </>
    );
  }
  const { diagram } = state;
  return (
    <>
      <div>
        <p>
          <Link className="link" to="/diagrams">
            ← К списку диаграмм
          </Link>
        </p>
        <h1 className="page-title">{diagram.title}</h1>
        <p className="card__meta">
          <span className="badge">{diagram.notation}</span>
          <span className="badge">Приоритет: {diagram.priority}</span>
        </p>
        <p className="card__text">
          Создана: {formatTime(diagram.createdAt)}. Владелец: пользователь №{diagram.ownerId}
        </p>
      </div>
      <section aria-labelledby="source-title">
        <h2 id="source-title">Исходный код</h2>
        <pre className="source">
          <code>{diagram.sourceCode}</code>
        </pre>
      </section>
      <CommentsSection diagramId={diagram.id} user={user} />
    </>
  );
}

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <ErrorPage kind="404">
      <Link className="button button--primary" to="/">
        На главную
      </Link>
      <button type="button" className="button button--quiet" onClick={() => navigate(-1)}>
        Назад
      </button>
    </ErrorPage>
  );
}

// Direct pages for the codes that normally appear by themselves, so each has an address of its own.
export function UnauthorizedPage() {
  return (
    <ErrorPage kind="401">
      <Link className="button button--primary" to="/login">
        Войти
      </Link>
    </ErrorPage>
  );
}

export function ForbiddenPage() {
  return (
    <ErrorPage kind="403">
      <Link className="button button--primary" to="/diagrams">
        К списку диаграмм
      </Link>
    </ErrorPage>
  );
}

export function ServerErrorPage() {
  return (
    <ErrorPage kind="500">
      <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
        Обновить страницу
      </button>
    </ErrorPage>
  );
}
