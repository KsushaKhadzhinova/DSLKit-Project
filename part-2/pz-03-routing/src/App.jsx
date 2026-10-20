import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';
import { About, CatalogItem, Home, Login, Logout, NotFound } from './pages/pages';
import { ThemeProvider } from './shell/theme';

// Catalog, dashboard and admin pages load on demand: the first visit downloads their code, Layout shows a Suspense fallback meanwhile.
const Catalog = lazy(() => import('./pages/Catalog'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Admin = lazy(() => import('./pages/Admin'));

// The router itself (BrowserRouter or MemoryRouter in tests) is provided from outside.
export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="catalog/:id" element={<CatalogItem />} />
          <Route path="about" element={<About />} />
          <Route path="login" element={<Login />} />
          <Route path="logout" element={<Logout />} />
          <Route element={<PrivateRoute />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route element={<RoleRoute role="admin" />}>
              <Route path="admin" element={<Admin />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}
