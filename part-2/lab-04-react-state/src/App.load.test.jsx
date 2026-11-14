import { act, render, screen } from '@testing-library/react';
import App from './App';
import { loadConfig } from './hooks/useServerLoad';

// Task, part 4: simulated loading from a server with a delay of 1 second at start.
describe('simulated server load', () => {
  beforeEach(() => {
    loadConfig.delay = 1000;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the loading indicator for 1 second, then the list', () => {
    render(<App />);
    expect(screen.getByText('Загрузка диаграмм…')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Диаграммы' })).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(999));
    expect(screen.getByText('Загрузка диаграмм…')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('Загрузка диаграмм…')).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Диаграммы' })).toBeInTheDocument();
  });

  it('clears the timer when the page is closed during loading', () => {
    const { unmount } = render(<App />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
