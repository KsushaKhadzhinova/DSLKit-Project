import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import App from './App';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchDiagrams: vi.fn(),
  addDiagram: vi.fn(),
  updateDiagram: vi.fn(),
  deleteDiagram: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));

const record = (id, title) => ({ id, title, notation: 'UML', sourceCode: 'a -> b', priority: 'normal', createdAt: `2026-10-16T10:00:0${id}.000Z` });
const initial = [record(1, 'Order processing'), record(2, 'Billing schema')];
const titles = () => within(screen.getByRole('main')).queryAllByRole('listitem').map((li) => li.querySelector('.card__title').textContent);
const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};
const serverError = (status, error, details) => Object.assign(new Error('fail'), { response: { status, data: { error, details } } });

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('token', 'jwt');
  api.fetchDiagrams.mockResolvedValue({ data: initial });
});

describe('list loading', () => {
  it('shows the loading indicator, then the loaded items', async () => {
    const pending = deferred();
    api.fetchDiagrams.mockReturnValue(pending.promise);
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('Загрузка');
    pending.resolve({ data: initial });
    await screen.findByText('Order processing');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(titles()).toEqual(['Order processing', 'Billing schema']);
    expect(screen.getAllByText(/Создана: /)).toHaveLength(2);
  });

  it('shows an empty-state message for an empty list', async () => {
    api.fetchDiagrams.mockResolvedValue({ data: [] });
    render(<App />);
    expect(await screen.findByText('Диаграмм не найдено.')).toBeInTheDocument();
  });

  it('shows the error and a retry button, and loads again on retry', async () => {
    const user = userEvent.setup();
    api.fetchDiagrams.mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
    render(<App />);
    expect(await screen.findByText(/Сервер недоступен/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText('Order processing')).toBeInTheDocument();
    expect(api.fetchDiagrams).toHaveBeenCalledTimes(2);
  });

  it('cancels the request when the component unmounts', () => {
    api.fetchDiagrams.mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<App />);
    const signal = api.fetchDiagrams.mock.calls[0][1];
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });
});

describe('adding', () => {
  const fill = async (user, title = 'New diagram', code = 'x -> y') => {
    await user.type(screen.getByLabelText('Название'), title);
    await user.type(screen.getByLabelText('Исходный код'), code);
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
  };

  it('shows the item at once, then replaces the temporary id with the real record', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    api.addDiagram.mockReturnValue(pending.promise);
    render(<App />);
    await screen.findByText('Order processing');
    await fill(user);
    expect(titles()).toContain('New diagram');
    expect(screen.getByText('Сохраняется…')).toBeInTheDocument();
    expect(api.addDiagram).toHaveBeenCalledWith({ title: 'New diagram', notation: 'UML', sourceCode: 'x -> y', priority: 'normal' });
    pending.resolve({ data: record(3, 'New diagram') });
    await waitFor(() => expect(screen.queryByText('Сохраняется…')).not.toBeInTheDocument());
    expect(titles()).toEqual(['Order processing', 'Billing schema', 'New diagram']);
  });

  it('removes the item and shows a notice when the server refuses', async () => {
    const user = userEvent.setup();
    api.addDiagram.mockRejectedValue(serverError(400, 'Invalid diagram data', [{ field: 'title', message: 'bad' }]));
    render(<App />);
    await screen.findByText('Order processing');
    await fill(user);
    expect(await screen.findByText(/Не удалось добавить диаграмму. Invalid diagram data – title: bad/)).toBeInTheDocument();
    expect(titles()).toEqual(['Order processing', 'Billing schema']);
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(screen.queryByText(/Не удалось добавить/)).not.toBeInTheDocument();
  });

  it('does not send a whitespace-only title or code and shows field errors', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Order processing');
    await fill(user, '   ', '  ');
    expect(screen.getByText('Введите название')).toBeInTheDocument();
    expect(screen.getByText('Введите исходный код')).toBeInTheDocument();
    expect(api.addDiagram).not.toHaveBeenCalled();
  });

  it('rejects a title above the limit', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Order processing');
    // maxLength stops typing and pasting, so a longer value is forced with a change event: the check must still refuse it.
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'x'.repeat(81) } });
    await user.type(screen.getByLabelText('Исходный код'), 'a');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByText('Название не длиннее 80 символов')).toBeInTheDocument();
  });
});

describe('deleting', () => {
  it('removes the item at once and keeps it removed on success', async () => {
    const user = userEvent.setup();
    api.deleteDiagram.mockResolvedValue({});
    render(<App />);
    await screen.findByText('Order processing');
    await user.click(screen.getByRole('button', { name: 'Удалить: Order processing' }));
    expect(titles()).toEqual(['Billing schema']);
    expect(api.deleteDiagram).toHaveBeenCalledWith(1);
  });

  it('puts the item back to its place when the server refuses', async () => {
    const user = userEvent.setup();
    api.deleteDiagram.mockRejectedValue(serverError(403, 'Only the owner or an admin can delete this diagram'));
    render(<App />);
    await screen.findByText('Order processing');
    await user.click(screen.getByRole('button', { name: 'Удалить: Order processing' }));
    expect(await screen.findByText(/Не удалось удалить диаграмму. Only the owner/)).toBeInTheDocument();
    expect(titles()).toEqual(['Order processing', 'Billing schema']);
  });
});

describe('editing', () => {
  const edit = async (user, text) => {
    await user.click(screen.getByRole('button', { name: 'Изменить: Order processing' }));
    const input = screen.getByLabelText('Новое название');
    await user.clear(input);
    if (text) await user.type(input, text);
    return input;
  };

  it('shows the new title at once and sends the whole record with PUT', async () => {
    const user = userEvent.setup();
    api.updateDiagram.mockResolvedValue({ data: record(1, 'Checkout') });
    render(<App />);
    await screen.findByText('Order processing');
    await edit(user, 'Checkout{Enter}');
    await waitFor(() => expect(titles()).toEqual(['Checkout', 'Billing schema']));
    expect(api.updateDiagram).toHaveBeenCalledWith(1, { title: 'Checkout', notation: 'UML', sourceCode: 'a -> b', priority: 'normal' });
  });

  it('restores the old title and shows a notice when the server refuses', async () => {
    const user = userEvent.setup();
    api.updateDiagram.mockRejectedValue(serverError(500, undefined));
    render(<App />);
    await screen.findByText('Order processing');
    await edit(user, 'Checkout{Enter}');
    expect(await screen.findByText(/Не удалось сохранить изменения. Ошибка сервера \(500\)/)).toBeInTheDocument();
    expect(titles()).toEqual(['Order processing', 'Billing schema']);
  });

  it('keeps edit mode with an error for an empty or too long title, cancels with Escape', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Order processing');
    const input = await edit(user, '   ');
    await user.type(input, '{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Введите название');
    fireEvent.change(input, { target: { value: 'y'.repeat(81) } });
    await user.click(screen.getByRole('button', { name: 'Сохранить: Order processing' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Название не длиннее 80 символов');
    await user.type(input, '{Escape}');
    expect(titles()).toEqual(['Order processing', 'Billing schema']);
    expect(api.updateDiagram).not.toHaveBeenCalled();
  });

  it('does not call the server when the title did not change', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Order processing');
    await edit(user, 'Order processing{Enter}');
    expect(api.updateDiagram).not.toHaveBeenCalled();
    expect(within(within(screen.getByRole('main')).getAllByRole('listitem')[0]).queryByLabelText('Новое название')).not.toBeInTheDocument();
  });
});

describe('search with debounce', () => {
  it('sends one request with the final text and cancels the previous one', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Order processing');
    expect(api.fetchDiagrams).toHaveBeenCalledTimes(1);
    const firstSignal = api.fetchDiagrams.mock.calls[0][1];
    api.fetchDiagrams.mockResolvedValue({ data: [initial[0]] });
    await user.type(screen.getByLabelText('Поиск по названию'), 'ord');
    expect(api.fetchDiagrams).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(api.fetchDiagrams).toHaveBeenCalledTimes(2));
    expect(api.fetchDiagrams.mock.calls[1][0]).toBe('ord');
    expect(firstSignal.aborted).toBe(true);
    await waitFor(() => expect(titles()).toEqual(['Order processing']));
  });

  it('ignores the error of a cancelled request', async () => {
    const user = userEvent.setup();
    const cancelled = Object.assign(new Error('canceled'), { code: 'ERR_CANCELED', name: 'CanceledError', __CANCEL__: true });
    api.fetchDiagrams.mockImplementation((_search, signal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(cancelled))));
    render(<App />);
    await user.type(screen.getByLabelText('Поиск по названию'), 'a');
    await waitFor(() => expect(api.fetchDiagrams).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('session', () => {
  it('shows the login form without a token, validates it and signs in', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    api.login.mockResolvedValue({ data: { token: 'new-token' } });
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByText('Введите адрес электронной почты')).toBeInTheDocument();
    expect(screen.getByText('Пароль не короче 8 символов')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Электронная почта/), 'kate@example.com');
    await user.type(screen.getByLabelText(/^Пароль/), 'correct horse 42');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByText('Order processing')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBe('new-token');
    expect(api.login).toHaveBeenCalledWith('kate@example.com', 'correct horse 42');
  });

  it('registers first, then signs in, and shows the server message on failure', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    api.register.mockRejectedValueOnce(serverError(409, 'A user with this email already exists'));
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Нужна регистрация' }));
    await user.type(screen.getByLabelText(/^Электронная почта/), 'kate@example.com');
    await user.type(screen.getByLabelText(/^Пароль/), 'correct horse 42');
    await user.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
    expect(await screen.findByText('A user with this email already exists')).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
    api.register.mockResolvedValue({});
    api.login.mockResolvedValue({ data: { token: 't2' } });
    await user.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
    expect(await screen.findByText('Order processing')).toBeInTheDocument();
    expect(api.register).toHaveBeenCalledTimes(2);
  });

  it('can switch back from registration to login', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Нужна регистрация' }));
    await user.click(screen.getByRole('button', { name: 'Уже есть аккаунт' }));
    expect(screen.getByRole('form', { name: 'Вход' })).toBeInTheDocument();
  });

  it('rejects a password above the limit', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    render(<App />);
    await user.type(screen.getByLabelText(/^Электронная почта/), 'kate@example.com');
    await user.click(screen.getByLabelText(/^Пароль/));
    await user.paste('p'.repeat(73));
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByText('Пароль не длиннее 72 байт')).toBeInTheDocument();
  });

  it('logs out with the button', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Order processing');
    await user.click(screen.getByRole('button', { name: 'Выйти' }));
    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByRole('form', { name: 'Вход' })).toBeInTheDocument();
  });

  it('shows the login form when the api reports a rejected token', async () => {
    render(<App />);
    await screen.findByText('Order processing');
    window.dispatchEvent(new Event('auth:logout'));
    expect(await screen.findByRole('form', { name: 'Вход' })).toBeInTheDocument();
  });
});

describe('races and safety', () => {
  it('sends one DELETE for a fast double click on the same record', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    api.deleteDiagram.mockReturnValue(pending.promise);
    render(<App />);
    await screen.findByText('Order processing');
    const button = screen.getByRole('button', { name: 'Удалить: Order processing' });
    await user.dblClick(button);
    pending.resolve({});
    expect(api.deleteDiagram).toHaveBeenCalledTimes(1);
    expect(titles()).toEqual(['Billing schema']);
  });

  it('does not delete or edit a record that still has a temporary id', async () => {
    const user = userEvent.setup();
    api.addDiagram.mockReturnValue(deferred().promise);
    render(<App />);
    await screen.findByText('Order processing');
    await user.type(screen.getByLabelText('Название'), 'Draft');
    await user.type(screen.getByLabelText('Исходный код'), 'a -> b');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByRole('button', { name: 'Удалить: Draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Изменить: Draft' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Удалить: Draft' }));
    expect(api.deleteDiagram).not.toHaveBeenCalled();
  });

  it('keeps the record removed when the server says it is already gone (404)', async () => {
    const user = userEvent.setup();
    api.deleteDiagram.mockRejectedValue(serverError(404, 'Diagram 1 not found'));
    render(<App />);
    await screen.findByText('Order processing');
    await user.click(screen.getByRole('button', { name: 'Удалить: Order processing' }));
    await waitFor(() => expect(api.deleteDiagram).toHaveBeenCalled());
    expect(titles()).toEqual(['Billing schema']);
    expect(screen.queryByText(/Не удалось удалить/)).not.toBeInTheDocument();
  });

  it('shows markup from the server as plain text', async () => {
    const user = userEvent.setup();
    api.addDiagram.mockRejectedValue(serverError(400, '<img src=x onerror=alert(1)>'));
    const { container } = render(<App />);
    await screen.findByText('Order processing');
    await user.type(screen.getByLabelText('Название'), 'Draft');
    await user.type(screen.getByLabelText('Исходный код'), 'a');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(await screen.findByText(/<img src=x onerror=alert\(1\)>/)).toBeInTheDocument();
    expect(container.querySelector('img[src="x"]')).toBeNull();
  });

  it('tells the user that the session expired when the token is rejected', async () => {
    render(<App />);
    await screen.findByText('Order processing');
    window.dispatchEvent(new Event('auth:logout'));
    expect(await screen.findByText('Сессия истекла. Войдите снова.')).toBeInTheDocument();
  });

  it('rejects a password above 72 bytes even when it is short in characters', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    render(<App />);
    await user.type(screen.getByLabelText(/^Электронная почта/), 'kate@example.com');
    await user.click(screen.getByLabelText(/^Пароль/));
    await user.paste('п'.repeat(40));
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByText('Пароль не длиннее 72 байт')).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });
});
