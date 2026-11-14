import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import App from './App';
import { AUTH_KEY, AuthProvider, USER_KEY } from './auth';
import limits from './limits.json';

// Shows the current address and gives a "back" button that works like the browser's back button.
const Where = () => <span data-testid="where">{useLocation().pathname + useLocation().search}</span>;
const Back = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      Шаг назад в истории
    </button>
  );
};

const renderAt = (entries) =>
  render(
    <MemoryRouter initialEntries={Array.isArray(entries) ? entries : [entries]} initialIndex={Array.isArray(entries) ? entries.length - 1 : 0}>
      <AuthProvider>
        <App />
        <Where />
        <Back />
      </AuthProvider>
    </MemoryRouter>,
  );

// The header menu only: the footer repeats some of its links.
const menu = () => within(screen.getByRole('navigation', { name: 'Основная навигация' }));

const signedIn = (name) => {
  localStorage.setItem(AUTH_KEY, 'true');
  localStorage.setItem(USER_KEY, name);
};

const signIn = async (user, name) => {
  await user.type(screen.getByLabelText('Имя пользователя'), name);
  await user.click(screen.getByRole('button', { name: 'Войти' }));
};

describe('negative: unknown addresses', () => {
  it('answers 404 for a malformed percent sequence in the address', async () => {
    renderAt('/catalog/%');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 404');
    expect(menu().getByRole('link', { name: 'Каталог' })).toBeInTheDocument();
  });

  it.each(['-1', '1.5', '99999999999999999999', '%202'])('answers 404 for the unknown template id %s', (id) => {
    renderAt(`/catalog/${id}`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 404');
  });

  it('answers 404 for a deeper path under a template and shows no breadcrumbs', () => {
    renderAt('/catalog/2/extra');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 404');
    expect(screen.queryByRole('navigation', { name: 'Хлебные крошки' })).toBeNull();
  });

  it('redirects a guest from an upper-case /DASHBOARD address to the login page', async () => {
    renderAt('/DASHBOARD');
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/login');
  });

  it('answers 403 for an upper-case /ADMIN address opened by a plain user', async () => {
    signedIn('Ксения');
    renderAt('/ADMIN');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 403');
    expect(screen.queryByRole('heading', { name: 'Раздел администратора' })).toBeNull();
  });
});

describe('negative: browser history', () => {
  it('goes back to the page before the login, not to the login form', async () => {
    const user = userEvent.setup();
    renderAt('/about');
    await user.click(menu().getByRole('link', { name: 'Кабинет' }));
    await signIn(user, 'Ксения');
    expect(await screen.findByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Шаг назад в истории' }));
    expect(await screen.findByRole('heading', { name: 'О проекте' })).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/about');
  });

  it('does not show the dashboard when going back after sign-out', async () => {
    const user = userEvent.setup();
    signedIn('Ксения');
    renderAt(['/about', '/dashboard']);
    expect(await screen.findByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
    await user.click(menu().getByRole('link', { name: 'Выйти' }));
    await user.click(screen.getByRole('button', { name: 'Шаг назад в истории' }));
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Личный кабинет' })).toBeNull();
  });
});

describe('negative: return address', () => {
  it.each(['http://evil.example/', '//evil.example/path', 'javascript:alert(1)'])(
    'does not follow the foreign return address %s after login',
    async (from) => {
      const user = userEvent.setup();
      renderAt({ pathname: '/login', state: { from } });
      await signIn(user, 'Ксения');
      expect(await screen.findByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
      expect(screen.getByTestId('where')).toHaveTextContent(/^\/dashboard$/);
    },
  );

  it('ignores a return address passed in the query string', async () => {
    const user = userEvent.setup();
    renderAt('/login?next=%2F%2Fevil.example');
    await signIn(user, 'Ксения');
    expect(await screen.findByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/dashboard$/);
  });
});

describe('negative: login name', () => {
  it('rejects a name made only of tabs and line breaks', async () => {
    renderAt('/login');
    fireEvent.change(screen.getByLabelText('Имя пользователя'), { target: { value: '\t\n \t' } });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Введите имя пользователя');
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });

  it('rejects a 100000-character name without signing in', async () => {
    renderAt('/login');
    fireEvent.change(screen.getByLabelText('Имя пользователя'), { target: { value: 'x'.repeat(100_000) } });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByRole('alert')).toHaveTextContent(`Имя не длиннее ${limits.userName.maxLength} символов`);
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });

  it('gives the admin link to an upper-case admin name with spaces', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await signIn(user, '  AdMiN  ');
    expect(await screen.findByRole('link', { name: 'Раздел администратора' })).toHaveAttribute('href', '/admin');
  });

  it('signs in once on a double Enter in the name field', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(screen.getByLabelText('Имя пользователя'), 'Ксения{Enter}{Enter}');
    expect(await screen.findByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
    expect(localStorage.getItem(USER_KEY)).toBe('Ксения');
  });
});

describe('negative: session storage', () => {
  it('treats an over-long stored name as no session', async () => {
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem(USER_KEY, 'x'.repeat(limits.userName.maxLength + 1));
    renderAt('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
  });

  it('treats a blank stored name as no session', async () => {
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem(USER_KEY, '   ');
    renderAt('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
  });

  it('signs out in the page when storage refuses to remove the keys', async () => {
    const user = userEvent.setup();
    signedIn('Ксения');
    const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      renderAt('/dashboard');
      await user.click(await screen.findByRole('link', { name: 'Выйти' }));
      expect(await screen.findByRole('heading', { name: 'DSLKit' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 1, name: /Ошибка/ })).toBeNull();
    } finally {
      remove.mockRestore();
    }
  });

  it('renders a stored name with markup as text on the dashboard', async () => {
    const payload = '<img src=x onerror="window.__neg = 1">';
    signedIn(payload);
    renderAt('/dashboard');
    expect(await screen.findByText(`Здравствуйте, ${payload}.`)).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(window.__neg).toBeUndefined();
  });

  it('signs out once on a double click on the logout link', async () => {
    const user = userEvent.setup();
    signedIn('Ксения');
    renderAt('/dashboard');
    await screen.findByRole('heading', { name: 'Личный кабинет' });
    await user.dblClick(menu().getByRole('link', { name: 'Выйти' }));
    expect(await screen.findByRole('heading', { name: 'DSLKit' })).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });
});

describe('negative: catalog address', () => {
  it('keeps the first q value when the address repeats the parameter', async () => {
    renderAt('/catalog?q=erd&q=bpmn');
    expect(await screen.findByRole('searchbox', { name: 'Поиск по каталогу' })).toHaveValue('erd');
    expect(screen.getByRole('status')).toHaveTextContent('Найдено: 1 из 5');
  });

  it('shows the empty-result message for a malformed percent sequence in q', async () => {
    renderAt('/catalog?q=%E0%A4%A');
    expect(await screen.findByText(/Ничего не найдено/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Каталог шаблонов' })).toBeInTheDocument();
  });
});
