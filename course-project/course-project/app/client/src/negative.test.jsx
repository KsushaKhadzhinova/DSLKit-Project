import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { mockProfile, renderApp } from './testUtils';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchDiagrams: vi.fn(),
  addDiagram: vi.fn(),
  updateDiagram: vi.fn(),
  deleteDiagram: vi.fn(),
  login: vi.fn(),
  fetchProfile: vi.fn(),
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
const networkError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });

const fillNew = async (user, title = 'New diagram', code = 'x -> y') => {
  await user.type(screen.getByLabelText('Название'), title);
  await user.type(screen.getByLabelText('Исходный код'), code);
};
const fillCredentials = async (user, password = 'correct horse 42') => {
  await user.type(screen.getByLabelText(/^Электронная почта/), 'kate@example.com');
  await user.type(screen.getByLabelText(/^Пароль/), password);
};

beforeEach(() => {
  vi.resetAllMocks();
  mockProfile();
  localStorage.setItem('token', 'jwt');
  api.fetchDiagrams.mockResolvedValue({ data: initial });
});

describe('empty and oversized input', () => {
  it('shows field errors and sends nothing for an empty form', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Order processing');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByText('Введите название')).toBeInTheDocument();
    expect(screen.getByText('Введите исходный код')).toBeInTheDocument();
    expect(api.addDiagram).not.toHaveBeenCalled();
  });

  it('shows field errors and sends nothing for a form of tabs and spaces', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Order processing');
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: ' \t \t ' } });
    fireEvent.change(screen.getByLabelText('Исходный код'), { target: { value: '\t \t' } });
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByText('Введите название')).toBeInTheDocument();
    expect(screen.getByText('Введите исходный код')).toBeInTheDocument();
    expect(api.addDiagram).not.toHaveBeenCalled();
  });

  it('cuts a 100000-character title paste to 80 characters before sending', async () => {
    const user = userEvent.setup();
    api.addDiagram.mockReturnValue(deferred().promise);
    renderApp();
    await screen.findByText('Order processing');
    const title = screen.getByLabelText('Название');
    await user.click(title);
    await user.paste('x'.repeat(100000));
    expect(title).toHaveValue('x'.repeat(80));
    await user.type(screen.getByLabelText('Исходный код'), 'a');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(api.addDiagram).toHaveBeenCalledWith(expect.objectContaining({ title: 'x'.repeat(80) }));
  });

  it('refuses a 100000-character source code with a message and sends nothing', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Order processing');
    await user.type(screen.getByLabelText('Название'), 'Draft');
    fireEvent.change(screen.getByLabelText('Исходный код'), { target: { value: 'a'.repeat(100000) } });
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByText('Исходный код не длиннее 10000 символов')).toBeInTheDocument();
    expect(api.addDiagram).not.toHaveBeenCalled();
  });
});

describe('repeated actions', () => {
  it('sends one POST for a double click on the add button', async () => {
    const user = userEvent.setup();
    api.addDiagram.mockReturnValue(deferred().promise);
    renderApp();
    await screen.findByText('Order processing');
    await fillNew(user);
    await user.dblClick(screen.getByRole('button', { name: 'Добавить' }));
    expect(api.addDiagram).toHaveBeenCalledTimes(1);
  });

  it('sends one POST for a double Enter in the title field', async () => {
    const user = userEvent.setup();
    api.addDiagram.mockReturnValue(deferred().promise);
    renderApp();
    await screen.findByText('Order processing');
    await fillNew(user, 'Draft');
    await user.click(screen.getByLabelText('Название'));
    await user.keyboard('{Enter}{Enter}');
    expect(api.addDiagram).toHaveBeenCalledTimes(1);
  });

  it('sends one DELETE for a double Enter on the delete button', async () => {
    const user = userEvent.setup();
    api.deleteDiagram.mockReturnValue(deferred().promise);
    renderApp();
    await screen.findByText('Order processing');
    screen.getByRole('button', { name: 'Удалить: Order processing' }).focus();
    await user.keyboard('{Enter}{Enter}');
    expect(api.deleteDiagram).toHaveBeenCalledTimes(1);
    expect(api.deleteDiagram).toHaveBeenCalledWith(1);
  });

  it('sends one login request for a double click on the sign-in button', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    const pending = deferred();
    api.login.mockReturnValue(pending.promise);
    renderApp();
    await fillCredentials(user);
    await user.dblClick(screen.getByRole('button', { name: 'Войти' }));
    expect(api.login).toHaveBeenCalledTimes(1);
    pending.resolve({ data: { token: 'new-token' } });
    expect(await screen.findByText('Order processing')).toBeInTheDocument();
  });

  it('ignores the answer to an old search text that arrives after the new one', async () => {
    const user = userEvent.setup();
    const slow = deferred();
    const fast = deferred();
    api.fetchDiagrams.mockImplementation((search) => {
      if (search === 'b') return slow.promise;
      if (search === 'ord') return fast.promise;
      return Promise.resolve({ data: initial });
    });
    renderApp();
    await screen.findByText('Order processing');
    const search = screen.getByLabelText('Поиск по названию');
    await user.type(search, 'b');
    await waitFor(() => expect(api.fetchDiagrams).toHaveBeenCalledTimes(2));
    await user.clear(search);
    await user.type(search, 'ord');
    await waitFor(() => expect(api.fetchDiagrams).toHaveBeenCalledTimes(3));
    await act(async () => {
      fast.resolve({ data: [initial[0]] });
    });
    await waitFor(() => expect(titles()).toEqual(['Order processing']));
    await act(async () => {
      slow.resolve({ data: [initial[1]] });
    });
    expect(titles()).toEqual(['Order processing']);
  });

  it('cancels the rename with Escape and keeps the old title', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Order processing');
    await user.click(screen.getByRole('button', { name: 'Изменить: Order processing' }));
    await user.type(screen.getByLabelText('Новое название'), ' changed{Escape}');
    expect(screen.queryByLabelText('Новое название')).not.toBeInTheDocument();
    expect(titles()).toEqual(['Order processing', 'Billing schema']);
    expect(api.updateDiagram).not.toHaveBeenCalled();
  });
});

describe('server answers', () => {
  it('shows a notice and removes the new item when the server is unavailable on add', async () => {
    const user = userEvent.setup();
    api.addDiagram.mockRejectedValue(networkError());
    renderApp();
    await screen.findByText('Order processing');
    await fillNew(user);
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(await screen.findByText(/Не удалось добавить диаграмму. Сервер недоступен/)).toBeInTheDocument();
    expect(titles()).toEqual(['Order processing', 'Billing schema']);
  });

  it('shows the status and a retry button when the list answers 500', async () => {
    const user = userEvent.setup();
    api.fetchDiagrams.mockRejectedValueOnce(serverError(500, undefined));
    renderApp();
    expect(await screen.findByText('Ошибка сервера (500)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText('Order processing')).toBeInTheDocument();
  });

  it('signs the user out and shows the login form when the token is rejected in the middle of a session', async () => {
    const user = userEvent.setup();
    const real = await vi.importActual('./api');
    const originalAdapter = real.default.defaults.adapter;
    // The real api.js runs here, so its 401 interceptor removes the token and sends the logout event.
    real.default.defaults.adapter = (config) =>
      Promise.reject(Object.assign(new Error('fail'), { config, response: { status: 401, statusText: '', data: { error: 'Invalid token' }, headers: {}, config }, isAxiosError: true }));
    api.addDiagram.mockImplementation((diagram) => real.addDiagram(diagram));
    try {
      renderApp();
      await screen.findByText('Order processing');
      await fillNew(user);
      await user.click(screen.getByRole('button', { name: 'Добавить' }));
      expect(await screen.findByText('Сессия истекла. Войдите снова.')).toBeInTheDocument();
      expect(localStorage.getItem('token')).toBeNull();
      expect(screen.getByRole('form', { name: 'Вход' })).toBeInTheDocument();
    } finally {
      real.default.defaults.adapter = originalAdapter;
    }
  });

  it('shows the 403 status and removes the new item when the server refuses the add', async () => {
    const user = userEvent.setup();
    api.addDiagram.mockRejectedValue(serverError(403, undefined));
    renderApp();
    await screen.findByText('Order processing');
    await fillNew(user);
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(await screen.findByText(/Не удалось добавить диаграмму. Ошибка сервера \(403\)/)).toBeInTheDocument();
    expect(titles()).toEqual(['Order processing', 'Billing schema']);
  });

  it('shows the 404 message and restores the old title when the record is gone on edit', async () => {
    const user = userEvent.setup();
    api.updateDiagram.mockRejectedValue(serverError(404, 'Diagram 1 not found'));
    renderApp();
    await screen.findByText('Order processing');
    await user.click(screen.getByRole('button', { name: 'Изменить: Order processing' }));
    await user.clear(screen.getByLabelText('Новое название'));
    await user.type(screen.getByLabelText('Новое название'), 'Checkout{Enter}');
    expect(await screen.findByText(/Не удалось сохранить изменения. Diagram 1 not found/)).toBeInTheDocument();
    expect(titles()).toEqual(['Order processing', 'Billing schema']);
  });

  it('shows an error instead of crashing when the server answers HTML', async () => {
    api.fetchDiagrams.mockResolvedValue({ data: '<!DOCTYPE html><html><body>Bad gateway</body></html>' });
    renderApp();
    expect(await screen.findByText('Сервер вернул неожиданный ответ. Проверьте адрес сервера')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });

  it('shows an error instead of crashing when the server answers an empty body', async () => {
    api.fetchDiagrams.mockResolvedValue({ data: '' });
    renderApp();
    expect(await screen.findByText('Сервер вернул неожиданный ответ. Проверьте адрес сервера')).toBeInTheDocument();
  });

  it('shows a timeout message when the server does not answer in time', async () => {
    api.fetchDiagrams.mockRejectedValue(Object.assign(new Error('timeout of 8000ms exceeded'), { code: 'ECONNABORTED' }));
    renderApp();
    expect(await screen.findByText('Сервер не ответил вовремя')).toBeInTheDocument();
  });

  it('shows the unavailable message when the server is down during sign-in', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    api.login.mockRejectedValue(networkError());
    renderApp();
    await fillCredentials(user);
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Сервер недоступен. Проверьте, что он запущен');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('shows the server message for a wrong password and keeps the login form', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    api.login.mockRejectedValue(serverError(401, 'Invalid email or password'));
    renderApp();
    await fillCredentials(user, 'wrong password 1');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByRole('form', { name: 'Вход' })).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('markup and storage', () => {
  it('shows markup from the data as plain text and runs no script', async () => {
    const hostile = { ...record(1, '<img src="x" onerror="window.__pwned = true">'), sourceCode: '<script>window.__pwned = true</script>' };
    api.fetchDiagrams.mockResolvedValue({ data: [hostile] });
    const { container } = renderApp();
    expect(await screen.findByText('<img src="x" onerror="window.__pwned = true">')).toBeInTheDocument();
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(window.__pwned).toBeUndefined();
  });

  it('shows the login form when the storage cannot be read', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      renderApp();
      expect(screen.getByRole('form', { name: 'Вход' })).toBeInTheDocument();
      expect(api.fetchDiagrams).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('signs in and shows the list when the storage refuses to save the token', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    try {
      api.login.mockResolvedValue({ data: { token: 'new-token' } });
      renderApp();
      await fillCredentials(user);
      await user.click(screen.getByRole('button', { name: 'Войти' }));
      expect(await screen.findByText('Order processing')).toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });
});
