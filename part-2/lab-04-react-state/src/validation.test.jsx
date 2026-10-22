import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App, { STORAGE_KEY } from './App';
import { INITIAL_DIAGRAMS } from './data/initialDiagrams';
import limits from './limits.json';
import ErrorBoundary from './shell/ErrorBoundary';
import { THEME_KEY, readTheme } from './shell/theme';
import { newId, uniqueCreatedAt } from './utils/diagrams';
import { canAddMore, formatTime, isDiagramList, repairDiagramList, validateTitle } from './utils/validation';

const items = () => within(screen.getByRole('list', { name: 'Диаграммы' })).getAllByRole('listitem');
const sample = { id: 'a', title: 'Схема', notation: 'UML', published: false, createdAt: '2026-10-16T12:30:05', updatedAt: '2026-10-16' };

describe('validateTitle', () => {
  it('rejects empty and whitespace-only values', () => {
    expect(validateTitle('')).toMatch(/Введите/);
    expect(validateTitle('   \t ')).toMatch(/Введите/);
    expect(validateTitle(undefined)).toMatch(/Введите/);
  });

  it('takes the length limit from limits.json and counts trimmed text', () => {
    const max = limits.title.maxLength;
    expect(validateTitle('a'.repeat(max))).toBeNull();
    expect(validateTitle(`  ${'a'.repeat(max)}  `)).toBeNull();
    expect(validateTitle('a'.repeat(max + 1))).toContain(String(max));
  });

  it('survives a huge value without throwing', () => {
    expect(validateTitle('x'.repeat(5_000_000))).toContain(String(limits.title.maxLength));
  });

  it('caps the list size by the limit from limits.json', () => {
    expect(canAddMore(limits.diagrams.maxCount - 1)).toBe(true);
    expect(canAddMore(limits.diagrams.maxCount)).toBe(false);
  });
});

describe('storage shape and time format', () => {
  it('accepts only well-formed lists of diagrams', () => {
    expect(isDiagramList(INITIAL_DIAGRAMS)).toBe(true);
    expect(isDiagramList([])).toBe(true);
    expect(isDiagramList({})).toBe(false);
    expect(isDiagramList([null])).toBe(false);
    expect(isDiagramList([{ id: 1, title: 'old format' }])).toBe(false);
  });

  it.each([
    ['wrong notation', { notation: 'HACK' }],
    ['non-boolean status', { published: 'yes' }],
    ['whitespace title', { title: '   ' }],
    ['too long title', { title: 'x'.repeat(limits.title.maxLength + 1) }],
    ['title that is not a string', { title: { $ne: 1 } }],
    ['broken creation date', { createdAt: 'yesterday' }],
    ['object id', { id: {} }],
  ])('rejects a record with %s', (_, patch) => {
    expect(isDiagramList([{ ...sample, ...patch }])).toBe(false);
  });

  it('rejects duplicate ids and a list over the limit', () => {
    expect(isDiagramList([sample, { ...sample }])).toBe(false);
    const many = Array.from({ length: limits.diagrams.maxCount + 1 }, (_, i) => ({ ...sample, id: i }));
    expect(isDiagramList(many)).toBe(false);
  });

  it('repair keeps the good records and drops bad, repeated and surplus ones', () => {
    const second = { ...sample, id: 'b' };
    expect(repairDiagramList([sample, { id: 'x' }, null, { ...sample }, second])).toEqual([sample, second]);
    const many = Array.from({ length: limits.diagrams.maxCount + 5 }, (_, i) => ({ ...sample, id: i }));
    expect(repairDiagramList(many)).toHaveLength(limits.diagrams.maxCount);
  });

  it('repair gives null when nothing can be saved', () => {
    expect(repairDiagramList({})).toBeNull();
    expect(repairDiagramList([null, { id: 1 }])).toBeNull();
    expect(repairDiagramList([])).toBeNull();
  });

  it('formats time as date and time', () => {
    expect(formatTime('2026-10-16T12:30:05')).toBe('2026-10-16 12:30:05');
  });
});

describe('forms show validation errors', () => {
  it('shows an error for empty and whitespace-only titles and clears it after a valid one', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Введите название диаграммы');
    expect(screen.getByLabelText(/Название диаграммы/)).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByLabelText(/Название диаграммы/), '   {Enter}');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(items()).toHaveLength(INITIAL_DIAGRAMS.length);

    await user.type(screen.getByLabelText(/Название диаграммы/), 'Схема оплаты{Enter}');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(items()).toHaveLength(INITIAL_DIAGRAMS.length + 1);
  });

  it('rejects a title longer than the limit', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByLabelText(/Название диаграммы/));
    await user.paste('x'.repeat(limits.title.maxLength + 1));
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByRole('alert')).toHaveTextContent(String(limits.title.maxLength));
  });

  it('keeps the editor open with an error when a rename is invalid and drops it on Escape', async () => {
    const user = userEvent.setup();
    render(<App />);
    const row = screen.getByText('Схема авторизации').closest('li');
    await user.click(within(row).getByRole('button', { name: /^Изменить/ }));
    await user.clear(screen.getByLabelText('Новое название'));
    await user.type(screen.getByLabelText('Новое название'), '   {Enter}');
    expect(within(row).getByRole('alert')).toHaveTextContent('Введите название диаграммы');

    await user.keyboard('{Escape}');
    expect(within(row).queryByRole('alert')).not.toBeInTheDocument();
    expect(within(row).getByText('Схема авторизации')).toBeInTheDocument();
  });

  it('refuses to add past the list limit', async () => {
    const user = userEvent.setup();
    const full = Array.from({ length: limits.diagrams.maxCount }, (_, i) => ({ ...sample, id: i, createdAt: `2026-01-01T00:00:${String(i % 60).padStart(2, '0')}` }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    render(<App />);
    await user.type(screen.getByLabelText(/Название диаграммы/), 'Лишняя{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Достигнут предел');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toHaveLength(limits.diagrams.maxCount);
  });
});

describe('creation time', () => {
  it('shows a creation time on every record, also on a new one', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getAllByText(/Создана: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)).toHaveLength(3);
    await user.type(screen.getByLabelText(/Название диаграммы/), 'Новая{Enter}');
    expect(screen.getAllByText(/Создана: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)).toHaveLength(4);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).every((d) => typeof d.createdAt === 'string')).toBe(true);
  });

  it('gives records created within one second different creation times', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/Название диаграммы/), 'Первая{Enter}');
    await user.type(screen.getByLabelText(/Название диаграммы/), 'Вторая{Enter}');
    await user.type(screen.getByLabelText(/Название диаграммы/), 'Третья{Enter}');
    const times = JSON.parse(localStorage.getItem(STORAGE_KEY)).map((d) => d.createdAt);
    expect(new Set(times).size).toBe(times.length);
  });

  it('uniqueCreatedAt moves a same-second record one second forward', () => {
    const now = new Date(2026, 9, 17, 10, 0, 0, 500);
    expect(uniqueCreatedAt([], now)).toBe('2026-10-17T10:00:00');
    expect(uniqueCreatedAt([{ createdAt: '2026-10-17T10:00:00' }], now)).toBe('2026-10-17T10:00:01');
    expect(uniqueCreatedAt([{ createdAt: '2026-10-17T10:00:00' }, { createdAt: '2026-10-17T10:00:01' }], now)).toBe('2026-10-17T10:00:02');
    expect(uniqueCreatedAt([{ createdAt: '2026-10-17T09:00:00' }], now)).toBe('2026-10-17T10:00:00');
  });

  it('drops stored records of the old shape without creation time', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 1, title: 'old', notation: 'UML', published: true, updatedAt: '2026-10-01' }]));
    render(<App />);
    expect(items()).toHaveLength(INITIAL_DIAGRAMS.length);
  });
});

describe('ids and safety', () => {
  it('makes an id without crypto.randomUUID (plain http)', () => {
    vi.stubGlobal('crypto', {});
    expect(newId()).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    vi.unstubAllGlobals();
    expect(newId()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('shows markup in a title as plain text and never as HTML', async () => {
    const user = userEvent.setup();
    render(<App />);
    const attack = '<img src=x onerror="window.__xss=1"><b>bold</b>';
    await user.click(screen.getByLabelText(/Название диаграммы/));
    await user.paste(attack);
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByText(attack)).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(window.__xss).toBeUndefined();
  });
});

describe('theme', () => {
  it('switches the root attribute with the moon and sun checkbox and remembers the choice', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('light');
    await user.click(screen.getByRole('checkbox', { name: 'Тёмная тема' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  it('starts from the saved choice and ignores a broken one', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    expect(readTheme()).toBe('dark');
    localStorage.setItem(THEME_KEY, '<script>');
    expect(readTheme()).toBe('light');
  });

  it('follows the system preference without a saved choice and survives blocked storage', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(readTheme()).toBe('dark');
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readTheme()).toBe('dark');
    spy.mockRestore();
    vi.unstubAllGlobals();
  });
});

describe('error page', () => {
  it('shows a styled 500 page instead of a blank screen', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
      throw new Error('boom');
    };
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('500');
    expect(screen.getByRole('button', { name: 'Обновить страницу' })).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it('renders children when nothing fails', () => {
    render(
      <ErrorBoundary>
        <p>fine</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeInTheDocument();
  });
});
