import { lazy, Suspense } from 'react';
import { Outlet, Route, Routes } from 'react-router';
import { AuthProvider, useAuth } from './auth';
import Footer from './components/Footer';
import Header from './components/Header';
import Progress from './components/Progress';
import { RequireAuth, RequireRole } from './components/RouteGuards';
import { AuthPage, DiagramPage, DiagramsPage, ForbiddenPage, Home, NotFoundPage, ServerErrorPage, UnauthorizedPage } from './pages/pages';

// The admin screen is loaded on demand: a user who is not an administrator never downloads it.
const AdminPage = lazy(() => import('./pages/AdminPage'));

// The page frame shared by every route: skip link, header, the place of the page, footer.
function Layout() {
  const { signedIn, role, logout } = useAuth();
  return (
    <div className="page">
      <a className="skip-link" href="#main">
        Перейти к основному содержимому
      </a>
      <Header signedIn={signedIn} isAdmin={role === 'admin'} onLogout={logout} />
      <main className="main" id="main">
        <Suspense fallback={<Progress>Загрузка…</Progress>}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

// Public: /login, /register, the pages of the errors. Signed in: /diagrams and /diagrams/:id. Administrators only: /admin.
// The router itself (BrowserRouter, or MemoryRouter in tests) is provided from outside.
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<AuthPage mode="login" />} />
          <Route path="register" element={<AuthPage mode="register" />} />
          <Route element={<RequireAuth />}>
            <Route path="diagrams" element={<DiagramsPage />} />
            <Route path="diagrams/:id" element={<DiagramPage />} />
            <Route element={<RequireRole role="admin" />}>
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Route>
          <Route path="401" element={<UnauthorizedPage />} />
          <Route path="403" element={<ForbiddenPage />} />
          <Route path="500" element={<ServerErrorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
