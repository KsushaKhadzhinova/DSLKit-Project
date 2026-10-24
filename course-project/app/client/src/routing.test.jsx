import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { mockProfile, renderApp } from './testUtils';
import { safeReturnPath } from './utils/returnPath';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchProfile: vi.fn(),
  fetchDiagrams: vi.fn(),
  fetchDiagram: vi.fn(),
  fetchComments: vi.fn(),
  fetchUsers: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));

const diagram = { id: 3, title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> pay', priority: 'high', ownerId: 2, createdAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:00.000Z' };
const serverError = (status, error = 'x') => Object.assign(new Error('fail'), { response: { status, data: { error } } });
const signIn = () => localStorage.setItem('token', 'jwt');
const main = () => within(screen.getByRole('main'));

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mockProfile();
  api.fetchDiagrams.mockResolvedValue({ data: [], headers: { 'x-total-count': '0' } });
  api.fetchComments.mockResolvedValue({ data: [], headers: { 'x-total-count': '0' } });
  api.fetchDiagram.mockResolvedValue({ data: diagram });
  api.fetchUsers.mockResolvedValue({ data: [] });
});

describe('public and protected routes', () => {
  it('the login and registration pages are open to a guest', async () => {
    renderApp('/login');
    expect(await screen.findByRole('heading', { level: 1, name: 'Вход в DSLKit' })).toBeInTheDocument();
  });

  it('the registration page has its own address and heading', async () => {
    renderApp('/register');
    expect(await screen.findByRole('heading', { level: 1, name: 'Регистрация в DSLKit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Зарегистрироваться' })).toBeInTheDocument();
  });

  it('the root address leads a guest to the login and a signed-in user to the list', async () => {
    const { unmount } = renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Вход в DSLKit' })).toBeInTheDocument();
    unmount();
    signIn();
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Диаграммы проекта' })).toBeInTheDocument();
  });

  it.each(['/diagrams', '/diagrams/3', '/admin'])('a guest at %s is sent to the login page', async (path) => {
    renderApp(path);
    expect(await screen.findByRole('heading', { level: 1, name: 'Вход в DSLKit' })).toBeInTheDocument();
    expect(api.fetchDiagrams).not.toHaveBeenCalled();
    expect(api.fetchUsers).not.toHaveBeenCalled();
  });

  it('after the login the user returns to the page that was asked for, not to the list', async () => {
    const user = userEvent.setup();
    api.login.mockResolvedValue({ data: { token: 'jwt' } });
    renderApp('/diagrams/3');
    await user.type(await screen.findByLabelText('Электронная почта'), 'me@example.test');
    await user.type(screen.getByLabelText('Пароль'), 'correct horse 42');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Order processing' })).toBeInTheDocument();
  });

  it('a signed-in user at /login goes on to the list, and a hostile return address is not followed', async () => {
    signIn();
    renderApp('/login', { from: '//evil.test/steal' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Диаграммы проекта' })).toBeInTheDocument();
  });

  it('a signed-in user at /login follows a safe return address', async () => {
    signIn();
    renderApp('/login', { from: '/diagrams/3' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Order processing' })).toBeInTheDocument();
  });

  it('the header changes with the session: guest links, then list and logout', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    expect(await screen.findByRole('link', { name: 'Регистрация' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Выйти' })).not.toBeInTheDocument();
    signIn();
    renderApp('/diagrams');
    await user.click(await screen.findByRole('button', { name: 'Выйти' }));
    expect(await screen.findAllByRole('heading', { level: 1, name: 'Вход в DSLKit' })).not.toHaveLength(0);
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('the role route /admin', () => {
  it('a plain user sees the 403 page with the three parts and the way back, and the admin data is not requested', async () => {
    signIn();
    renderApp('/admin');
    expect(await screen.findByRole('heading', { level: 1, name: 'Ошибка 403: доступ запрещён' })).toBeInTheDocument();
    for (const part of ['Что это', 'Почему так вышло', 'Как это исправить']) expect(screen.getByRole('heading', { name: part })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К списку диаграмм' })).toHaveAttribute('href', '/diagrams');
    expect(api.fetchUsers).not.toHaveBeenCalled();
  });

  it('an administrator opens the page and the header shows the link to it', async () => {
    signIn();
    mockProfile({ id: 1, email: 'root@example.test', role: 'admin' });
    renderApp('/diagrams');
    expect(await screen.findByRole('link', { name: 'Администрирование' })).toHaveAttribute('href', '/admin');
  });

  it('a plain user does not get the link in the header', async () => {
    signIn();
    renderApp('/diagrams');
    await screen.findByRole('heading', { level: 1, name: 'Диаграммы проекта' });
    expect(screen.queryByRole('link', { name: 'Администрирование' })).not.toBeInTheDocument();
  });

  it('while the role is being checked the page waits, and a failed check is an error page with retry', async () => {
    const user = userEvent.setup();
    signIn();
    api.fetchProfile.mockRejectedValueOnce(serverError(500));
    renderApp('/admin');
    expect(await screen.findByRole('heading', { level: 1, name: 'Ошибка 500: сбой на сервере' })).toBeInTheDocument();
    mockProfile({ id: 1, email: 'root@example.test', role: 'admin' });
    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Администрирование' })).toBeInTheDocument();
  });

  it('a network failure of the role check shows the "no connection" page', async () => {
    signIn();
    api.fetchProfile.mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
    renderApp('/admin');
    expect(await screen.findByRole('heading', { level: 1, name: 'Нет связи с сервером' })).toBeInTheDocument();
  });
});

describe('error pages', () => {
  it.each([
    ['/no/such/page', 'Ошибка 404: не найдено'],
    ['/401', 'Ошибка 401: нужен вход'],
    ['/403', 'Ошибка 403: доступ запрещён'],
    ['/500', 'Ошибка 500: сбой на сервере'],
  ])('%s shows the page "%s" with what it is, why and how to fix it', async (path, title) => {
    renderApp(path);
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    for (const part of ['Что это', 'Почему так вышло', 'Как это исправить']) expect(screen.getByRole('heading', { name: part })).toBeInTheDocument();
    expect(main().getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
  });

  it('the 404 page leads home; the 401 page leads to the login', async () => {
    const { unmount } = renderApp('/nothing-here');
    expect(await screen.findByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/');
    unmount();
    renderApp('/401');
    expect(await screen.findByRole('link', { name: 'Войти' })).toHaveAttribute('href', '/login');
  });

  it.each(['/diagrams/abc', '/diagrams/0', '/diagrams/99999999999'])('%s is a missing page and the server is not asked', async (path) => {
    signIn();
    renderApp(path);
    expect(await screen.findByRole('heading', { level: 1, name: 'Ошибка 404: не найдено' })).toBeInTheDocument();
    expect(api.fetchDiagram).not.toHaveBeenCalled();
  });

  it('a diagram the server does not know is the 404 page too', async () => {
    signIn();
    api.fetchDiagram.mockRejectedValue(serverError(404, 'Diagram 7 not found'));
    renderApp('/diagrams/7');
    expect(await screen.findByRole('heading', { level: 1, name: 'Ошибка 404: не найдено' })).toBeInTheDocument();
  });

  it('a server failure on the detail page shows the message, the explanation and a working retry', async () => {
    const user = userEvent.setup();
    signIn();
    api.fetchDiagram.mockRejectedValueOnce(serverError(500, 'Internal server error'));
    renderApp('/diagrams/3');
    expect(await screen.findByText('Internal server error')).toBeInTheDocument();
    expect(screen.getByText('Ошибка 500: сбой на сервере')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Order processing' })).toBeInTheDocument();
  });

  it('the detail page shows the diagram, its source as text and a link back', async () => {
    signIn();
    api.fetchDiagram.mockResolvedValue({ data: { ...diagram, sourceCode: '<script>alert(1)</script>' } });
    renderApp('/diagrams/3');
    expect(await screen.findByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('link', { name: /К списку диаграмм/ })).toHaveAttribute('href', '/diagrams');
  });

  it('a card in the list links to the detail page of the diagram', async () => {
    signIn();
    api.fetchDiagrams.mockResolvedValue({ data: [diagram], headers: { 'x-total-count': '1' } });
    renderApp('/diagrams');
    expect(await screen.findByRole('link', { name: 'Order processing' })).toHaveAttribute('href', '/diagrams/3');
  });
});

describe('safeReturnPath', () => {
  it.each(['/diagrams', '/diagrams/3', '/diagrams?search=a#top', '/admin'])('keeps %s', (path) => {
    expect(safeReturnPath(path)).toBe(path);
  });

  it.each([
    '//evil.test',
    'https://evil.test',
    'javascript:alert(1)',
    '/\\evil.test',
    '/\t/evil.test',
    '/a b',
    '/a\nb',
    '/login',
    '/login?x=1',
    '/register',
    '/401',
    'diagrams',
    '',
    undefined,
    null,
    42,
    { toString: () => '/x' },
  ])('refuses %j and falls back to the list', (value) => {
    expect(safeReturnPath(value)).toBe('/diagrams');
  });

  it('uses the fallback that is given', () => {
    expect(safeReturnPath('//x', '/home')).toBe('/home');
  });
});
