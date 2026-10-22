import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App, { STORAGE_KEY } from './App';
import { INITIAL_DIAGRAMS } from './data/initialDiagrams';
import limits from './limits.json';

// Wrong user actions and damaged storage: the page must answer with a clear message and never crash.
const items = () => within(screen.getByRole('list', { name: 'Диаграммы' })).getAllByRole('listitem');
const titles = () => items().map((li) => li.querySelector('.card__title')?.textContent);
const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY));
const sample = { id: 'a', title: 'Схема', notation: 'UML', published: false, createdAt: '2026-10-16T12:30:05', updatedAt: '2026-10-16' };
const titleInput = () => screen.getByLabelText(/Название диаграммы/);

describe('negative actions in the add form', () => {
  it('answers with an error and stores nothing for an empty form submit', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Введите название диаграммы');
    expect(stored()).toHaveLength(INITIAL_DIAGRAMS.length);
  });

  it('rejects a title made of tabs and spaces without adding a record', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(titleInput());
    await user.paste(' \t \t  ');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Введите название диаграммы');
    expect(items()).toHaveLength(INITIAL_DIAGRAMS.length);
  });

  it('answers with the limit message to a 100000 character paste and stays usable', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(titleInput());
    // maxlength stops typing, so the over-limit value is set directly to reach the validation.
    fireEvent.change(document.activeElement, { target: { value: 'x'.repeat(100_000) } });
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByRole('alert')).toHaveTextContent(String(limits.title.maxLength));
    expect(items()).toHaveLength(INITIAL_DIAGRAMS.length);
    expect(stored()).toHaveLength(INITIAL_DIAGRAMS.length);
  });

  it('rejects a title one character longer than the limit', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(titleInput());
    // maxlength stops typing, so the over-limit value is set directly to reach the validation.
    fireEvent.change(document.activeElement, { target: { value: 'y'.repeat(limits.title.maxLength + 1) } });
    await user.keyboard('{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent(String(limits.title.maxLength));
    expect(items()).toHaveLength(INITIAL_DIAGRAMS.length);
  });

  it('accepts a title of exactly the limit length with spaces around it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(titleInput());
    // maxlength stops typing, so the over-limit value is set directly to reach the validation.
    fireEvent.change(document.activeElement, { target: { value: `  ${'z'.repeat(limits.title.maxLength)}  ` } });
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(titles()).toContain('z'.repeat(limits.title.maxLength));
  });

  it.each(['-1', '0', '1e309', 'NaN'])('stores "%s" as a text title, not as a number', async (value) => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(titleInput(), `${value}{Enter}`);
    expect(titles()).toContain(value);
    expect(stored().find((d) => d.title === value)).toBeDefined();
  });

  it('adds one record on a double click of the add button', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(titleInput(), 'Двойной клик');
    await user.dblClick(screen.getByRole('button', { name: 'Добавить' }));
    expect(titles().filter((t) => t === 'Двойной клик')).toHaveLength(1);
    expect(stored()).toHaveLength(INITIAL_DIAGRAMS.length + 1);
  });

  it('adds one record on a double Enter in the title field', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(titleInput(), 'Двойной Enter{Enter}{Enter}');
    expect(titles().filter((t) => t === 'Двойной Enter')).toHaveLength(1);
    expect(stored()).toHaveLength(INITIAL_DIAGRAMS.length + 1);
  });

  it('shows emoji and right-to-left text in a title unchanged', async () => {
    const user = userEvent.setup();
    render(<App />);
    const value = 'схема 🚀 مخطط';
    await user.type(titleInput(), `${value}{Enter}`);
    expect(screen.getByText(value)).toBeInTheDocument();
  });
});

describe('negative actions in the list', () => {
  it('saves a rename once when Enter is pressed twice', async () => {
    const user = userEvent.setup();
    render(<App />);
    const row = screen.getByText('Схема авторизации').closest('li');
    await user.click(within(row).getByRole('button', { name: /^Изменить/ }));
    await user.clear(screen.getByLabelText('Новое название'));
    await user.type(screen.getByLabelText('Новое название'), 'Вход{Enter}{Enter}');
    expect(titles().filter((t) => t === 'Вход')).toHaveLength(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('deletes a diagram once on a double click of its delete button', async () => {
    const user = userEvent.setup();
    render(<App />);
    const row = screen.getByText('Схема авторизации').closest('li');
    await user.dblClick(within(row).getByRole('button', { name: /^Удалить/ }));
    expect(titles()).not.toContain('Схема авторизации');
    expect(stored()).toHaveLength(INITIAL_DIAGRAMS.length - 1);
  });

  it('rejects a rename to 100000 characters and keeps the old title', async () => {
    const user = userEvent.setup();
    render(<App />);
    const row = screen.getByText('Схема авторизации').closest('li');
    await user.click(within(row).getByRole('button', { name: /^Изменить/ }));
    await user.clear(screen.getByLabelText('Новое название'));
    await user.click(screen.getByLabelText('Новое название'));
    // maxlength stops typing, so the over-limit value is set directly to reach the validation.
    fireEvent.change(document.activeElement, { target: { value: 'w'.repeat(100_000) } });
    await user.keyboard('{Enter}');
    expect(within(row).getByRole('alert')).toHaveTextContent(String(limits.title.maxLength));
    await user.keyboard('{Escape}');
    expect(within(row).getByText('Схема авторизации')).toBeInTheDocument();
  });

  it('drops the typed text on Escape and ignores a later Enter', async () => {
    const user = userEvent.setup();
    render(<App />);
    const row = screen.getByText('Модель данных проекта').closest('li');
    await user.click(within(row).getByRole('button', { name: /^Изменить/ }));
    await user.type(screen.getByLabelText('Новое название'), ' черновик{Escape}');
    await user.keyboard('{Enter}');
    expect(titles()).toContain('Модель данных проекта');
    expect(titles()).not.toContain('Модель данных проекта черновик');
    expect(stored().map((d) => d.title)).toContain('Модель данных проекта');
  });

  it('shows markup stored in a title as text and does not create an image or a script', () => {
    const attack = '<img src=x onerror="window.__neg=1"><script>window.__neg=2</script>';
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...sample, title: attack }]));
    render(<App />);
    expect(screen.getByText(attack)).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(within(screen.getByRole('list', { name: 'Диаграммы' })).queryByRole('img')).toBeNull();
    expect(window.__neg).toBeUndefined();
  });
});

describe('damaged or blocked localStorage', () => {
  it('starts with the initial list when the stored JSON is broken', () => {
    localStorage.setItem(STORAGE_KEY, '{"broken": ');
    render(<App />);
    expect(titles().sort()).toEqual(INITIAL_DIAGRAMS.map((d) => d.title).sort());
  });

  it('starts with the initial list when the stored value is an array of numbers', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));
    render(<App />);
    expect(titles().sort()).toEqual(INITIAL_DIAGRAMS.map((d) => d.title).sort());
  });

  it('starts with the initial list when the stored value is null', () => {
    localStorage.setItem(STORAGE_KEY, 'null');
    render(<App />);
    expect(titles().sort()).toEqual(INITIAL_DIAGRAMS.map((d) => d.title).sort());
  });

  it('starts with the initial list when a stored title is 100000 characters long', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...sample, title: 'q'.repeat(100_000) }]));
    render(<App />);
    expect(titles().sort()).toEqual(INITIAL_DIAGRAMS.map((d) => d.title).sort());
  });

  it('cuts a stored list that is over the limit to the cap', () => {
    const many = Array.from({ length: limits.diagrams.maxCount + 1 }, (_, i) => ({ ...sample, id: i }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(many));
    render(<App />);
    expect(items()).toHaveLength(limits.diagrams.maxCount);
  });

  it('renders the page when reading storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: storage is blocked');
    });
    render(<App />);
    expect(items()).toHaveLength(INITIAL_DIAGRAMS.length);
    spy.mockRestore();
  });

  it('keeps adding and deleting in memory when reading and writing storage are both blocked', async () => {
    const user = userEvent.setup();
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    render(<App />);
    await user.type(titleInput(), 'Без хранилища{Enter}');
    expect(titles()).toContain('Без хранилища');
    const row = screen.getByText('Схема авторизации').closest('li');
    await user.click(within(row).getByRole('button', { name: /^Удалить/ }));
    expect(titles()).not.toContain('Схема авторизации');
    read.mockRestore();
    write.mockRestore();
  });
});

describe('unexpected address', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('shows the single page and all diagrams for an unknown anchor', () => {
    window.location.hash = '#no-such-section';
    render(<App />);
    expect(items()).toHaveLength(INITIAL_DIAGRAMS.length);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
