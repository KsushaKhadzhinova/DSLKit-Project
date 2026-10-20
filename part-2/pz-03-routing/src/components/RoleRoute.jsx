import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import ErrorPage from '../shell/ErrorPage';
import { usePageTitle } from '../usePageTitle';

export function Forbidden() {
  usePageTitle('Доступ запрещён');
  return (
    <ErrorPage
      code="403"
      title="Ошибка 403: доступ запрещён"
      text="Эта страница доступна только роли администратора. Вы вошли под обычной ролью."
      hints={['Вернитесь в личный кабинет.', 'Войдите под именем admin, чтобы открыть раздел администратора.']}
    >
      <Link className="button button--primary" to="/dashboard">
        В личный кабинет
      </Link>
    </ErrorPage>
  );
}

// Layout route used inside PrivateRoute: the nested page is rendered only for the given role, other roles see 403.
// A guest never gets here, PrivateRoute has already sent them to /login.
export default function RoleRoute({ role }) {
  const auth = useAuth();
  return auth.role === role ? <Outlet /> : <Forbidden />;
}
