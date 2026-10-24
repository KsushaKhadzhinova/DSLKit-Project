import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { validateTag } from './utils/validation';
import { mockProfile, renderApp } from './testUtils';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchProfile: vi.fn(),
  fetchDiagram: vi.fn(),
  fetchDiagrams: vi.fn(),
  fetchComments: vi.fn(),
  fetchDiagramTags: vi.fn(),
  addDiagramTag: vi.fn(),
  removeDiagramTag: vi.fn(),
}));

const diagram = { id: 3, title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> pay', priority: 'high', ownerId: 1, createdAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:00.000Z' };
const tag = (id, name) => ({ id, name, createdAt: '2026-10-17T10:00:00.000Z', updatedAt: '2026-10-17T10:00:00.000Z' });
const serverError = (status, error = 'x', details) => Object.assign(new Error('fail'), { response: { status, data: { error, details } } });
const open = async () => {
  renderApp('/diagrams/3');
  await screen.findByRole('heading', { level: 1, name: 'Order processing' });
};
const section = () => screen.getByRole('region', { name: 'Теги' });
const names = () => within(section()).queryAllByRole('listitem').map((li) => li.querySelector('a')?.textContent);

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  localStorage.setItem('token', 'jwt');
  mockProfile({ id: 1, email: 'me@example.test', role: 'user' });
  api.fetchDiagram.mockResolvedValue({ data: diagram });
  api.fetchComments.mockResolvedValue({ data: [], headers: { 'x-total-count': '0' } });
  api.fetchDiagramTags.mockResolvedValue({ data: [tag(1, 'billing'), tag(2, 'shop')] });
});

describe('the tag check', () => {
  it('accepts short labels and names the problem otherwise', () => {
    expect(validateTag('billing')).toBeNull();
    expect(validateTag(' Сервис 2-го уровня ')).toBeNull();
    expect(validateTag('a'.repeat(30))).toBeNull();
    expect(validateTag('   ')).toBe('Введите тег');
    expect(validateTag('a'.repeat(31))).toBe('Тег не длиннее 30 символов');
    expect(validateTag('-start')).toMatch(/начинается с буквы или цифры/);
    expect(validateTag('<b>')).toMatch(/только буквы/);
  });
});

describe('the tags of a diagram', () => {
  it('shows each tag as a link to the filtered list', async () => {
    await open();
    expect(await screen.findByRole('link', { name: 'billing' })).toHaveAttribute('href', '/diagrams?tag=billing');
    expect(names()).toEqual(['billing', 'shop']);
    expect(api.fetchDiagramTags).toHaveBeenCalledWith(3, expect.anything());
  });

  it('shows a message when there are no tags yet', async () => {
    api.fetchDiagramTags.mockResolvedValue({ data: [] });
    await open();
    expect(await screen.findByText('Тегов пока нет.')).toBeInTheDocument();
  });

  it('a failed load shows the message and a working retry', async () => {
    const user = userEvent.setup();
    api.fetchDiagramTags.mockRejectedValueOnce(serverError(500, 'Internal server error'));
    await open();
    expect(await screen.findByText('Internal server error')).toBeInTheDocument();
    await user.click(within(section()).getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByRole('link', { name: 'billing' })).toBeInTheDocument();
  });

  it('an answer that is not a list is an error, not a crash', async () => {
    api.fetchDiagramTags.mockResolvedValue({ data: '<html>' });
    await open();
    expect(await screen.findByText('Сервер вернул неожиданный ответ. Проверьте адрес сервера')).toBeInTheDocument();
  });

  it('a user who is not the owner sees the tags but no buttons or form', async () => {
    api.fetchDiagram.mockResolvedValue({ data: { ...diagram, ownerId: 2 } });
    await open();
    await screen.findByRole('link', { name: 'billing' });
    expect(screen.queryByRole('button', { name: /Убрать тег/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Новый тег')).not.toBeInTheDocument();
  });

  it('an administrator may change the tags of any diagram', async () => {
    mockProfile({ id: 9, email: 'root@example.test', role: 'admin' });
    api.fetchDiagram.mockResolvedValue({ data: { ...diagram, ownerId: 2 } });
    await open();
    expect(await screen.findByRole('button', { name: 'Убрать тег billing' })).toBeInTheDocument();
    expect(screen.getByLabelText('Новый тег')).toBeInTheDocument();
  });
});

describe('adding and removing a tag', () => {
  it('refuses a blank or bad name before any request', async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByLabelText('Новый тег');
    await user.click(screen.getByRole('button', { name: 'Добавить тег' }));
    expect(await screen.findByText('Введите тег')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Новый тег'), '-oops');
    await user.click(screen.getByRole('button', { name: 'Добавить тег' }));
    expect(screen.getByText(/начинается с буквы или цифры/)).toBeInTheDocument();
    expect(api.addDiagramTag).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Новый тег')).toHaveAttribute('maxLength', '30');
  });

  it('sends the trimmed name, shows the new tag in order and clears the field', async () => {
    const user = userEvent.setup();
    api.addDiagramTag.mockResolvedValue({ data: tag(3, 'archive') });
    await open();
    await user.type(await screen.findByLabelText('Новый тег'), '  archive ');
    await user.click(screen.getByRole('button', { name: 'Добавить тег' }));
    await waitFor(() => expect(names()).toEqual(['archive', 'billing', 'shop']));
    expect(api.addDiagramTag).toHaveBeenCalledWith(3, 'archive');
    expect(screen.getByLabelText('Новый тег')).toHaveValue('');
  });

  it('a tag that is already shown is not listed twice (the server answers 200)', async () => {
    const user = userEvent.setup();
    api.addDiagramTag.mockResolvedValue({ data: tag(1, 'billing') });
    await open();
    await user.type(await screen.findByLabelText('Новый тег'), 'billing');
    await user.click(screen.getByRole('button', { name: 'Добавить тег' }));
    await waitFor(() => expect(screen.getByLabelText('Новый тег')).toHaveValue(''));
    expect(names()).toEqual(['billing', 'shop']);
  });

  it('a refusal of the server is shown as a notice and the text stays in the field', async () => {
    const user = userEvent.setup();
    api.addDiagramTag.mockRejectedValue(serverError(400, 'A diagram can have at most 10 tags'));
    await open();
    await user.type(await screen.findByLabelText('Новый тег'), 'extra');
    await user.click(screen.getByRole('button', { name: 'Добавить тег' }));
    expect(await screen.findByText(/Не удалось добавить тег. A diagram can have at most 10 tags/)).toBeInTheDocument();
    expect(screen.getByLabelText('Новый тег')).toHaveValue('extra');
    await user.click(within(section()).getByRole('button', { name: 'Закрыть' }));
    expect(screen.queryByText(/Не удалось добавить тег/)).not.toBeInTheDocument();
  });

  it('the form is disabled at the limit of ten tags', async () => {
    api.fetchDiagramTags.mockResolvedValue({ data: Array.from({ length: 10 }, (_, i) => tag(i + 1, `tag${i}`)) });
    await open();
    expect(await screen.findByLabelText('Новый тег')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Добавить тег' })).toBeDisabled();
    expect(screen.getByText(/это предел/)).toBeInTheDocument();
  });

  it('removes a tag after the server accepts it', async () => {
    const user = userEvent.setup();
    api.removeDiagramTag.mockResolvedValue({});
    await open();
    await user.click(await screen.findByRole('button', { name: 'Убрать тег billing' }));
    await waitFor(() => expect(names()).toEqual(['shop']));
    expect(api.removeDiagramTag).toHaveBeenCalledWith(3, 1);
  });

  it('a tag that is already gone (404) disappears without an error', async () => {
    const user = userEvent.setup();
    api.removeDiagramTag.mockRejectedValue(serverError(404, 'gone'));
    await open();
    await user.click(await screen.findByRole('button', { name: 'Убрать тег billing' }));
    await waitFor(() => expect(names()).toEqual(['shop']));
    expect(screen.queryByText(/Не удалось убрать тег/)).not.toBeInTheDocument();
  });

  it('another failure keeps the tag and shows a notice', async () => {
    const user = userEvent.setup();
    api.removeDiagramTag.mockRejectedValue(serverError(500, 'Internal server error'));
    await open();
    await user.click(await screen.findByRole('button', { name: 'Убрать тег billing' }));
    expect(await screen.findByText(/Не удалось убрать тег. Internal server error/)).toBeInTheDocument();
    expect(names()).toEqual(['billing', 'shop']);
  });
});

describe('the list filtered by a tag', () => {
  it('asks the server for the tag from the address and offers to show everything', async () => {
    const user = userEvent.setup();
    api.fetchDiagrams.mockResolvedValue({ data: [diagram], headers: { 'x-total-count': '1' } });
    renderApp('/diagrams?tag=billing');
    expect(await screen.findByText('Order processing')).toBeInTheDocument();
    expect(api.fetchDiagrams).toHaveBeenCalledWith('', expect.anything(), { limit: 20, offset: 0, tag: 'billing' });
    expect(screen.getByText(/Тег: billing/)).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Показать все диаграммы' }));
    await waitFor(() => expect(api.fetchDiagrams).toHaveBeenLastCalledWith('', expect.anything(), { limit: 20, offset: 0, tag: undefined }));
    expect(screen.queryByText(/Тег: billing/)).not.toBeInTheDocument();
  });
});
