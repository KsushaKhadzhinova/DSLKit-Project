import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App, { STORAGE_KEY } from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { INITIAL_DIAGRAMS } from './data/initialDiagrams';
import limits from './limits.json';
import { formatTime, isDiagramList, validateTitle } from './utils/validation';

describe('validateTitle', () => {
  it('rejects empty and whitespace-only values', () => {
    expect(validateTitle('')).toMatch(/Введите/);
    expect(validateTitle('   \t ')).toMatch(/Введите/);
  });

  it('takes the length limit from limits.json and counts trimmed text', () => {
    const max = limits.title.maxLength;
    expect(validateTitle('a'.repeat(max))).toBeNull();
    expect(validateTitle(`  ${'a'.repeat(max)}  `)).toBeNull();
    expect(validateTitle('a'.repeat(max + 1))).toContain(String(max));
  });
});

describe('storage shape and time format', () => {
  it('accepts only lists of diagrams with a title and a creation time', () => {
    expect(isDiagramList(INITIAL_DIAGRAMS)).toBe(true);
    expect(isDiagramList([])).toBe(true);
    expect(isDiagramList({})).toBe(false);
    expect(isDiagramList([null])).toBe(false);
    expect(isDiagramList([{ id: 1, title: 'old format' }])).toBe(false);
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
    expect(screen.getAllByRole('listitem')).toHaveLength(INITIAL_DIAGRAMS.length);

    await user.type(screen.getByLabelText(/Название диаграммы/), 'Схема оплаты{Enter}');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(INITIAL_DIAGRAMS.length + 1);
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

  it('drops stored records of the old shape without creation time', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 1, title: 'old', notation: 'UML', published: true, updatedAt: '2026-10-01' }]));
    render(<App />);
    expect(screen.getAllByRole('listitem')).toHaveLength(INITIAL_DIAGRAMS.length);
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
    expect(screen.getByRole('alert')).toHaveTextContent('500');
    expect(screen.getByRole('button', { name: 'Обновить страницу' })).toBeInTheDocument();
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
