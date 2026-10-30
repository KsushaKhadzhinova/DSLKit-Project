import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import PropDrilling from './components/PropDrilling';
import { FAVORITES_KEY, MAX_QTY, favoritesReducer, sanitizeFavorites, useFavorites, useFavoritesDispatch } from './context/FavoritesContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { THEME_KEY, ThemeProvider, readTheme, useTheme } from './context/ThemeContext';

const item = (id, qty) => ({ id, qty });

describe('reducer fed with wrong actions and states', () => {
  it('answers the same state for a missing action instead of throwing', () => {
    const state = [item(1, 2)];
    expect(favoritesReducer(state, undefined)).toBe(state);
  });

  it('starts from an empty list when the state is null', () => {
    expect(favoritesReducer(null, { type: 'ADD', id: 1 })).toEqual([item(1, 1)]);
  });

  it('ignores ADD without an id', () => {
    const state = [item(1, 1)];
    expect(favoritesReducer(state, { type: 'ADD' })).toEqual(state);
  });

  it('ignores an id of the wrong type, like the string "1"', () => {
    const state = [item(1, 1)];
    expect(favoritesReducer(state, { type: 'ADD', id: '1' })).toEqual(state);
  });

  it('ignores ADD for an id that is not a template', () => {
    const state = [item(1, 1)];
    expect(favoritesReducer(state, { type: 'ADD', id: 99 })).toEqual(state);
  });

  it('leaves the list the same when removing an item that is not there', () => {
    const state = [item(1, 2)];
    expect(favoritesReducer(state, { type: 'REMOVE', id: 5 })).toEqual(state);
  });

  it('keeps one entry when the same item is added twice in a row', () => {
    const result = [{ type: 'ADD', id: 2 }, { type: 'ADD', id: 2 }].reduce(favoritesReducer, []);
    expect(result).toEqual([item(2, 1)]);
  });

  it('turns a NaN quantity into 1', () => {
    expect(favoritesReducer([item(1, 2)], { type: 'SET_QTY', id: 1, qty: NaN })).toEqual([item(1, 1)]);
  });

  it('clamps 2147483648 and Number.MAX_SAFE_INTEGER + 1 to the limit', () => {
    const set = (qty) => favoritesReducer([item(1, 2)], { type: 'SET_QTY', id: 1, qty });
    expect(set(2147483648)).toEqual([item(1, MAX_QTY)]);
    expect(set(Number.MAX_SAFE_INTEGER + 1)).toEqual([item(1, MAX_QTY)]);
  });

  it('reads a quantity written as "1e3" in storage as the limit', () => {
    expect(sanitizeFavorites([{ id: 2, qty: '1e3' }])).toEqual([item(2, MAX_QTY)]);
  });
});

describe('user actions and damaged storage on the page', () => {
  it('keeps the counter and the storage in step after a double click on add', async () => {
    const user = userEvent.setup();
    render(<App />);
    const add = screen.getByRole('button', { name: 'В избранное: Поток данных заявки' });
    await user.dblClick(add);
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY));
    expect(screen.getByText(`Выбрано: ${stored.length}`)).toBeInTheDocument();
    expect(add).toHaveAttribute('aria-pressed', String(stored.length === 1));
  });

  it('shows only the first letter of a 100000-character name without failing', () => {
    render(
      <LanguageProvider>
        <PropDrilling userName={'a'.repeat(100000)} />
      </LanguageProvider>,
    );
    expect([...document.querySelectorAll('.badge')].map((node) => node.textContent)).toEqual(['A', 'A']);
  });

  it('shows a tab and newline name as the placeholder', () => {
    render(
      <LanguageProvider>
        <PropDrilling userName={'\t\n '} />
      </LanguageProvider>,
    );
    expect([...document.querySelectorAll('.badge')].map((node) => node.textContent)).toEqual(['?', '?']);
  });

  it('runs no script from a name with script and onerror markup', () => {
    window.__pwned = false;
    render(
      <LanguageProvider>
        <PropDrilling userName={'<img src=x onerror="window.__pwned=true"><script>window.__pwned=true</script>'} />
      </LanguageProvider>,
    );
    expect(window.__pwned).toBe(false);
    expect(document.querySelector('img[src="x"]')).toBeNull();
    delete window.__pwned;
  });

  it('renders the page with no favorites when reading storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    render(<App />);
    expect(screen.getByText('Выбрано: 0')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('treats the literal null in storage as an empty list', () => {
    localStorage.setItem(FAVORITES_KEY, 'null');
    render(<App />);
    expect(screen.getByText('Выбрано: 0')).toBeInTheDocument();
  });

  it('ignores an array stored as the theme', () => {
    localStorage.setItem(THEME_KEY, JSON.stringify(['dark']));
    expect(readTheme()).toBe('light');
  });

  it('reads a null quantity in storage as 1 after a reload', () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([{ id: 2, qty: null }]));
    render(<App />);
    expect(screen.getByLabelText('Количество: Процесс согласования заказа')).toHaveTextContent('1');
  });
});

describe('hooks used outside their provider', () => {
  it('throws a clear error when useFavorites is used outside FavoritesProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Probe = () => {
      useFavorites();
      return null;
    };
    expect(() => render(<Probe />)).toThrow(/FavoritesProvider/);
    spy.mockRestore();
  });

  it('throws a clear error when useFavoritesDispatch is used outside FavoritesProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Probe = () => {
      useFavoritesDispatch();
      return null;
    };
    expect(() => render(<Probe />)).toThrow(/FavoritesProvider/);
    spy.mockRestore();
  });

  it('throws a clear error when useLanguage is used outside LanguageProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Probe = () => {
      useLanguage();
      return null;
    };
    expect(() => render(<Probe />)).toThrow(/LanguageProvider/);
    spy.mockRestore();
  });

  it('throws a clear error when useTheme is used outside ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Probe = () => {
      useTheme();
      return null;
    };
    expect(() => render(<Probe />)).toThrow(/ThemeProvider/);
    spy.mockRestore();
  });
});

describe('theme and language switched in a row', () => {
  it('flips the theme twice when toggled twice in one tick, and ignores an unknown theme', async () => {
    let api;
    const Probe = () => {
      api = useTheme();
      return <span data-testid="t">{api.theme}</span>;
    };
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    const start = api.theme;
    act(() => {
      api.toggleTheme();
      api.toggleTheme();
    });
    expect(screen.getByTestId('t')).toHaveTextContent(start);
    act(() => api.setTheme('<script>'));
    expect(screen.getByTestId('t')).toHaveTextContent(start);
  });

  it('does not store the system theme before the user chooses', () => {
    render(
      <ThemeProvider>
        <span />
      </ThemeProvider>,
    );
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it('survives 20 language toggles in a row and ends on the right language', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (let i = 0; i < 20; i += 1) await user.click(screen.getByRole('button', { name: /^(Язык|Language): / }));
    expect(document.documentElement.lang).toBe('ru');
    expect(localStorage.getItem('dslkit.language')).toBe('ru');
  });
});
