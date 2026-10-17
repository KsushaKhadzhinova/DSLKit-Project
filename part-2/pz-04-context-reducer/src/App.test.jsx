import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import PropDrilling from './components/PropDrilling';
import { FAVORITES_KEY, favoritesReducer, sanitizeFavorites } from './context/FavoritesContext';
import { LANGUAGE_KEY, LanguageProvider, readLanguage, useLanguage } from './context/LanguageContext';
import { THEME_KEY, readTheme } from './context/ThemeContext';
import ErrorBoundary from './shell/ErrorBoundary';

describe('favoritesReducer', () => {
  it('adds without duplicates, removes, toggles and clears', () => {
    expect(favoritesReducer([], { type: 'ADD', id: 1 })).toEqual([1]);
    expect(favoritesReducer([1], { type: 'ADD', id: 1 })).toEqual([1]);
    expect(favoritesReducer([1, 2], { type: 'REMOVE', id: 1 })).toEqual([2]);
    expect(favoritesReducer([1], { type: 'TOGGLE', id: 2 })).toEqual([1, 2]);
    expect(favoritesReducer([1, 2], { type: 'TOGGLE', id: 2 })).toEqual([1]);
    expect(favoritesReducer([1, 2], { type: 'CLEAR' })).toEqual([]);
  });

  it('ignores unknown actions and does not mutate the state', () => {
    const state = [1];
    expect(favoritesReducer(state, { type: 'UNKNOWN' })).toBe(state);
    favoritesReducer(state, { type: 'ADD', id: 2 });
    expect(state).toEqual([1]);
  });
});

describe('theme and language contexts', () => {
  it('toggles the theme for the whole page with the moon and sun checkbox', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('light');
    const toggle = screen.getByRole('checkbox', { name: 'Тёмная тема' });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(toggle).toBeChecked();
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  it('switches the language in components that never receive it as a prop', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Шаблоны диаграмм' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Язык: RU/ }));
    expect(screen.getByRole('heading', { name: 'Diagram templates' })).toBeInTheDocument();
    expect(screen.getByText('Order approval process')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Dark theme' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to the main content' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en');
  });

  it('remembers the language and ignores an unknown stored code', () => {
    localStorage.setItem(LANGUAGE_KEY, 'en');
    expect(readLanguage()).toBe('en');
    localStorage.setItem(LANGUAGE_KEY, '__proto__');
    expect(readLanguage()).toBe('ru');
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readLanguage()).toBe('ru');
    expect(readTheme()).toBe('light');
    spy.mockRestore();
  });

  it('falls back to the Russian text and then to the key for a missing translation', () => {
    const Probe = () => <p>{useLanguage().t('no-such-key')}</p>;
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByText('no-such-key')).toBeInTheDocument();
  });

  it('starts from the saved theme and the system preference, ignoring junk', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    expect(readTheme()).toBe('dark');
    localStorage.setItem(THEME_KEY, '<script>');
    expect(readTheme()).toBe('light');
    localStorage.clear();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(readTheme()).toBe('dark');
    vi.unstubAllGlobals();
  });
});

describe('favorites through useReducer and Context', () => {
  it('adds and removes a template, shared between the list and the panel', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('Пока ничего не выбрано.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'В избранное: Процесс согласования заказа' }));
    const panel = screen.getByRole('region', { name: /Избранное/ });
    expect(within(panel).getByText('Процесс согласования заказа')).toBeInTheDocument();
    expect(within(panel).getByText('Выбрано: 1')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY))).toEqual([2]);

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
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([1]));
    render(<App />);
    const toggle = screen.getAllByRole('button', { name: 'Убрать: Диаграмма последовательности входа' }).find((b) => b.hasAttribute('aria-pressed'));
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('falls back to an empty list for broken or wrong stored data', () => {
    localStorage.setItem(FAVORITES_KEY, '{broken');
    render(<App />);
    expect(screen.getByText('Выбрано: 0')).toBeInTheDocument();
  });

  it('keeps only known ids, once each, from the stored list', () => {
    expect(sanitizeFavorites([2, 2, 99, '1', null, { $ne: 1 }, 3])).toEqual([2, 3]);
    expect(sanitizeFavorites({ not: 'array' })).toEqual([]);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([99, 'x', 4, 4]));
    render(<App />);
    expect(screen.getByText('Выбрано: 1')).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /Язык: RU/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    spy.mockRestore();
  });
});

describe('prop drilling demo', () => {
  it('renders the user name initial through four nested levels', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: 'Демонстрация prop drilling' })).toHaveTextContent('К');
  });

  it('shows a placeholder for an empty name instead of failing', () => {
    render(
      <LanguageProvider>
        <PropDrilling userName="   " />
      </LanguageProvider>,
    );
    expect(screen.getByRole('region', { name: 'Демонстрация prop drilling' })).toHaveTextContent('?');
  });

  it('shows markup in a name as text', () => {
    render(
      <LanguageProvider>
        <PropDrilling userName="<b id=x>Z</b>" />
      </LanguageProvider>,
    );
    expect(document.getElementById('x')).toBeNull();
    expect(screen.getByRole('region')).toHaveTextContent('<');
  });
});

describe('page frame of the Part 1 site', () => {
  it('has a skip link, one h1, the footer and one set of section links in the header', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'Перейти к основному содержимому' })).toHaveAttribute('href', '#main');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    const menu = within(screen.getByRole('navigation', { name: 'Основная навигация' }));
    expect(menu.getAllByRole('link')).toHaveLength(3);
  });

  it('closes the phone menu after a link click', async () => {
    const user = userEvent.setup();
    render(<App />);
    const burger = screen.getByRole('checkbox', { name: 'Меню' });
    await user.click(burger);
    expect(burger).toBeChecked();
    await user.click(within(screen.getByRole('navigation', { name: 'Основная навигация' })).getByRole('link', { name: 'Избранное' }));
    expect(burger).not.toBeChecked();
  });

  it('shows the styled 500 page when a component throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
      throw new Error('boom');
    };
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 500');
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    spy.mockRestore();
  });
});
