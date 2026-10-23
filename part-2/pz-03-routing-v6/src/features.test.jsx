import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { lazy } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import App from './App';
import { AUTH_KEY, AuthProvider, roleFor, USER_KEY } from './auth';
import { buildCrumbs } from './components/Breadcrumbs';
import Layout from './components/Layout';
import limits from './limits.json';
import { filterTemplates, readCatalogParams } from './pages/Catalog';
import { ThemeProvider } from './shell/theme';

const Where = () => {
  const { pathname, search } = useLocation();
  return <span data-testid="where">{pathname + search}</span>;
};

const renderAt = (entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <App />
        <Where />
      </AuthProvider>
    </MemoryRouter>,
  );

const signedIn = (name) => {
  localStorage.setItem(AUTH_KEY, 'true');
  localStorage.setItem(USER_KEY, name);
};

const cardTitles = () => screen.queryAllByRole('heading', { level: 2 }).map((node) => node.textContent);

describe('catalog filter in the address (useSearchParams)', () => {
  it('filters at once for a direct link /catalog?q=BPMN', async () => {
    renderAt('/catalog?q=BPMN');
    expect(await screen.findByText('Процесс согласования заказа')).toBeInTheDocument();
    expect(cardTitles()).toEqual(['Процесс согласования заказа']);
    expect(screen.getByRole('searchbox', { name: 'Поиск по каталогу' })).toHaveValue('BPMN');
    expect(screen.getByRole('status')).toHaveTextContent('Найдено: 1 из 5');
  });

  it('is case-insensitive and also looks into the description', async () => {
    renderAt('/catalog?q=ШЛЮЗЫ');
    expect(await screen.findByText('Процесс согласования заказа')).toBeInTheDocument();
    expect(cardTitles()).toHaveLength(1);
  });

  it('writes the typed text into the address and clears it again', async () => {
    const user = userEvent.setup();
    renderAt('/catalog');
    const box = await screen.findByRole('searchbox', { name: 'Поиск по каталогу' });
    await user.type(box, 'erd');
    expect(screen.getByTestId('where')).toHaveTextContent('/catalog?q=erd');
    expect(cardTitles()).toEqual(['Модель данных интернет-магазина']);
    await user.clear(box);
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/catalog$/);
    expect(cardTitles()).toHaveLength(5);
  });

  it('ignores a whitespace-only query and shows everything', async () => {
    renderAt('/catalog?q=%20%20%20');
    expect(await screen.findByRole('status')).toHaveTextContent('Найдено: 5 из 5');
  });

  it('shows a message with the query as text, never as markup, when nothing is found', async () => {
    renderAt(`/catalog?q=${encodeURIComponent('<img id="x" src=x>')}`);
    expect(await screen.findByText(/Ничего не найдено/)).toHaveTextContent('<img id="x" src=x>');
    expect(document.getElementById('x')).toBeNull();
  });

  it('cuts a huge query from the address to the limit and does not hang', async () => {
    renderAt(`/catalog?q=${'a'.repeat(1_000_000)}`);
    const box = await screen.findByRole('searchbox', { name: 'Поиск по каталогу' });
    expect(box.value).toHaveLength(limits.search.maxLength);
    expect(box).toHaveAttribute('maxlength', String(limits.search.maxLength));
    expect(screen.getByText(/Ничего не найдено/)).toBeInTheDocument();
  });

  it('cuts a huge pasted text to the limit', async () => {
    const user = userEvent.setup();
    renderAt('/catalog');
    const box = await screen.findByRole('searchbox', { name: 'Поиск по каталогу' });
    await user.click(box);
    await user.paste('b'.repeat(500));
    expect(box.value.length).toBeLessThanOrEqual(limits.search.maxLength);
  });

  it('sorts by title and keeps the query when the sort changes', async () => {
    const user = userEvent.setup();
    renderAt('/catalog?q=а');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Сортировка' }), 'title');
    expect(screen.getByTestId('where')).toHaveTextContent('/catalog?q=%D0%B0&sort=title');
    const titles = cardTitles();
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'ru')));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Сортировка' }), 'id');
    expect(screen.getByTestId('where')).toHaveTextContent(/q=/);
    expect(screen.getByTestId('where')).not.toHaveTextContent('sort=');
  });

  it('falls back to the default sort for an unknown or forged sort value', () => {
    expect(readCatalogParams(new URLSearchParams('sort=__proto__')).sort).toBe('id');
    expect(readCatalogParams(new URLSearchParams('sort=constructor')).sort).toBe('id');
    expect(readCatalogParams(new URLSearchParams('sort=notation')).sort).toBe('notation');
    expect(filterTemplates('', 'notation').map((t) => t.notation)).toEqual(['BPMN', 'DFD', 'ERD', 'IDEF0', 'UML']);
  });
});

describe('lazy pages and Suspense', () => {
  it('shows the fallback while a page loads, inside the page frame', () => {
    const Never = lazy(() => new Promise(() => {}));
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Never />} />
              </Route>
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('Загрузка страницы…')).toHaveAttribute('role', 'status');
    expect(screen.getByRole('navigation', { name: 'Основная навигация' })).toBeInTheDocument();
  });

  it('loads the catalog page on demand through the menu', async () => {
    const user = userEvent.setup();
    renderAt('/about');
    await user.click(within(screen.getByRole('navigation', { name: 'Основная навигация' })).getByRole('link', { name: 'Каталог' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Каталог шаблонов' })).toBeInTheDocument();
  });
});

describe('breadcrumbs', () => {
  it('builds the trail for known addresses and nothing for unknown ones', () => {
    expect(buildCrumbs('/')).toEqual([]);
    expect(buildCrumbs('/catalog').map((c) => c.label)).toEqual(['Главная', 'Каталог']);
    expect(buildCrumbs('/catalog/2').map((c) => c.label)).toEqual(['Главная', 'Каталог', 'Процесс согласования заказа']);
    expect(buildCrumbs('/catalog/999')).toEqual([]);
    expect(buildCrumbs('/catalog/2/extra')).toEqual([]);
    expect(buildCrumbs('/about/x')).toEqual([]);
    expect(buildCrumbs('/no/such/page')).toEqual([]);
    expect(buildCrumbs('//catalog//')).toHaveLength(2);
  });

  it('shows the trail on a template page with a link back and the current page marked', async () => {
    const user = userEvent.setup();
    renderAt('/catalog/3');
    const trail = within(screen.getByRole('navigation', { name: 'Хлебные крошки' }));
    expect(trail.getAllByRole('listitem')).toHaveLength(3);
    expect(trail.getByText('Модель данных интернет-магазина')).toHaveAttribute('aria-current', 'page');
    await user.click(trail.getByRole('link', { name: 'Каталог' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Каталог шаблонов' })).toBeInTheDocument();
  });

  it('has no trail on the home page, on 404 and for an unknown template', () => {
    for (const path of ['/', '/no/such/page', '/catalog/999']) {
      const { unmount } = renderAt(path);
      expect(screen.queryByRole('navigation', { name: 'Хлебные крошки' })).toBeNull();
      unmount();
    }
  });
});

describe('route restricted to the admin role', () => {
  it('gives the admin role to the name admin in any letter case and spacing, and user to the rest', () => {
    expect(roleFor('admin')).toBe('admin');
    expect(roleFor('  AdMiN ')).toBe('admin');
    expect(roleFor('administrator')).toBe('user');
    expect(roleFor('Ксения')).toBe('user');
    expect(roleFor(null)).toBe('user');
    expect(roleFor({ toString: () => 'admin' })).toBe('user');
  });

  it('sends a guest from /admin to /login and, after signing in as admin, to /admin', async () => {
    const user = userEvent.setup();
    renderAt('/admin');
    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Имя пользователя'), 'admin');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByRole('heading', { name: 'Раздел администратора' })).toBeInTheDocument();
    expect(screen.getByText('Вы вошли как admin.')).toBeInTheDocument();
  });

  it('shows the 403 page to a signed-in user with another role', async () => {
    signedIn('Ксения');
    renderAt('/admin');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 403');
    expect(screen.getByText('Код ошибки: 403')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Раздел администратора' })).toBeNull();
    expect(document.title).toBe('Доступ запрещён — DSLKit');
  });

  it('a double click on the sign-in button signs in once and ends on the dashboard without an error', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(screen.getByLabelText('Имя пользователя'), 'Ксения');
    await user.dblClick(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
    expect(localStorage.getItem(USER_KEY)).toBe('Ксения');
  });

  it('shows the admin link on the dashboard only to the admin', async () => {
    signedIn('admin');
    const first = renderAt('/dashboard');
    expect(await screen.findByRole('link', { name: 'Раздел администратора' })).toHaveAttribute('href', '/admin');
    first.unmount();
    localStorage.clear();
    signedIn('Ксения');
    renderAt('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Раздел администратора' })).toBeNull();
  });

  it('loses the admin role at once after the sign-out in another tab', async () => {
    signedIn('admin');
    renderAt('/admin');
    expect(await screen.findByRole('heading', { name: 'Раздел администратора' })).toBeInTheDocument();
    localStorage.removeItem(AUTH_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: AUTH_KEY }));
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
  });

  it('does not give the admin role for a stored flag without a valid name, or for blocked storage', async () => {
    localStorage.setItem(AUTH_KEY, 'true');
    renderAt('/admin');
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
  });
});
