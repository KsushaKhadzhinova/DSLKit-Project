import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { memo, useState } from 'react';
import App from './App';
import PropDrilling, { useUser } from './components/PropDrilling';
import {
  FAVORITES_KEY,
  FavoritesProvider,
  MAX_QTY,
  clampQty,
  favoritesReducer,
  sanitizeFavorites,
  useFavorites,
  useFavoritesDispatch,
} from './context/FavoritesContext';
import { LanguageProvider } from './context/LanguageContext';

const item = (id, qty) => ({ id, qty });

describe('quantity in the reducer', () => {
  it('increments and decrements one item and leaves the others untouched', () => {
    const state = [item(1, 2), item(2, 5)];
    expect(favoritesReducer(state, { type: 'INCREMENT', id: 1 })).toEqual([item(1, 3), item(2, 5)]);
    expect(favoritesReducer(state, { type: 'DECREMENT', id: 2 })).toEqual([item(1, 2), item(2, 4)]);
  });

  it('never goes below 1 or above the limit from limits.json', () => {
    expect(favoritesReducer([item(1, 1)], { type: 'DECREMENT', id: 1 })).toEqual([item(1, 1)]);
    expect(favoritesReducer([item(1, MAX_QTY)], { type: 'INCREMENT', id: 1 })).toEqual([item(1, MAX_QTY)]);
  });

  it('sets the quantity directly and clamps huge, negative, fractional and junk values', () => {
    const set = (qty) => favoritesReducer([item(1, 2)], { type: 'SET_QTY', id: 1, qty })[0].qty;
    expect(set(7)).toBe(7);
    expect(set(1e9)).toBe(MAX_QTY);
    expect(set(-5)).toBe(1);
    expect(set(0)).toBe(1);
    expect(set(3.9)).toBe(3);
    expect(set('abc')).toBe(1);
    expect(set(undefined)).toBe(1);
    expect(set(Infinity)).toBe(1);
    expect(clampQty('4')).toBe(4);
  });

  it('ignores a quantity change for an id that is not in the list', () => {
    const state = [item(1, 2)];
    expect(favoritesReducer(state, { type: 'INCREMENT', id: 99 })).toEqual(state);
  });
});

describe('quantity in the stored data', () => {
  it('accepts the old format with plain ids as quantity 1', () => {
    expect(sanitizeFavorites([1, 3])).toEqual([item(1, 1), item(3, 1)]);
  });

  it('repairs a broken quantity and drops duplicates and unknown ids', () => {
    const stored = [{ id: 1, qty: 1e12 }, { id: 1, qty: 5 }, { id: 2, qty: -3 }, { id: 3, qty: 'x' }, { id: 4 }, { id: 99, qty: 2 }, [5], null];
    expect(sanitizeFavorites(stored)).toEqual([item(1, MAX_QTY), item(2, 1), item(3, 1), item(4, 1)]);
  });

  it('survives broken JSON and a stored object instead of a list', () => {
    localStorage.setItem(FAVORITES_KEY, '{"id":1}');
    render(<App />);
    expect(screen.getByText('Выбрано: 0')).toBeInTheDocument();
  });

  it('restores the quantity after a reload', () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([{ id: 2, qty: 4 }]));
    render(<App />);
    expect(screen.getByLabelText('Количество: Процесс согласования заказа')).toHaveTextContent('4');
  });
});

describe('quantity on the page', () => {
  const favorite = async (user, name) => {
    await user.click(screen.getByRole('button', { name: `В избранное: ${name}` }));
    return within(screen.getByRole('region', { name: /Избранное/ }));
  };

  it('changes the quantity with plus and minus and saves it', async () => {
    const user = userEvent.setup();
    render(<App />);
    const panel = await favorite(user, 'Поток данных заявки');
    expect(panel.getByLabelText('Количество: Поток данных заявки')).toHaveTextContent('1');
    expect(panel.getByRole('button', { name: 'Уменьшить количество: Поток данных заявки' })).toBeDisabled();
    await user.click(panel.getByRole('button', { name: 'Увеличить количество: Поток данных заявки' }));
    await user.click(panel.getByRole('button', { name: 'Увеличить количество: Поток данных заявки' }));
    expect(panel.getByLabelText('Количество: Поток данных заявки')).toHaveTextContent('3');
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY))).toEqual([item(4, 3)]);
    await user.click(panel.getByRole('button', { name: 'Уменьшить количество: Поток данных заявки' }));
    expect(panel.getByLabelText('Количество: Поток данных заявки')).toHaveTextContent('2');
  });

  it('a double click on plus adds exactly two, a double click on remove removes once without an error', async () => {
    const user = userEvent.setup();
    render(<App />);
    const panel = await favorite(user, 'Поток данных заявки');
    await user.dblClick(panel.getByRole('button', { name: 'Увеличить количество: Поток данных заявки' }));
    expect(panel.getByLabelText('Количество: Поток данных заявки')).toHaveTextContent('3');
    await user.dblClick(panel.getByRole('button', { name: 'Убрать: Поток данных заявки' }));
    expect(screen.getByText('Выбрано: 0')).toBeInTheDocument();
  });

  it('disables plus at the limit and keeps the value there', async () => {
    const user = userEvent.setup();
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([item(1, MAX_QTY - 1)]));
    render(<App />);
    const plus = screen.getByRole('button', { name: 'Увеличить количество: Диаграмма последовательности входа' });
    await user.click(plus);
    expect(plus).toBeDisabled();
    await user.click(plus);
    expect(screen.getByLabelText('Количество: Диаграмма последовательности входа')).toHaveTextContent(String(MAX_QTY));
  });

  it('keeps the quantity when storage rejects writes', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    render(<App />);
    const panel = await favorite(user, 'Поток данных заявки');
    await user.click(panel.getByRole('button', { name: 'Увеличить количество: Поток данных заявки' }));
    expect(panel.getByLabelText('Количество: Поток данных заявки')).toHaveTextContent('2');
    spy.mockRestore();
  });

  it('labels the buttons in English', async () => {
    const user = userEvent.setup();
    render(<App />);
    await favorite(user, 'Поток данных заявки');
    await user.click(screen.getByRole('button', { name: /Язык: RU/ }));
    expect(screen.getByRole('button', { name: 'Increase quantity: Request data flow' })).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity: Request data flow')).toHaveTextContent('1');
  });
});

describe('two contexts: data and dispatch', () => {
  it('does not re-render a component that only uses dispatch when the data changes', async () => {
    const user = userEvent.setup();
    let dispatchRenders = 0;
    let stateRenders = 0;
    const DispatchOnly = memo(function DispatchOnly() {
      dispatchRenders += 1;
      const dispatch = useFavoritesDispatch();
      return (
        <button type="button" onClick={() => dispatch({ type: 'INCREMENT', id: 1 })}>
          plus
        </button>
      );
    });
    function StateReader() {
      stateRenders += 1;
      return <p data-testid="qty">{useFavorites()[0].qty}</p>;
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([item(1, 1)]));
    render(
      <FavoritesProvider>
        <DispatchOnly />
        <StateReader />
      </FavoritesProvider>,
    );
    expect(dispatchRenders).toBe(1);
    await user.click(screen.getByRole('button', { name: 'plus' }));
    await user.click(screen.getByRole('button', { name: 'plus' }));
    expect(screen.getByTestId('qty')).toHaveTextContent('3');
    expect(stateRenders).toBe(3);
    expect(dispatchRenders).toBe(1);
  });

  it('gives the same dispatch function after every state change', async () => {
    const user = userEvent.setup();
    const seen = [];
    function Probe() {
      seen.push(useFavoritesDispatch());
      const [, force] = useState(0);
      return (
        <button type="button" onClick={() => force((n) => n + 1)}>
          again
        </button>
      );
    }
    render(
      <FavoritesProvider>
        <Probe />
      </FavoritesProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'again' }));
    expect(seen.length).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(1);
  });
});

describe('prop drilling: the problem next to the solution', () => {
  const renderDrilling = (name) =>
    render(
      <LanguageProvider>
        <PropDrilling userName={name} />
      </LanguageProvider>,
    );

  it('shows both blocks with the same initial', () => {
    renderDrilling('Ксения');
    const region = screen.getByRole('region', { name: 'Демонстрация prop drilling' });
    expect(within(region).getByRole('heading', { name: /Проблема/ })).toBeInTheDocument();
    expect(within(region).getByRole('heading', { name: /Решение/ })).toBeInTheDocument();
    expect(region.querySelectorAll('.badge')).toHaveLength(2);
    expect([...region.querySelectorAll('.badge')].map((node) => node.textContent)).toEqual(['К', 'К']);
  });

  it('the context avatar shows a placeholder for an empty name and the markup as text', () => {
    renderDrilling('   ');
    expect([...document.querySelectorAll('.badge')].map((node) => node.textContent)).toEqual(['?', '?']);
  });

  it('does not turn markup in the name into elements in the context block', () => {
    renderDrilling('<img id=x src=x>');
    expect(document.getElementById('x')).toBeNull();
    expect([...document.querySelectorAll('.badge')].map((node) => node.textContent)).toEqual(['<', '<']);
  });

  it('useUser gives an empty name outside the provider', () => {
    const Probe = () => <p data-testid="name">[{useUser()}]</p>;
    render(<Probe />);
    expect(screen.getByTestId('name')).toHaveTextContent('[]');
  });
});
