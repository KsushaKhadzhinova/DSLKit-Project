import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { mockProfile, renderApp } from './testUtils';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchProfile: vi.fn(),
  fetchDiagram: vi.fn(),
  fetchComments: vi.fn(),
  fetchDiagramTags: vi.fn(),
  addComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}));

const diagram = { id: 3, title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> pay', priority: 'high', ownerId: 2, createdAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:00.000Z' };
const comment = (id, authorId, text) => ({ id, diagramId: 3, authorId, text, createdAt: `2026-10-17T10:00:0${id}.000Z`, updatedAt: `2026-10-17T10:00:0${id}.000Z` });
const page = (data, total = data.length) => ({ data, headers: { 'x-total-count': String(total) } });
const serverError = (status, error = 'x', details) => Object.assign(new Error('fail'), { response: { status, data: { error, details } } });
const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};
const open = async () => {
  renderApp('/diagrams/3');
  await screen.findByRole('heading', { level: 1, name: 'Order processing' });
};
const list = () => screen.getByRole('region', { name: /Комментарии/ });
const texts = () => within(list()).queryAllByRole('listitem').map((li) => li.querySelector('.comment__text')?.textContent);

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  localStorage.setItem('token', 'jwt');
  mockProfile({ id: 1, email: 'me@example.test', role: 'user' });
  api.fetchDiagram.mockResolvedValue({ data: diagram });
  api.fetchDiagramTags.mockResolvedValue({ data: [] });
  api.fetchComments.mockResolvedValue(page([comment(1, 1, 'Mine'), comment(2, 2, 'Theirs')]));
});

describe('the comment list', () => {
  it('shows a loading line, then the comments with their authors and the total in the heading', async () => {
    const pending = deferred();
    api.fetchComments.mockReturnValue(pending.promise);
    await open();
    expect(screen.getByText('Загрузка комментариев…')).toBeInTheDocument();
    pending.resolve(page([comment(1, 1, 'Mine'), comment(2, 2, 'Theirs')]));
    expect(await screen.findByText('Mine')).toBeInTheDocument();
    expect(texts()).toEqual(['Mine', 'Theirs']);
    expect(screen.getByRole('heading', { level: 2, name: 'Комментарии (2)' })).toBeInTheDocument();
    expect(screen.getByText('Вы')).toBeInTheDocument();
    expect(screen.getByText('Пользователь №2')).toBeInTheDocument();
  });

  it('shows a message when there are no comments yet', async () => {
    api.fetchComments.mockResolvedValue(page([]));
    await open();
    expect(await screen.findByText('Комментариев пока нет.')).toBeInTheDocument();
  });

  it('markup in a comment is shown as text and is not run', async () => {
    api.fetchComments.mockResolvedValue(page([comment(1, 2, '<img src=x onerror=alert(1)>')]));
    await open();
    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  it('loads the next page on request and does not double a comment', async () => {
    const user = userEvent.setup();
    api.fetchComments.mockResolvedValueOnce(page([comment(1, 1, 'First'), comment(2, 2, 'Second')], 3));
    api.fetchComments.mockResolvedValueOnce(page([comment(2, 2, 'Second'), comment(3, 2, 'Third')], 3));
    await open();
    await screen.findByText('First');
    await user.click(screen.getByRole('button', { name: 'Загрузить ещё' }));
    await screen.findByText('Third');
    expect(texts()).toEqual(['First', 'Second', 'Third']);
    expect(api.fetchComments).toHaveBeenLastCalledWith(3, undefined, { limit: 20, offset: 2 });
    expect(screen.queryByRole('button', { name: 'Загрузить ещё' })).not.toBeInTheDocument();
  });

  it('a failed load shows the message, the three-part help and a working retry', async () => {
    const user = userEvent.setup();
    api.fetchComments.mockRejectedValueOnce(serverError(500, 'Internal server error'));
    await open();
    expect(await screen.findByText('Internal server error')).toBeInTheDocument();
    expect(screen.getByText('Ошибка 500: сбой на сервере')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText('Mine')).toBeInTheDocument();
  });

  it('a failed load of the next page keeps the loaded comments and shows a notice', async () => {
    const user = userEvent.setup();
    api.fetchComments.mockResolvedValueOnce(page([comment(1, 1, 'First')], 2));
    api.fetchComments.mockRejectedValueOnce(serverError(500, 'Internal server error'));
    await open();
    await user.click(await screen.findByRole('button', { name: 'Загрузить ещё' }));
    expect(await screen.findByText(/Не удалось загрузить ещё/)).toBeInTheDocument();
    expect(texts()).toEqual(['First']);
  });
});

describe('adding a comment', () => {
  it('refuses an empty or blank text before any request, and an over-long text is cut by the field', async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText('Mine');
    await user.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(await screen.findByText('Введите комментарий')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Новый комментарий'), '   ');
    await user.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(screen.getByText('Введите комментарий')).toBeInTheDocument();
    expect(api.addComment).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Новый комментарий')).toHaveAttribute('maxLength', '1000');
  });

  it('sends the trimmed text, shows the new comment at the end and clears the field', async () => {
    const user = userEvent.setup();
    api.addComment.mockResolvedValue({ data: comment(3, 1, 'Hello') });
    await open();
    await screen.findByText('Mine');
    await user.type(screen.getByLabelText('Новый комментарий'), '  Hello  ');
    await user.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(await screen.findByText('Hello')).toBeInTheDocument();
    expect(api.addComment).toHaveBeenCalledWith(3, 'Hello');
    expect(texts().at(-1)).toBe('Hello');
    expect(screen.getByLabelText('Новый комментарий')).toHaveValue('');
    expect(screen.getByRole('heading', { level: 2, name: 'Комментарии (3)' })).toBeInTheDocument();
  });

  it('shows the server message and keeps the text when the server refuses', async () => {
    const user = userEvent.setup();
    api.addComment.mockRejectedValue(serverError(400, 'Invalid comment data', [{ field: 'text', message: 'must not contain control characters' }]));
    await open();
    await screen.findByText('Mine');
    await user.type(screen.getByLabelText('Новый комментарий'), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(await screen.findByText(/Не удалось добавить комментарий. Invalid comment data – text: must not contain/)).toBeInTheDocument();
    expect(screen.getByLabelText('Новый комментарий')).toHaveValue('Hello');
    expect(texts()).toEqual(['Mine', 'Theirs']);
  });

  it('ignores a second click while the first request is running', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    api.addComment.mockReturnValue(pending.promise);
    await open();
    await screen.findByText('Mine');
    await user.type(screen.getByLabelText('Новый комментарий'), 'Once');
    await user.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(screen.getByRole('button', { name: 'Отправляем…' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Отправляем…' }));
    pending.resolve({ data: comment(3, 1, 'Once') });
    await screen.findByText('Once');
    expect(api.addComment).toHaveBeenCalledTimes(1);
  });
});

describe('changing and deleting', () => {
  it('a user gets buttons on their own comment only', async () => {
    await open();
    await screen.findByText('Mine');
    expect(screen.getByRole('button', { name: 'Изменить комментарий №1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Удалить комментарий №1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Изменить комментарий №2' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Удалить комментарий №2' })).not.toBeInTheDocument();
  });

  it('an administrator gets the buttons on every comment', async () => {
    mockProfile({ id: 9, email: 'root@example.test', role: 'admin' });
    await open();
    await screen.findByText('Mine');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Удалить комментарий №2' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Изменить комментарий №1' })).toBeInTheDocument();
  });

  it('edits a comment: the new text is shown after the server accepted it, Escape-like cancel restores the old one', async () => {
    const user = userEvent.setup();
    api.updateComment.mockResolvedValue({ data: { ...comment(1, 1, 'Changed'), updatedAt: '2026-10-18T10:00:00.000Z' } });
    await open();
    await screen.findByText('Mine');
    await user.click(screen.getByRole('button', { name: 'Изменить комментарий №1' }));
    await user.clear(screen.getByLabelText('Текст комментария'));
    await user.type(screen.getByLabelText('Текст комментария'), 'Temp');
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.getByText('Mine')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Изменить комментарий №1' }));
    await user.clear(screen.getByLabelText('Текст комментария'));
    await user.type(screen.getByLabelText('Текст комментария'), 'Changed');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Changed')).toBeInTheDocument();
    expect(api.updateComment).toHaveBeenCalledWith(1, 'Changed');
    expect(screen.getByText('изменён')).toBeInTheDocument();
  });

  it('an empty edit is refused on the screen and sends nothing; an unchanged text sends nothing', async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByText('Mine');
    await user.click(screen.getByRole('button', { name: 'Изменить комментарий №1' }));
    await user.clear(screen.getByLabelText('Текст комментария'));
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(screen.getByText('Введите комментарий')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Текст комментария'), 'Mine');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(api.updateComment).not.toHaveBeenCalled();
    expect(screen.getByText('Mine')).toBeInTheDocument();
  });

  it('a refused edit (403) keeps the old text and tells the reason', async () => {
    const user = userEvent.setup();
    api.updateComment.mockRejectedValue(serverError(403, 'Only the author or an admin can change this comment'));
    await open();
    await screen.findByText('Mine');
    await user.click(screen.getByRole('button', { name: 'Изменить комментарий №1' }));
    await user.type(screen.getByLabelText('Текст комментария'), ' more');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText(/Не удалось сохранить комментарий. Only the author/)).toBeInTheDocument();
    expect(screen.getByLabelText('Текст комментария')).toHaveValue('Mine more');
  });

  it('deletes a comment and lowers the total', async () => {
    const user = userEvent.setup();
    api.deleteComment.mockResolvedValue({});
    await open();
    await screen.findByText('Mine');
    await user.click(screen.getByRole('button', { name: 'Удалить комментарий №1' }));
    await waitFor(() => expect(texts()).toEqual(['Theirs']));
    expect(api.deleteComment).toHaveBeenCalledWith(1);
    expect(screen.getByRole('heading', { level: 2, name: 'Комментарии (1)' })).toBeInTheDocument();
  });

  it('a comment that is already gone (404) disappears without an error', async () => {
    const user = userEvent.setup();
    api.deleteComment.mockRejectedValue(serverError(404, 'Comment 1 not found'));
    await open();
    await screen.findByText('Mine');
    await user.click(screen.getByRole('button', { name: 'Удалить комментарий №1' }));
    await waitFor(() => expect(texts()).toEqual(['Theirs']));
    expect(screen.queryByText(/Не удалось удалить/)).not.toBeInTheDocument();
  });

  it('a failed delete keeps the comment and shows a notice that can be closed', async () => {
    const user = userEvent.setup();
    api.deleteComment.mockRejectedValue(serverError(500, 'Internal server error'));
    await open();
    await screen.findByText('Mine');
    await user.click(screen.getByRole('button', { name: 'Удалить комментарий №1' }));
    expect(await screen.findByText(/Не удалось удалить комментарий/)).toBeInTheDocument();
    expect(texts()).toEqual(['Mine', 'Theirs']);
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(screen.queryByText(/Не удалось удалить комментарий/)).not.toBeInTheDocument();
  });

  it('the buttons of a comment are locked while its request runs, so a double click sends one request', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    api.deleteComment.mockReturnValue(pending.promise);
    await open();
    await screen.findByText('Mine');
    await user.click(screen.getByRole('button', { name: 'Удалить комментарий №1' }));
    expect(screen.getByRole('button', { name: 'Удалить комментарий №1' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Удалить комментарий №1' }));
    pending.resolve({});
    await waitFor(() => expect(texts()).toEqual(['Theirs']));
    expect(api.deleteComment).toHaveBeenCalledTimes(1);
  });
});
