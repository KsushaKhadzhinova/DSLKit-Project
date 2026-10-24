import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './shell/ErrorBoundary';
import ErrorPage from './shell/ErrorPage';
import { ERRORS, kindOfError } from './shell/errorCatalog';

const crash = (message) => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const Broken = () => {
    throw new Error(message);
  };
  render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>,
  );
};

describe('error pages explain the error', () => {
  it.each(Object.keys(ERRORS))('the catalog entry %s has a description, reasons and steps', (kind) => {
    expect(ERRORS[kind].what.length).toBeGreaterThan(40);
    expect(ERRORS[kind].why.length).toBeGreaterThanOrEqual(2);
    expect(ERRORS[kind].fix.length).toBeGreaterThanOrEqual(2);
  });

  it('a crash shows the 500 page with the three parts and hides the technical text', () => {
    crash('secret internals');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 500');
    for (const name of ['Что это', 'Почему так вышло', 'Как это исправить']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.queryByText(/secret internals/)).not.toBeInTheDocument();
  });

  it('a failed download of code shows the network page with a retry button', () => {
    crash('Failed to fetch dynamically imported module');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Нет связи с сервером');
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });

  it('kindOfError survives odd values', () => {
    expect(kindOfError(undefined)).toBe('500');
    expect(kindOfError(null)).toBe('500');
    expect(kindOfError({})).toBe('500');
    expect(kindOfError(new Error('Loading chunk 1 failed'))).toBe('network');
  });

  it('a one-off page without a kind skips the empty parts', () => {
    render(<ErrorPage code="418" title="Ошибка 418" text="Я чайник." />);
    expect(screen.getByText('Код ошибки: 418')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Почему так вышло' })).not.toBeInTheDocument();
  });
});
