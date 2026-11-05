import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AUTH_KEY, AuthProvider, safeReturnPath, USER_KEY, validateUserName } from './auth';
import limits from './limits.json';
import ErrorBoundary from './shell/ErrorBoundary';
import { THEME_KEY } from './shell/theme';

const renderAt = (entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

// The header menu only: the footer repeats some of its links.
const menu = () => within(screen.getByRole('navigation', { name: 'Основная навигация' }));

const signIn = async (user, name = 'Ксения') => {
  await user.type(screen.getByLabelText('Имя пользователя'), name);
  await user.click(screen.getByRole('button', { name: 'Войти' }));
};

describe('static pages and navigation', () => {
  it.each([
    ['/', 'DSLKit'],
    ['/catalog', 'Каталог шаблонов'],
    ['/about', 'О проекте'],
    ['/login', 'Вход'],
  ])('renders %s', async (path, heading) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('highlights only the active NavLink', async () => {
    renderAt('/catalog/2');
    expect(menu().getByRole('link', { name: 'Каталог' })).toHaveClass('nav__link');
    expect(menu().getByRole('link', { name: 'Каталог' })).toHaveAttribute('aria-current', 'page');
    expect(menu().getByRole('link', { name: 'Главная' })).not.toHaveAttribute('aria-current');
  });

  it('navigates through the menu', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(menu().getByRole('link', { name: 'О проекте' }));
    expect(screen.getByRole('heading', { name: 'О проекте' })).toBeInTheDocument();
  });

  it('puts the page name into the tab title', async () => {
    const user = userEvent.setup();
    renderAt('/');
    expect(document.title).toBe('Главная — DSLKit');
    await user.click(menu().getByRole('link', { name: 'Каталог' }));
    await waitFor(() => expect(document.title).toBe('Каталог шаблонов — DSLKit'));
  });
});

describe('dynamic route /catalog/:id', () => {
  it('shows the template with the given id and goes back', async () => {
    const user = userEvent.setup();
    renderAt('/catalog');
    await user.click(await screen.findByRole('link', { name: 'Открыть шаблон: Процесс согласования заказа' }));
    expect(screen.getByRole('heading', { name: 'Процесс согласования заказа' })).toBeInTheDocument();
    expect(screen.getByText('Нотация: BPMN')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Назад' }));
    expect(await screen.findByRole('heading', { name: 'Каталог шаблонов' })).toBeInTheDocument();
  });

  it('renders the styled 404 page in place for an unknown id', () => {
    renderAt('/catalog/999');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 404');
    expect(screen.getByText('Код ошибки: 404')).toBeInTheDocument();
    expect(menu().getByRole('link', { name: 'Каталог' })).toBeInTheDocument();
  });

  it('never turns an id from the address into markup', async () => {
    renderAt('/catalog/<img src=x onerror="window.__xss=1">');
    expect(screen.getByText('Код ошибки: 404')).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(window.__xss).toBeUndefined();
  });
});

describe('404 page', () => {
  it('handles any unknown path in the site style and links home', async () => {
    const user = userEvent.setup();
    renderAt('/no/such/page');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 404: страница не найдена');
    expect(document.querySelector('.error__list')).toBeInTheDocument();
    expect(document.title).toBe('Страница не найдена — DSLKit');
    await user.click(screen.getByRole('link', { name: 'На главную' }));
    expect(screen.getByRole('heading', { name: 'DSLKit' })).toBeInTheDocument();
  });
});

describe('protected route', () => {
  it('redirects a guest from /dashboard to /login with a hint', async () => {
    renderAt('/dashboard');
    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('доступна после входа');
  });

  it('after the fake login returns to the requested page and can log out', async () => {
    const user = userEvent.setup();
    renderAt('/dashboard');
    await signIn(user);
    expect(await screen.findByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
    expect(await screen.findByText('Здравствуйте, Ксения.')).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_KEY)).toBe('true');

    await user.click(menu().getByRole('link', { name: 'Выйти' }));
    expect(screen.getByRole('heading', { name: 'DSLKit' })).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('returns to the requested page with its query and hash', async () => {
    const user = userEvent.setup();
    renderAt('/dashboard?tab=2#top');
    await signIn(user);
    expect(await screen.findByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
  });

  it('goes to the dashboard by default after a direct login', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await signIn(user);
    expect(await screen.findByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
  });

  it('keeps the signed-in state from localStorage', async () => {
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem(USER_KEY, 'Ксения');
    renderAt('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
  });

  it('does not trust a hand-written flag without a valid name', () => {
    localStorage.setItem(AUTH_KEY, 'true');
    renderAt('/dashboard');
    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
  });

  it('sends a signed-in user away from /login', async () => {
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem(USER_KEY, 'Ксения');
    renderAt('/login');
    expect(await screen.findByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
  });

  it('survives blocked storage and still signs in for the session', async () => {
    const user = userEvent.setup();
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderAt('/dashboard');
    await signIn(user);
    expect(await screen.findByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
    set.mockRestore();
    get.mockRestore();
  });

  it('signs out when another tab clears the session', async () => {
    const user = userEvent.setup();
    renderAt('/dashboard');
    await signIn(user);
    localStorage.removeItem(AUTH_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: AUTH_KEY }));
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
  });
});

describe('login form checks', () => {
  it('rejects an empty and a whitespace-only name', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Введите имя пользователя');
    await user.type(screen.getByLabelText('Имя пользователя'), '   ');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Введите имя пользователя');
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });

  it('rejects a name longer than the limit from limits.json', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await user.click(screen.getByLabelText('Имя пользователя'));
    await user.paste('x'.repeat(limits.userName.maxLength + 1));
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByRole('alert')).toHaveTextContent(String(limits.userName.maxLength));
  });

  it('validates by the same function for any input', async () => {
    expect(validateUserName('ok')).toBeNull();
    expect(validateUserName(undefined)).toMatch(/Введите/);
    expect(validateUserName('x'.repeat(5_000_000))).toContain(String(limits.userName.maxLength));
  });

  it('shows the name as text, not as markup', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await user.click(screen.getByLabelText('Имя пользователя'));
    await user.paste('<b id="evil">me</b>');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByText('Здравствуйте, <b id="evil">me</b>.')).toBeInTheDocument();
    expect(document.getElementById('evil')).toBeNull();
  });
});

describe('return address safety', () => {
  it.each([
    ['https://evil.example/', '/dashboard'],
    ['//evil.example', '/dashboard'],
    ['/\\evil.example', '/dashboard'],
    ['javascript:alert(1)', '/dashboard'],
    ['/login', '/dashboard'],
    ['/login?x=1', '/dashboard'],
    ['/logout', '/dashboard'],
    [undefined, '/dashboard'],
    [{ not: 'a string' }, '/dashboard'],
    ['/catalog/2?a=1#b', '/catalog/2?a=1#b'],
  ])('safeReturnPath(%j) is %s', (value, expected) => {
    expect(safeReturnPath(value)).toBe(expected);
  });

  it('ignores a foreign address forged into the navigation state', async () => {
    const user = userEvent.setup();
    renderAt({ pathname: '/login', state: { from: 'https://evil.example/' } });
    await signIn(user);
    expect(await screen.findByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
  });
});

describe('accessibility helpers', () => {
  it('has a skip link to the main content and one h1', async () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: 'Перейти к основному содержимому' })).toHaveAttribute('href', '#main');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('moves the focus to the content after a route change but not on the first render', async () => {
    const user = userEvent.setup();
    renderAt('/');
    expect(document.querySelector('main')).not.toHaveFocus();
    await user.click(menu().getByRole('link', { name: 'О проекте' }));
    expect(document.querySelector('main')).toHaveFocus();
  });

  it('opens the catalog from "Назад" when the page is the first history entry', async () => {
    const user = userEvent.setup();
    window.history.replaceState({ idx: 0 }, '');
    renderAt('/catalog/2');
    await user.click(screen.getByRole('button', { name: 'Назад' }));
    expect(await screen.findByRole('heading', { name: 'Каталог шаблонов' })).toBeInTheDocument();
    window.history.replaceState(null, '');
  });
});

describe('theme switch and error page', () => {
  it('switches the theme with the moon and sun checkbox', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('checkbox', { name: 'Тёмная тема' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  it('shows the styled 500 page when a page throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
      throw new Error('boom');
    };
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 500');
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    spy.mockRestore();
  });
});
