import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth';
import ErrorPage from './ErrorPage';
import Progress from './Progress';

// Layout route: the nested page is shown to a signed-in user, a guest is sent to /login.
// The whole requested address (path, query, hash) goes along, so the login page can bring the user back.
export function RequireAuth() {
  const { signedIn } = useAuth();
  const location = useLocation();
  const from = `${location.pathname}${location.search}${location.hash}`;
  return signedIn ? <Outlet /> : <Navigate to="/login" replace state={{ from }} />;
}

// Used inside RequireAuth: the nested page is shown to the given role only. The role comes from the server,
// so the page waits for the profile; other roles see 403. This hides the page, the server still checks every request.
export function RequireRole({ role }) {
  const { profile, profileKind, role: actual, retryProfile } = useAuth();
  if (profile === 'loading' || profile === 'idle') return <Progress>Проверяем права…</Progress>;
  if (profile === 'error') {
    return (
      <ErrorPage kind={profileKind ?? '500'}>
        <button type="button" className="button button--primary" onClick={retryProfile}>
          Повторить
        </button>
      </ErrorPage>
    );
  }
  if (actual === role) return <Outlet />;
  return (
    <ErrorPage kind="403">
      <Link className="button button--primary" to="/diagrams">
        К списку диаграмм
      </Link>
    </ErrorPage>
  );
}
