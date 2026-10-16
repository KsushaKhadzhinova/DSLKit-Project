import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { FAVORITES_KEY, favoritesReducer } from './context/FavoritesContext';

const at = '2026-10-16T10:00:00.000Z';
const item = (id) => ({ id, addedAt: at });

describe('favoritesReducer', () => {
  it('adds without duplicates, removes, toggles and clears', () => {
    expect(favoritesReducer([], { type: 'ADD', id: 1, addedAt: at })).toEqual([item(1)]);
    expect(favoritesReducer([item(1)], { type: 'ADD', id: 1, addedAt: at })).toEqual([item(1)]);
    expect(favoritesReducer([item(1), item(2)], { type: 'REMOVE', id: 1 })).toEqual([item(2)]);
    expect(favoritesReducer([item(1)], { type: 'TOGGLE', id: 2, addedAt: at })).toEqual([item(1), item(2)]);
    expect(favoritesReducer([item(1), item(2)], { type: 'TOGGLE', id: 2 })).toEqual([item(1)]);
    expect(favoritesReducer([item(1), item(2)], { type: 'CLEAR' })).toEqual([]);
  });

  it('ignores unknown actions and does not mutate the state', () => {
    const state = [item(1)];
    expect(favoritesReducer(state, { type: 'UNKNOWN' })).toBe(state);
    favoritesReducer(state, { type: 'ADD', id: 2, addedAt: at });
    expect(state).toEqual([item(1)]);
  });
});

describe('theme and language contexts', () => {
  it('toggles the theme for the whole page', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('light');
    await user.click(screen.getByRole('button', { name: /Тема: Светлая/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: /Тема: Тёмная/ })).toBeInTheDocument();
  });

  it('switches the language in components that never receive it as a prop', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Шаблоны диаграмм' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Язык: RU/ }));
    expect(screen.getByRole('heading', { name: 'Diagram templates' })).toBeInTheDocument();
    expect(screen.getByText('Order approval process')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('favorites through useReducer and Context', () => {
  it('adds and removes a template, shared between the list and the panel', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('Пока ничего не выбрано.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'В избранное: Процесс согласования заказа' }));
    const panel = screen.getByRole('region', { name: /Избранное/ });
    expect(within(panel).getByText(/Процесс согласования заказа/)).toBeInTheDocument();
    expect(within(panel).getByText('Выбрано: 1')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)).map((i) => i.id)).toEqual([2]);
    expect(within(panel).getByText(/Добавлено: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Убрать: Процесс согласования заказа' }));
    expect(screen.getByText('Пока ничего не выбрано.')).toBeInTheDocument();
  });

  it('clears all favorites', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'В избранное: Поток данных заявки' }));
    await user.click(screen.getByRole('button', { name: 'В избранное: Модель данных интернет-магазина' }));
    await user.click(screen.getByRole('button', { name: 'Очистить' }));
    expect(screen.getByText('Выбрано: 0')).toBeInTheDocument();
  });

  it('restores favorites after a reload', () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([item(1)]));
    render(<App />);
    const toggle = screen.getAllByRole('button', { name: 'Убрать: Диаграмма последовательности входа' }).find((b) => b.hasAttribute('aria-pressed'));
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('falls back to an empty list for broken or wrong stored data', () => {
    localStorage.setItem(FAVORITES_KEY, '{broken');
    render(<App />);
    expect(screen.getByText('Выбрано: 0')).toBeInTheDocument();
  });

  it('keeps working when storage rejects writes', async () => {
    const user = userEvent.setup();
    localStorage.setItem(FAVORITES_KEY, JSON.stringify({ not: 'array' }));
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'В избранное: Поток данных заявки' }));
    expect(screen.getByText('Выбрано: 1')).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('prop drilling demo', () => {
  it('renders the user name initial through four nested levels', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: 'Демонстрация prop drilling' })).toHaveTextContent('К');
  });
});

describe('creation time and error page', () => {
  it('shows a creation time for every template in the list', () => {
    render(<App />);
    expect(screen.getAllByText(/Создан: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)).toHaveLength(5);
  });

  it('falls back to an empty list when stored items have the old shape', () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([1, 2]));
    render(<App />);
    expect(screen.getByText('Выбрано: 0')).toBeInTheDocument();
  });

  it('shows the styled error page instead of a blank screen', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
      throw new Error('boom');
    };
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('500');
    spy.mockRestore();
  });
});
