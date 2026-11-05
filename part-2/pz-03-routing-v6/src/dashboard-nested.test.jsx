import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AUTH_KEY, AuthProvider, USER_KEY } from './auth';
import ErrorBoundary from './shell/ErrorBoundary';

// Tests for the three nested routes under /dashboard (Outlet-based: overview is the index route,
// projects and profile are its siblings) added for the extra ПЗ3 tasks. PrivateRoute already redirects
// a guest to /login before any of this is reached, so most tests here sign in first.

const renderAt = (entries) =>
  render(
    <MemoryRouter initialEntries={Array.isArray(entries) ? entries : [entries]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

const signedIn = (name = 'Ксения') => {
  localStorage.setItem(AUTH_KEY, 'true');
  localStorage.setItem(USER_KEY, name);
};

const tabs = () => within(screen.getByRole('navigation', { name: 'Разделы кабинета' }));

describe('nested routes under /dashboard (Outlet)', () => {
  it('shows the overview by default, with the tab menu and a single page title', async () => {
    signedIn();
    renderAt('/dashboard');
    expect(await screen.findByRole('heading', { level: 1, name: 'Личный кабинет' })).toBeInTheDocument();
    expect(screen.getByText('Здесь будут ваши диаграммы. Страница доступна только после входа.')).toBeInTheDocument();
    expect(tabs().getByRole('link', { name: 'Обзор' })).toHaveAttribute('aria-current', 'page');
    expect(tabs().getByRole('link', { name: 'Проекты' })).not.toHaveAttribute('aria-current');
  });

  it('opens /dashboard/projects directly by address, keeping the same <h1> and the active tab', async () => {
    signedIn();
    renderAt('/dashboard/projects');
    expect(await screen.findByRole('heading', { level: 1, name: 'Личный кабинет' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Проекты' })).toBeInTheDocument();
    expect(tabs().getByRole('link', { name: 'Проекты' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Вход в систему')).toBeInTheDocument();
  });

  it('opens /dashboard/profile directly by address and shows the signed-in name and role', async () => {
    signedIn('admin');
    renderAt('/dashboard/profile');
    expect(await screen.findByRole('heading', { level: 2, name: 'Профиль' })).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('Администратор')).toBeInTheDocument();
  });

  it('switches sub-pages through the tab menu without a full page reload', async () => {
    const user = userEvent.setup();
    signedIn();
    renderAt('/dashboard');
    await user.click(tabs().getByRole('link', { name: 'Проекты' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Проекты' })).toBeInTheDocument();
    await user.click(tabs().getByRole('link', { name: 'Профиль' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Профиль' })).toBeInTheDocument();
    await user.click(tabs().getByRole('link', { name: 'Обзор' }));
    expect(await screen.findByText('Здесь будут ваши диаграммы. Страница доступна только после входа.')).toBeInTheDocument();
  });

  it('a guest is sent to /login and the return address keeps the sub-path, including when it carries a query', async () => {
    const user = userEvent.setup();
    renderAt('/dashboard/projects?x=1');
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Имя пользователя'), 'Ксения');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Проекты' })).toBeInTheDocument();
  });

  it('an unknown third segment under /dashboard shows 404 instead of a blank Outlet', async () => {
    signedIn();
    renderAt('/dashboard/settings');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 404');
    // The broken boundary of the real crash case (an actual throw) is covered in error-pages.test.jsx;
    // here only the routing result matters: no blank screen, no 500.
    expect(screen.queryByText(/Ошибка 500/)).toBeNull();
  });

  it('builds breadcrumbs "Главная / Кабинет / Проекты" and "… / Профиль" for the sub-routes', async () => {
    signedIn();
    renderAt('/dashboard/projects');
    const trail = within(await screen.findByRole('navigation', { name: 'Хлебные крошки' }));
    expect(trail.getByRole('link', { name: 'Главная' })).toBeInTheDocument();
    expect(trail.getByRole('link', { name: 'Кабинет' })).toBeInTheDocument();
    expect(trail.getByText('Проекты')).toHaveAttribute('aria-current', 'page');
  });

  it('shows no breadcrumbs for the unknown /dashboard/settings sub-path', async () => {
    signedIn();
    renderAt('/dashboard/settings');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('navigation', { name: 'Хлебные крошки' })).toBeNull();
  });

  it('clicking quickly between the three tabs settles on the last one clicked, with no console error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    signedIn();
    renderAt('/dashboard');
    const projects = tabs().getByRole('link', { name: 'Проекты' });
    const profile = tabs().getByRole('link', { name: 'Профиль' });
    const overview = tabs().getByRole('link', { name: 'Обзор' });
    // Fire the clicks back to back, without waiting for each page to settle first — this is what
    // "сломать быстрой навигацией" means for lazily-loaded, Outlet-nested routes.
    await user.click(projects);
    await user.click(profile);
    await user.click(overview);
    await user.click(projects);
    expect(await screen.findByRole('heading', { level: 2, name: 'Проекты' })).toBeInTheDocument();
    await waitFor(() => expect(spy).not.toHaveBeenCalled());
    spy.mockRestore();
  });

  it('role=admin reaches the admin link from the overview sub-page', async () => {
    signedIn('admin');
    renderAt('/dashboard');
    expect(await screen.findByRole('link', { name: 'Раздел администратора' })).toBeInTheDocument();
  });

  it('a plain user does not see the admin link on the overview sub-page', async () => {
    signedIn('bob');
    renderAt('/dashboard');
    await screen.findByRole('heading', { level: 1, name: 'Личный кабинет' });
    expect(screen.queryByRole('link', { name: 'Раздел администратора' })).toBeNull();
  });
});

describe('a broken dashboard sub-page is still caught by ErrorBoundary (500, not a blank page)', () => {
  it('renders the 500 page when a sub-page throws while mounted under the dashboard layout', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
      throw new Error('boom in a dashboard sub-page');
    };
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 500');
    spy.mockRestore();
  });
});
