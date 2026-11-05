import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';

// Layout route: renders the nested page for a signed-in user, otherwise redirects to /login
// and remembers the whole requested address (path, query and hash) so that Login can return to it.
export default function PrivateRoute() {
  const { isAuth } = useAuth();
  const location = useLocation();
  const from = `${location.pathname}${location.search}${location.hash}`;
  return isAuth ? <Outlet /> : <Navigate to="/login" replace state={{ from }} />;
}
