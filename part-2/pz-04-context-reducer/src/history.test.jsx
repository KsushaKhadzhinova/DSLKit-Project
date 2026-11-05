import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { FAVORITES_KEY, favoritesReducer, withHistory } from './context/FavoritesContext';

const start = (present = []) => ({ past: [], present, future: [] });
const reducer = withHistory(favoritesReducer, 3);

describe('undo and redo around the reducer', () => {
  it('keeps the old value on a change and brings it back with UNDO and REDO', () => {
    const added = reducer(start(), { type: 'ADD', id: 1 });
    expect(added.present).toEqual([{ id: 1, qty: 1 }]);
    expect(added.past).toEqual([[]]);
    const undone = reducer(added, { type: 'UNDO' });
    expect(undone.present).toEqual([]);
    expect(undone.future).toEqual([[{ id: 1, qty: 1 }]]);
    expect(reducer(undone, { type: 'REDO' }).present).toEqual([{ id: 1, qty: 1 }]);
  });

  it('a new change drops the redo steps', () => {
    const undone = reducer(reducer(start(), { type: 'ADD', id: 1 }), { type: 'UNDO' });
    const changed = reducer(undone, { type: 'ADD', id: 2 });
    expect(changed.future).toEqual([]);
    expect(changed.present).toEqual([{ id: 2, qty: 1 }]);
  });

  it('an action that changes nothing leaves no step, and undo or redo without a step does nothing', () => {
    const state = reducer(start(), { type: 'ADD', id: 1 });
    expect(reducer(state, { type: 'ADD', id: 1 })).toBe(state);
    expect(reducer(state, { type: 'UNKNOWN' })).toBe(state);
    expect(reducer(state, { type: 'REDO' })).toBe(state);
    expect(reducer(start(), { type: 'UNDO' })).toEqual(start());
  });

  it('keeps only the latest steps up to the limit', () => {
    let state = start();
    for (const id of [1, 2, 3, 4, 5]) state = reducer(state, { type: 'ADD', id });
    expect(state.past).toHaveLength(3);
    expect(reducer(reducer(reducer(state, { type: 'UNDO' }), { type: 'UNDO' }), { type: 'UNDO' }).present).toHaveLength(2);
  });
});

describe('undo and redo on the page', () => {
  it('brings the favorites back after Clear and saves the restored list', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'В избранное: Поток данных заявки' }));
    const panel = within(screen.getByRole('region', { name: /Избранное/ }));
    expect(panel.getByRole('button', { name: 'Отменить' })).toBeEnabled();
    expect(panel.getByRole('button', { name: 'Вернуть' })).toBeDisabled();
    await user.click(panel.getByRole('button', { name: 'Очистить' }));
    expect(panel.getByText('Пока ничего не выбрано.')).toBeInTheDocument();
    await user.click(panel.getByRole('button', { name: 'Отменить' }));
    expect(panel.getByLabelText('Количество: Поток данных заявки')).toHaveTextContent('1');
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY))).toEqual([{ id: 4, qty: 1 }]);
    await user.click(panel.getByRole('button', { name: 'Вернуть' }));
    expect(panel.getByText('Пока ничего не выбрано.')).toBeInTheDocument();
  });

  it('starts with both buttons disabled', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Отменить' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Вернуть' })).toBeDisabled();
  });
});
