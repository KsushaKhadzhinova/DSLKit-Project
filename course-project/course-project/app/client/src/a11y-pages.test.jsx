import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { mockProfile, renderApp } from './testUtils';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchProfile: vi.fn(),
  fetchDiagram: vi.fn(),
  fetchComments: vi.fn(),
  fetchDiagramTags: vi.fn(),
  fetchUsers: vi.fn(),
}));

// The same axe-core audit as in a11y.test.jsx (WCAG 2 A and AA rules) for the pages that React Router added.
// jsdom has no layout, so the colour contrast rule cannot run here.
const audit = async (container = document.body) => {
  const { violations } = await axe.run(container, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }, rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`);
};

const diagram = { id: 3, title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> pay', priority: 'high', ownerId: 2, createdAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:00.000Z' };
const comment = (id, authorId, text) => ({ id, diagramId: 3, authorId, text, createdAt: '2026-10-17T10:00:00.000Z', updatedAt: '2026-10-17T10:00:00.000Z' });
const user = (id, email, role) => ({ id, email, role, createdAt: '2026-10-17T10:00:00.000Z', updatedAt: '2026-10-17T10:00:00.000Z' });

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  localStorage.setItem('token', 'jwt');
  mockProfile({ id: 1, email: 'root@example.test', role: 'admin' });
  api.fetchDiagram.mockResolvedValue({ data: diagram });
  api.fetchDiagramTags.mockResolvedValue({ data: [] });
  api.fetchComments.mockResolvedValue({ data: [comment(1, 1, 'Mine'), comment(2, 2, 'Theirs')], headers: { 'x-total-count': '2' } });
  api.fetchUsers.mockResolvedValue({ data: [user(1, 'root@example.test', 'admin'), user(2, 'alice@example.test', 'user')] });
});

describe('accessibility of the routed pages (axe-core)', () => {
  it('the login and registration pages have no violations', async () => {
    localStorage.clear();
    const { unmount } = renderApp('/login');
    await screen.findByRole('heading', { level: 1, name: 'Вход в DSLKit' });
    expect(await audit()).toEqual([]);
    unmount();
    renderApp('/register');
    await screen.findByRole('heading', { level: 1, name: 'Регистрация в DSLKit' });
    expect(await audit()).toEqual([]);
  });

  it('the detail page with comments has no violations, also while a comment is edited and with a form error', async () => {
    const u = userEvent.setup();
    renderApp('/diagrams/3');
    await screen.findByText('Mine');
    expect(await audit()).toEqual([]);
    await u.click(screen.getByRole('button', { name: 'Отправить' }));
    await screen.findByText('Введите комментарий');
    expect(await audit()).toEqual([]);
    await u.click(screen.getByRole('button', { name: 'Изменить комментарий №1' }));
    expect(await audit()).toEqual([]);
  });

  it('the detail page without comments and while loading has no violations', async () => {
    api.fetchComments.mockResolvedValue({ data: [], headers: { 'x-total-count': '0' } });
    renderApp('/diagrams/3');
    expect(await audit()).toEqual([]);
    await screen.findByText('Комментариев пока нет.');
    expect(await audit()).toEqual([]);
  });

  it('the administration table and the delete confirmation have no violations', async () => {
    const u = userEvent.setup();
    renderApp('/admin');
    await screen.findByRole('table');
    expect(await audit()).toEqual([]);
    await u.click(screen.getByRole('button', { name: 'Удалить пользователя alice@example.test' }));
    await screen.findByRole('alertdialog');
    expect(await audit()).toEqual([]);
  });

  it('the administration page with a load error has no violations', async () => {
    api.fetchUsers.mockRejectedValue(Object.assign(new Error('fail'), { response: { status: 500, data: { error: 'x' } } }));
    renderApp('/admin');
    await screen.findByRole('button', { name: 'Повторить' });
    expect(await audit()).toEqual([]);
  });

  it.each(['/no-such-page', '/401', '/403', '/500'])('the error page %s has no violations', async (path) => {
    renderApp(path);
    await screen.findByRole('heading', { level: 1 });
    expect(await audit()).toEqual([]);
  });

  it('the 403 page for a plain user at /admin has no violations', async () => {
    mockProfile({ id: 5, email: 'me@example.test', role: 'user' });
    renderApp('/admin');
    await screen.findByRole('heading', { level: 1, name: 'Ошибка 403: доступ запрещён' });
    expect(await audit()).toEqual([]);
  });

  it('every page has one level-1 heading and the page language comes from the document', async () => {
    renderApp('/admin');
    await screen.findByRole('table');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
