import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { mockProfile, renderApp } from './testUtils';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchProfile: vi.fn(),
  fetchUsers: vi.fn(),
  setUserRole: vi.fn(),
  deleteUser: vi.fn(),
}));

const ADMIN = { id: 1, email: 'root@example.test', role: 'admin', createdAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:00.000Z' };
const ALICE = { id: 2, email: 'alice@example.test', role: 'user', createdAt: '2026-10-17T10:00:00.000Z', updatedAt: '2026-10-17T10:00:00.000Z' };
const BOB = { id: 3, email: 'bob@example.test', role: 'user', createdAt: '2026-10-18T10:00:00.000Z', updatedAt: '2026-10-18T10:00:00.000Z' };
const serverError = (status, error) => Object.assign(new Error('fail'), { response: { status, data: { error } } });
const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};
const open = async () => {
  renderApp('/admin');
  await screen.findByRole('table');
};
const emails = () => within(screen.getByRole('table')).getAllByRole('rowheader').map((cell) => cell.textContent.replace(' это вы', '').trim());

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  localStorage.setItem('token', 'jwt');
  mockProfile(ADMIN);
  api.fetchUsers.mockResolvedValue({ data: [ADMIN, ALICE, BOB] });
});

describe('the user table', () => {
  it('shows a loading line, then a table with a row per user, roles and a mark on the own row', async () => {
    const pending = deferred();
    api.fetchUsers.mockReturnValue(pending.promise);
    renderApp('/admin');
    expect(await screen.findByText('Загрузка…')).toBeInTheDocument();
    pending.resolve({ data: [ADMIN, ALICE, BOB] });
    await screen.findByRole('table');
    expect(emails()).toEqual(['root@example.test', 'alice@example.test', 'bob@example.test']);
    expect(screen.getByLabelText('Роль пользователя alice@example.test')).toHaveValue('user');
    expect(screen.getByLabelText('Роль пользователя root@example.test')).toHaveValue('admin');
    expect(screen.getByText('это вы')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Почта', 'Роль', 'Создан', 'Действия']);
  });

  it('shows the error with the explanation and a working retry', async () => {
    const user = userEvent.setup();
    api.fetchUsers.mockRejectedValueOnce(serverError(500, 'Internal server error'));
    renderApp('/admin');
    expect(await screen.findByText('Internal server error')).toBeInTheDocument();
    expect(screen.getByText('Ошибка 500: сбой на сервере')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    await screen.findByRole('table');
    expect(emails()).toHaveLength(3);
  });

  it('shows a message for an empty list', async () => {
    api.fetchUsers.mockResolvedValue({ data: [] });
    await open();
    expect(screen.getByText('Пользователей нет.')).toBeInTheDocument();
  });

  it('an answer that is not a list is an error, not a crash', async () => {
    api.fetchUsers.mockResolvedValue({ data: '<html>proxy</html>' });
    renderApp('/admin');
    expect(await screen.findByText(/неожиданный ответ/)).toBeInTheDocument();
  });
});

describe('changing a role', () => {
  it('sends the new role, shows it after the answer and says that it is done', async () => {
    const user = userEvent.setup();
    api.setUserRole.mockResolvedValue({ data: { ...ALICE, role: 'admin' } });
    await open();
    await user.selectOptions(screen.getByLabelText('Роль пользователя alice@example.test'), 'admin');
    expect(await screen.findByText('Роль пользователя alice@example.test изменена.')).toBeInTheDocument();
    expect(api.setUserRole).toHaveBeenCalledWith(2, 'admin');
    expect(screen.getByLabelText('Роль пользователя alice@example.test')).toHaveValue('admin');
  });

  it('own role: the server refuses and the page explains why in plain words', async () => {
    const user = userEvent.setup();
    api.setUserRole.mockRejectedValue(serverError(400, 'Admins cannot change their own role'));
    await open();
    await user.selectOptions(screen.getByLabelText('Роль пользователя root@example.test'), 'user');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Нельзя изменить собственную роль');
    expect(alert).toHaveTextContent('Роль администратора меняет другой администратор');
    expect(screen.getByLabelText('Роль пользователя root@example.test')).toHaveValue('admin');
  });

  it('another failure shows the server message and keeps the old role', async () => {
    const user = userEvent.setup();
    api.setUserRole.mockRejectedValue(serverError(500, 'Internal server error'));
    await open();
    await user.selectOptions(screen.getByLabelText('Роль пользователя bob@example.test'), 'admin');
    expect(await screen.findByRole('alert')).toHaveTextContent('Internal server error');
    expect(screen.getByLabelText('Роль пользователя bob@example.test')).toHaveValue('user');
  });

  it('the row is locked while its request runs', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    api.setUserRole.mockReturnValue(pending.promise);
    await open();
    await user.selectOptions(screen.getByLabelText('Роль пользователя bob@example.test'), 'admin');
    expect(screen.getByLabelText('Роль пользователя bob@example.test')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Удалить пользователя bob@example.test' })).toBeDisabled();
    pending.resolve({ data: { ...BOB, role: 'admin' } });
    await waitFor(() => expect(screen.getByLabelText('Роль пользователя bob@example.test')).not.toBeDisabled());
  });
});

describe('deleting a user', () => {
  it('asks first; the focus is on "Отмена" and cancelling sends nothing', async () => {
    const user = userEvent.setup();
    await open();
    await user.click(screen.getByRole('button', { name: 'Удалить пользователя bob@example.test' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Удалить пользователя?' });
    expect(dialog).toHaveTextContent('bob@example.test');
    expect(within(dialog).getByRole('button', { name: 'Отмена' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Отмена' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.deleteUser).not.toHaveBeenCalled();
    expect(emails()).toHaveLength(3);
  });

  it('removes the row after the confirmation and says so', async () => {
    const user = userEvent.setup();
    api.deleteUser.mockResolvedValue({});
    await open();
    await user.click(screen.getByRole('button', { name: 'Удалить пользователя bob@example.test' }));
    await user.click(screen.getByRole('button', { name: 'Удалить bob@example.test' }));
    expect(await screen.findByText('Пользователь bob@example.test удалён.')).toBeInTheDocument();
    expect(api.deleteUser).toHaveBeenCalledWith(3);
    expect(emails()).toEqual(['root@example.test', 'alice@example.test']);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('a user who owns diagrams (409) stays and the reason is explained', async () => {
    const user = userEvent.setup();
    api.deleteUser.mockRejectedValue(serverError(409, 'The user still owns diagrams, delete or reassign them first'));
    await open();
    await user.click(screen.getByRole('button', { name: 'Удалить пользователя alice@example.test' }));
    await user.click(screen.getByRole('button', { name: 'Удалить alice@example.test' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('У пользователя есть диаграммы, поэтому удалить его нельзя');
    expect(emails()).toHaveLength(3);
  });

  it('deleting the own account is refused by the server and explained', async () => {
    const user = userEvent.setup();
    api.deleteUser.mockRejectedValue(serverError(400, 'Admins cannot delete themselves'));
    await open();
    await user.click(screen.getByRole('button', { name: 'Удалить пользователя root@example.test' }));
    await user.click(screen.getByRole('button', { name: 'Удалить root@example.test' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Нельзя удалить самого себя');
    expect(emails()).toHaveLength(3);
  });

  it('a user who is already gone (404) disappears from the list', async () => {
    const user = userEvent.setup();
    api.deleteUser.mockRejectedValue(serverError(404, 'User 3 not found'));
    await open();
    await user.click(screen.getByRole('button', { name: 'Удалить пользователя bob@example.test' }));
    await user.click(screen.getByRole('button', { name: 'Удалить bob@example.test' }));
    await waitFor(() => expect(emails()).toEqual(['root@example.test', 'alice@example.test']));
  });
});
