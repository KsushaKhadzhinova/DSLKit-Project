import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App, { STORAGE_KEY } from './App';
import { INITIAL_DIAGRAMS } from './data/initialDiagrams';

const titles = () => screen.queryAllByRole('listitem').map((li) => li.querySelector('.item__title')?.textContent);
const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY));

describe('App', () => {
  it('shows the initial diagrams and stores them when storage is empty', () => {
    render(<App />);
    expect(screen.getAllByRole('listitem')).toHaveLength(INITIAL_DIAGRAMS.length);
    expect(stored()).toHaveLength(INITIAL_DIAGRAMS.length);
  });

  it('adds a diagram with the form, also by Enter, and ignores an empty title', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);

    await user.type(screen.getByLabelText(/Название диаграммы/), 'Схема оплаты{Enter}');
    expect(titles()).toContain('Схема оплаты');
    expect(screen.getByLabelText(/Название диаграммы/)).toHaveValue('');
    expect(stored().some((d) => d.title === 'Схема оплаты' && d.published === false)).toBe(true);
    expect(document.title).toBe('DSLKit: диаграмм 4');
  });

  it('deletes a diagram', async () => {
    const user = userEvent.setup();
    render(<App />);
    const row = screen.getByText('Схема авторизации').closest('li');
    await user.click(within(row).getByRole('button', { name: /^Удалить/ }));
    expect(titles()).not.toContain('Схема авторизации');
    expect(stored()).toHaveLength(2);
  });

  it('renames a diagram, saves by Enter and cancels by Escape', async () => {
    const user = userEvent.setup();
    render(<App />);
    let row = screen.getByText('Схема авторизации').closest('li');
    await user.click(within(row).getByRole('button', { name: /^Изменить/ }));
    const input = screen.getByLabelText('Новое название');
    await user.clear(input);
    await user.type(input, 'Вход в систему{Enter}');
    expect(titles()).toContain('Вход в систему');

    row = screen.getByText('Вход в систему').closest('li');
    await user.click(within(row).getByRole('button', { name: /^Изменить/ }));
    await user.type(screen.getByLabelText('Новое название'), ' лишнее{Escape}');
    expect(titles()).toContain('Вход в систему');

    await user.click(within(row).getByRole('button', { name: /^Изменить/ }));
    await user.clear(screen.getByLabelText('Новое название'));
    await user.click(screen.getByRole('button', { name: /^Сохранить/ }));
    expect(screen.getByText('Введите название диаграммы')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Новое название'), '{Escape}');
    expect(titles()).toContain('Вход в систему');
  });

  it('toggles the published status and updates the stats', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText(/Всего:/)).toHaveTextContent('Опубликовано: 2 · Черновики: 1');
    const row = screen.getByText('Процесс согласования заказа').closest('li');
    const toggle = within(row).getByRole('button', { name: /^Черновик/ });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(within(row).getByRole('button', { name: /^Опубликована/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Всего:/)).toHaveTextContent('Опубликовано: 3 · Черновики: 0');
  });

  it('filters by text and status and shows an empty state', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Поиск'), 'модель');
    expect(titles()).toEqual(['Модель данных проекта']);

    await user.selectOptions(screen.getByLabelText('Статус'), 'draft');
    expect(screen.getByText('Диаграммы не найдены.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Поиск'));
    expect(titles()).toEqual(['Процесс согласования заказа']);
  });

  it('sorts by title', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(titles()[0]).toBe('Процесс согласования заказа');
    await user.selectOptions(screen.getByLabelText('Сортировка'), 'title');
    expect(titles()).toEqual(['Модель данных проекта', 'Процесс согласования заказа', 'Схема авторизации']);
  });

  it('falls back to the initial data when the stored value is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ broken: true }));
    render(<App />);
    expect(screen.getAllByRole('listitem')).toHaveLength(INITIAL_DIAGRAMS.length);
  });

  it('keeps working when localStorage rejects writes', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    render(<App />);
    await user.type(screen.getByLabelText(/Название диаграммы/), 'В памяти{Enter}');
    expect(titles()).toContain('В памяти');
    spy.mockRestore();
  });

  it('gives each new diagram a unique id', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/Название диаграммы/), 'Первая{Enter}');
    await user.type(screen.getByLabelText(/Название диаграммы/), 'Вторая{Enter}');
    expect(new Set(stored().map((d) => d.id)).size).toBe(5);
  });

  it('restores the saved list after a reload', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.type(screen.getByLabelText(/Название диаграммы/), 'Сохранённая{Enter}');
    first.unmount();

    render(<App />);
    expect(titles()).toContain('Сохранённая');
  });
});
