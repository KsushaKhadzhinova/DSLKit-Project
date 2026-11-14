import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';
import { About, CatalogItem, Home, Login, Logout, NotFound } from './pages/pages';
import { ThemeProvider } from './shell/theme';

// Catalog, dashboard and admin pages load on demand: the first visit downloads their code, Layout shows a Suspense fallback meanwhile.
const Catalog = lazy(() => import('./pages/Catalog'));
const Admin = lazy(() => import('./pages/Admin'));

// The three /dashboard sub-pages are named exports of the very same module as the Dashboard layout, so
// dynamic import('./pages/Dashboard') below resolves the one chunk already fetched for the layout: opening
// /dashboard/projects right after /dashboard triggers no second download. Each lazy() still needs its own
// factory, because React.lazy expects a promise resolving to a module with a `default` export.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DashboardOverview = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.DashboardOverview })));
const DashboardProjects = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.DashboardProjects })));
const DashboardProfile = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.DashboardProfile })));

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
            {/* Nested routes: Dashboard is a layout route (tab menu + Outlet), its own sub-pages below are
                relative to it, so a link to "projects" or "profile" needs no "/dashboard" prefix in code. */}
            {/* No wildcard child here on purpose: an unmatched third segment (/dashboard/anything-else)
                then fails this whole branch and falls through to the top-level "*" route below, which
                renders a single page-wide 404 instead of stacking a second <h1> inside this layout's Outlet. */}
            <Route path="dashboard" element={<Dashboard />}>
              <Route index element={<DashboardOverview />} />
              <Route path="projects" element={<DashboardProjects />} />
              <Route path="profile" element={<DashboardProfile />} />
            </Route>
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
