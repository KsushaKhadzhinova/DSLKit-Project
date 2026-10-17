import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import { About, Catalog, CatalogItem, Dashboard, Home, Login, Logout, NotFound } from './pages/pages';
import { ThemeProvider } from './shell/theme';

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
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}
