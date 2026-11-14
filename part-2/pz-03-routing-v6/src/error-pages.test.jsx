import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { AUTH_KEY, AuthProvider, USER_KEY } from './auth';
import ErrorBoundary from './shell/ErrorBoundary';
import ErrorPage from './shell/ErrorPage';
import { ERRORS, kindOfError } from './shell/errorCatalog';

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

const parts = () => [screen.getByRole('heading', { level: 2, name: 'Что это' }), screen.getByRole('heading', { level: 2, name: 'Почему так вышло' }), screen.getByRole('heading', { level: 2, name: 'Как это исправить' })];

describe('error pages explain the error', () => {
  it.each(Object.keys(ERRORS))('the catalog entry %s has a title, a description, reasons and steps', (kind) => {
    const entry = ERRORS[kind];
    expect(entry.title).toBeTruthy();
    expect(entry.what.length).toBeGreaterThan(40);
    expect(entry.why.length).toBeGreaterThanOrEqual(2);
    expect(entry.fix.length).toBeGreaterThanOrEqual(2);
  });

  it('the 404 page says what it is, why it happened and how to solve it', () => {
    renderAt('/nowhere');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 404');
    expect(parts()).toHaveLength(3);
  });

  it('the 403 page says what it is, why it happened and how to solve it', () => {
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem(USER_KEY, 'bob');
    renderAt('/admin');
    expect(screen.getByRole('heading', { level: 1, name: /403/ })).toBeInTheDocument();
    expect(parts()).toHaveLength(3);
  });

  it('a guest sent to the sign-in form gets the 401 explanation, folded', () => {
    localStorage.clear();
    renderAt('/dashboard');
    expect(screen.getByText('Ошибка 401: почему я здесь и что делать')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Как это исправить' })).toBeInTheDocument();
  });

  it('a failed download of the code shows the network page with a retry button and no technical text', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
      throw new TypeError('Failed to fetch dynamically imported module: https://x/y.js');
    };
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Нет связи с сервером');
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
    expect(screen.queryByText(/y\.js/)).not.toBeInTheDocument();
    expect(parts()).toHaveLength(3);
    spy.mockRestore();
  });

  it('any other crash shows the 500 page with all three parts', () => {
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
    expect(parts()).toHaveLength(3);
    spy.mockRestore();
  });

  it('kindOfError tells a network failure from a code failure and survives odd values', () => {
    expect(kindOfError(new Error('Loading chunk 5 failed'))).toBe('network');
    expect(kindOfError(new TypeError('Failed to fetch'))).toBe('network');
    expect(kindOfError(new Error('x is undefined'))).toBe('500');
    expect(kindOfError(undefined)).toBe('500');
    expect(kindOfError(null)).toBe('500');
    expect(kindOfError({})).toBe('500');
  });

  it('a one-off page without a kind still works and skips empty parts', () => {
    render(<ErrorPage code="418" title="Ошибка 418" text="Я чайник." />);
    expect(screen.getByText('Код ошибки: 418')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Почему так вышло' })).not.toBeInTheDocument();
  });
});
