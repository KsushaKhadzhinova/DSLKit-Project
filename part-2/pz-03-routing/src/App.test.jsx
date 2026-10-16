import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AUTH_KEY, AuthProvider } from './auth';

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('static pages and navigation', () => {
  it.each([
    ['/', 'DSLKit'],
    ['/catalog', 'Каталог шаблонов'],
    ['/about', 'О проекте'],
    ['/login', 'Вход'],
  ])('renders %s', (path, heading) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('highlights only the active NavLink', () => {
    renderAt('/catalog/2');
    expect(screen.getByRole('link', { name: 'Каталог' })).toHaveClass('nav__link--active');
    expect(screen.getByRole('link', { name: 'Главная' })).not.toHaveClass('nav__link--active');
  });

  it('navigates through the menu', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('link', { name: 'О проекте' }));
    expect(screen.getByRole('heading', { name: 'О проекте' })).toBeInTheDocument();
  });
});

describe('dynamic route /catalog/:id', () => {
  it('shows the template with the given id and goes back', async () => {
    const user = userEvent.setup();
    renderAt('/catalog');
    await user.click(screen.getByRole('link', { name: 'Процесс согласования заказа' }));
    expect(screen.getByRole('heading', { name: 'Процесс согласования заказа' })).toBeInTheDocument();
    expect(screen.getByText('Нотация: BPMN')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Назад' }));
    expect(screen.getByRole('heading', { name: 'Каталог шаблонов' })).toBeInTheDocument();
  });

  it('renders the 404 page in place for an unknown id', () => {
    renderAt('/catalog/999');
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Каталог' })).toBeInTheDocument();
  });
});

describe('404 page', () => {
  it('handles any unknown path and links home', async () => {
    const user = userEvent.setup();
    renderAt('/no/such/page');
    expect(screen.getByText('Страница не найдена.')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'На главную' }));
    expect(screen.getByRole('heading', { name: 'DSLKit' })).toBeInTheDocument();
  });
});

describe('protected route', () => {
  it('redirects a guest from /dashboard to /login with a hint', () => {
    renderAt('/dashboard');
    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('after the fake login returns to the requested page and can log out', async () => {
    const user = userEvent.setup();
    renderAt('/dashboard');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_KEY)).toBe('true');

    await user.click(screen.getByRole('link', { name: 'Выйти' }));
    expect(screen.getByRole('heading', { name: 'DSLKit' })).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });

  it('goes to the dashboard by default after a direct login', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
  });

  it('keeps the signed-in state from localStorage', () => {
    localStorage.setItem(AUTH_KEY, 'true');
    renderAt('/dashboard');
    expect(screen.getByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
  });
});

describe('accessibility helpers', () => {
  it('has a skip link to the main content', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: 'Перейти к содержимому' })).toHaveAttribute('href', '#main');
  });

  it('opens the catalog from "Назад" when the page is the first history entry', async () => {
    const user = userEvent.setup();
    window.history.replaceState({ idx: 0 }, '');
    renderAt('/catalog/2');
    await user.click(screen.getByRole('button', { name: 'Назад' }));
    expect(screen.getByRole('heading', { name: 'Каталог шаблонов' })).toBeInTheDocument();
    window.history.replaceState(null, '');
  });
});
