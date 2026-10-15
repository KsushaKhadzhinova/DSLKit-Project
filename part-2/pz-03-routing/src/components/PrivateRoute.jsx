import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';

// Layout route: renders the nested page for a signed-in user, otherwise redirects to /login
// and remembers the requested path so that Login can return to it.
export default function PrivateRoute() {
  const { isAuth } = useAuth();
  const location = useLocation();
  return isAuth ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
