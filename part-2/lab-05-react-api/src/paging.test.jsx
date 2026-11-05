import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import App from './App';
import limits from './limits.json';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchDiagrams: vi.fn(),
  addDiagram: vi.fn(),
  updateDiagram: vi.fn(),
  deleteDiagram: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));

const record = (id, title = `Diagram ${id}`) => ({
  id,
  title,
  notation: 'UML',
  sourceCode: 'a -> b',
  priority: 'normal',
  createdAt: '2026-10-16T10:00:00.000Z',
});
const page = (from, count) => Array.from({ length: count }, (_, i) => record(from + i));
const reply = (data, total) => ({ data, headers: total === undefined ? {} : { 'x-total-count': String(total) } });
const titles = () =>
  within(screen.getByRole('main'))
    .queryAllByRole('listitem')
    .map((li) => li.querySelector('.card__title').textContent);
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
const serverError = (status, error) => Object.assign(new Error('fail'), { response: { status, data: { error } } });
const SIZE = limits.pageSize;

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('token', 'jwt');
});

describe('load more', () => {
  it('asks for the first page with the limit and shows the counter and the button', async () => {
    api.fetchDiagrams.mockResolvedValue(reply(page(1, SIZE), 45));
    render(<App />);
    expect(await screen.findByText('Diagram 1')).toBeInTheDocument();
    expect(api.fetchDiagrams.mock.calls[0][0]).toBe('');
    expect(api.fetchDiagrams.mock.calls[0][2]).toEqual({ limit: SIZE, offset: 0 });
    expect(screen.getByText(`Показано ${SIZE} из 45`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Загрузить ещё' })).toBeEnabled();
  });

  it('appends the next page from the right offset and hides the button after the last page', async () => {
    const user = userEvent.setup();
    api.fetchDiagrams.mockResolvedValueOnce(reply(page(1, SIZE), 25)).mockResolvedValueOnce(reply(page(SIZE + 1, 5), 25));
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.click(screen.getByRole('button', { name: 'Загрузить ещё' }));
    await screen.findByText(`Diagram ${SIZE + 5}`);
    expect(api.fetchDiagrams.mock.calls[1][2]).toEqual({ limit: SIZE, offset: SIZE });
    expect(titles()).toHaveLength(25);
    expect(screen.getByText('Показано 25 из 25')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Загрузить ещё' })).not.toBeInTheDocument();
  });

  it('sends one request for a double click and disables the button while the page loads', async () => {
    const user = userEvent.setup();
    const next = deferred();
    api.fetchDiagrams.mockResolvedValueOnce(reply(page(1, SIZE), 40)).mockReturnValueOnce(next.promise);
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.dblClick(screen.getByRole('button', { name: 'Загрузить ещё' }));
    expect(api.fetchDiagrams).toHaveBeenCalledTimes(2);
    const busy = screen.getByRole('button', { name: 'Загрузка…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    next.resolve(reply(page(SIZE + 1, SIZE), 40));
    await screen.findByText(`Diagram ${2 * SIZE}`);
    expect(titles()).toHaveLength(2 * SIZE);
  });

  it('keeps the list and offers the button again when a page fails', async () => {
    const user = userEvent.setup();
    api.fetchDiagrams
      .mockResolvedValueOnce(reply(page(1, SIZE), 40))
      .mockRejectedValueOnce(serverError(500, undefined))
      .mockResolvedValueOnce(reply(page(SIZE + 1, SIZE), 40));
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.click(screen.getByRole('button', { name: 'Загрузить ещё' }));
    expect(await screen.findByText(/Не удалось загрузить ещё. Ошибка сервера \(500\)/)).toBeInTheDocument();
    expect(titles()).toHaveLength(SIZE);
    await user.click(screen.getByRole('button', { name: 'Загрузить ещё' }));
    await screen.findByText(`Diagram ${2 * SIZE}`);
    expect(api.fetchDiagrams.mock.calls[2][2]).toEqual({ limit: SIZE, offset: SIZE });
  });

  it('a stale page of the old search does not overwrite the list of the new search', async () => {
    const user = userEvent.setup();
    const stale = deferred();
    api.fetchDiagrams.mockResolvedValueOnce(reply(page(1, SIZE), 40)).mockReturnValueOnce(stale.promise);
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.click(screen.getByRole('button', { name: 'Загрузить ещё' }));
    const staleSignal = api.fetchDiagrams.mock.calls[1][1];
    api.fetchDiagrams.mockResolvedValue(reply([record(99, 'Found one')], 1));
    await user.type(screen.getByLabelText('Поиск по названию'), 'found');
    await waitFor(() => expect(titles()).toEqual(['Found one']));
    expect(staleSignal.aborted).toBe(true);
    stale.resolve(reply(page(SIZE + 1, SIZE), 40));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(titles()).toEqual(['Found one']);
    expect(screen.queryByRole('button', { name: /Загрузить ещё|Загрузка…/ })).not.toBeInTheDocument();
  });

  it('starts again from offset 0 for a new search', async () => {
    const user = userEvent.setup();
    api.fetchDiagrams.mockResolvedValueOnce(reply(page(1, SIZE), 40));
    render(<App />);
    await screen.findByText('Diagram 1');
    api.fetchDiagrams.mockResolvedValue(reply(page(1, SIZE), 30));
    await user.type(screen.getByLabelText('Поиск по названию'), 'd');
    await waitFor(() => expect(api.fetchDiagrams).toHaveBeenCalledTimes(2));
    expect(api.fetchDiagrams.mock.calls[1][0]).toBe('d');
    expect(api.fetchDiagrams.mock.calls[1][2]).toEqual({ limit: SIZE, offset: 0 });
  });

  it('never shows a record twice when the next page contains one that is already on the screen', async () => {
    const user = userEvent.setup();
    api.addDiagram.mockResolvedValue({ data: record(500, 'Mine') });
    api.fetchDiagrams.mockResolvedValueOnce(reply(page(1, SIZE), 40)).mockResolvedValueOnce(reply([...page(SIZE + 1, SIZE - 1), record(500, 'Mine')], 41));
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.type(screen.getByLabelText('Название'), 'Mine');
    await user.type(screen.getByLabelText('Исходный код'), 'a');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    await waitFor(() => expect(screen.getByText(`Показано ${SIZE + 1} из 41`)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Загрузить ещё' }));
    await waitFor(() => expect(titles()).toHaveLength(2 * SIZE));
    expect(titles().filter((title) => title === 'Mine')).toHaveLength(1);
    // The added record did not move the offset: the next page started right after the loaded ones.
    expect(api.fetchDiagrams.mock.calls[1][2].offset).toBe(SIZE);
  });

  it('moves the offset back after a record of the loaded pages is deleted', async () => {
    const user = userEvent.setup();
    api.deleteDiagram.mockResolvedValue({});
    api.fetchDiagrams.mockResolvedValueOnce(reply(page(1, SIZE), 40)).mockResolvedValueOnce(reply(page(SIZE, SIZE), 39));
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.click(screen.getByRole('button', { name: 'Удалить: Diagram 1' }));
    await waitFor(() => expect(screen.getByText(`Показано ${SIZE - 1} из 39`)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Загрузить ещё' }));
    await waitFor(() => expect(api.fetchDiagrams).toHaveBeenCalledTimes(2));
    expect(api.fetchDiagrams.mock.calls[1][2]).toEqual({ limit: SIZE, offset: SIZE - 1 });
  });

  it('puts the counters back when a delete is refused', async () => {
    const user = userEvent.setup();
    api.deleteDiagram.mockRejectedValue(serverError(403, 'Only the owner can delete'));
    api.fetchDiagrams.mockResolvedValue(reply(page(1, SIZE), 40));
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.click(screen.getByRole('button', { name: 'Удалить: Diagram 1' }));
    expect(await screen.findByText(/Only the owner can delete/)).toBeInTheDocument();
    expect(screen.getByText(`Показано ${SIZE} из 40`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Загрузить ещё' }));
    expect(api.fetchDiagrams.mock.calls[1][2].offset).toBe(SIZE);
  });

  it.each([
    ['no header', undefined],
    ['a text header', 'many'],
    ['a negative header', '-5'],
    ['a fractional header', '2.5'],
  ])('shows no button when the server total is unknown (%s)', async (_name, value) => {
    api.fetchDiagrams.mockResolvedValue({ data: page(1, SIZE), headers: value === undefined ? {} : { 'x-total-count': value } });
    render(<App />);
    await screen.findByText('Diagram 1');
    expect(screen.queryByRole('button', { name: 'Загрузить ещё' })).not.toBeInTheDocument();
  });

  it('shows no counter and no button for an empty list', async () => {
    api.fetchDiagrams.mockResolvedValue(reply([], 0));
    render(<App />);
    expect(await screen.findByText('Диаграмм не найдено.')).toBeInTheDocument();
    expect(screen.queryByText(/Показано/)).not.toBeInTheDocument();
  });

  it('shows markup in a title from the server as text', async () => {
    api.fetchDiagrams.mockResolvedValue(reply([record(1, '<img id="x" src=x onerror=alert(1)>')], 1));
    render(<App />);
    expect(await screen.findByText('<img id="x" src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.getElementById('x')).toBeNull();
  });
});

describe('counter while a record is being added', () => {
  it('counts the new record at once and takes it back when the server refuses', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    api.fetchDiagrams.mockResolvedValue(reply(page(1, 3), 3));
    api.addDiagram.mockReturnValueOnce(pending.promise);
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.type(screen.getByLabelText('Название'), 'Fresh');
    await user.type(screen.getByLabelText('Исходный код'), 'a');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByText('Показано 4 из 4')).toBeInTheDocument();
    pending.reject(serverError(400, 'Invalid diagram data'));
    expect(await screen.findByText('Показано 3 из 3')).toBeInTheDocument();
  });
});

describe('progress of edit and delete', () => {
  beforeEach(() => {
    api.fetchDiagrams.mockResolvedValue(reply(page(1, 2), 2));
  });

  it('marks the card and shows the progress line while the PUT is running', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    api.updateDiagram.mockReturnValue(pending.promise);
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.click(screen.getByRole('button', { name: 'Изменить: Diagram 1' }));
    const input = screen.getByLabelText('Новое название');
    await user.clear(input);
    await user.type(input, 'Renamed{Enter}');
    const card = screen.getByText('Renamed').closest('article');
    expect(card).toHaveAttribute('aria-busy', 'true');
    expect(within(card).getByText('Сохраняется…')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Изменить: Renamed' })).toBeDisabled();
    expect(within(card).getByRole('button', { name: 'Удалить: Renamed' })).toBeDisabled();
    expect(screen.getByText('Сохранение на сервере…')).toBeInTheDocument();
    pending.resolve({ data: record(1, 'Renamed') });
    await waitFor(() => expect(screen.queryByText('Сохранение на сервере…')).not.toBeInTheDocument());
    expect(card).not.toHaveAttribute('aria-busy');
    expect(within(card).getByRole('button', { name: 'Изменить: Renamed' })).toBeEnabled();
  });

  it('shows the progress line while the DELETE is running and hides it after the answer', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    api.deleteDiagram.mockReturnValue(pending.promise);
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.click(screen.getByRole('button', { name: 'Удалить: Diagram 1' }));
    expect(screen.getByText('Сохранение на сервере…')).toHaveAttribute('role', 'status');
    pending.resolve({});
    await waitFor(() => expect(screen.queryByText('Сохранение на сервере…')).not.toBeInTheDocument());
  });

  it('removes the progress marks when the PUT fails and brings the old title back', async () => {
    const user = userEvent.setup();
    api.updateDiagram.mockRejectedValue(serverError(500, undefined));
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.click(screen.getByRole('button', { name: 'Изменить: Diagram 1' }));
    const input = screen.getByLabelText('Новое название');
    await user.clear(input);
    await user.type(input, 'Renamed{Enter}');
    expect(await screen.findByText(/Не удалось сохранить изменения/)).toBeInTheDocument();
    expect(titles()).toEqual(['Diagram 1', 'Diagram 2']);
    expect(screen.queryByText('Сохранение на сервере…')).not.toBeInTheDocument();
  });

  it('sends one PUT when the save button is double clicked', async () => {
    const user = userEvent.setup();
    api.updateDiagram.mockReturnValue(deferred().promise);
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.click(screen.getByRole('button', { name: 'Изменить: Diagram 1' }));
    const input = screen.getByLabelText('Новое название');
    await user.clear(input);
    await user.type(input, 'Renamed');
    await user.dblClick(screen.getByRole('button', { name: 'Сохранить: Diagram 1' }));
    expect(api.updateDiagram).toHaveBeenCalledTimes(1);
  });
});

describe('limits in the forms', () => {
  beforeEach(() => {
    api.fetchDiagrams.mockResolvedValue(reply([record(1)], 1));
  });

  it('has maxLength on the title of the new diagram and of the edit field', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Diagram 1');
    expect(screen.getByLabelText('Название')).toHaveAttribute('maxlength', String(limits.title.maxLength));
    await user.click(screen.getByRole('button', { name: 'Изменить: Diagram 1' }));
    expect(screen.getByLabelText('Новое название')).toHaveAttribute('maxlength', String(limits.title.maxLength));
  });

  it('cuts a pasted title at the limit', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.click(screen.getByLabelText('Название'));
    await user.paste('t'.repeat(500));
    expect(screen.getByLabelText('Название').value).toHaveLength(limits.title.maxLength);
  });

  it('uses a multi-line field for the source code with a limit and a counter', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Diagram 1');
    const code = screen.getByLabelText('Исходный код');
    expect(code.tagName).toBe('TEXTAREA');
    expect(code).toHaveAttribute('maxlength', String(limits.sourceCode.maxLength));
    await user.click(code);
    await user.type(code, 'a{Enter}b');
    expect(code.value).toBe('a\nb');
    expect(screen.getByText(`3 / ${limits.sourceCode.maxLength}`)).toBeInTheDocument();
  });

  it('refuses a source code above the limit even when it is forced past maxLength', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.type(screen.getByLabelText('Название'), 'Big');
    fireEvent.change(screen.getByLabelText('Исходный код'), { target: { value: 'z'.repeat(limits.sourceCode.maxLength + 1) } });
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByText(`Исходный код не длиннее ${limits.sourceCode.maxLength} символов`)).toBeInTheDocument();
    expect(api.addDiagram).not.toHaveBeenCalled();
  });

  it('does not hang on a huge pasted code and still refuses a whitespace-only one', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Diagram 1');
    const code = screen.getByLabelText('Исходный код');
    await user.click(code);
    await user.paste('q'.repeat(1_000_000));
    expect(code.value).toHaveLength(limits.sourceCode.maxLength);
    fireEvent.change(code, { target: { value: ' \n\t ' } });
    await user.type(screen.getByLabelText('Название'), 'Space');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByText('Введите исходный код')).toBeInTheDocument();
  });

  it('keeps a multi-line source code as typed when it is sent', async () => {
    const user = userEvent.setup();
    api.addDiagram.mockResolvedValue({ data: record(2, 'Multi') });
    render(<App />);
    await screen.findByText('Diagram 1');
    await user.type(screen.getByLabelText('Название'), 'Multi');
    await user.type(screen.getByLabelText('Исходный код'), 'a -> b{Enter}b -> c');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(api.addDiagram).toHaveBeenCalledWith({ title: 'Multi', notation: 'UML', sourceCode: 'a -> b\nb -> c', priority: 'normal' });
  });
});
