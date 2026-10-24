import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { ERRORS, kindOfCrash, kindOfFailure } from './errorCatalog';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchDiagrams: vi.fn(),
}));

const serverError = (status) => Object.assign(new Error('fail'), { response: { status, data: { error: 'x' } } });
const networkError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('token', 'jwt');
});

describe('a failed load explains the error in three parts', () => {
  it.each([
    [403, 'Ошибка 403'],
    [404, 'Ошибка 404'],
    [500, 'Ошибка 500'],
  ])('status %s shows what it is, why it happened and how to solve it', async (status, title) => {
    api.fetchDiagrams.mockRejectedValue(serverError(status));
    render(<App />);
    expect(await screen.findByText(new RegExp(title))).toBeInTheDocument();
    for (const heading of ['Что это', 'Почему так вышло', 'Как это исправить']) {
      expect(screen.getByRole('heading', { level: 3, name: heading })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });

  it('no answer from the server shows the network explanation', async () => {
    api.fetchDiagrams.mockRejectedValue(networkError());
    render(<App />);
    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
    expect(screen.getAllByText(/CORS/).length).toBeGreaterThan(0);
  });

  it('a body that is not a list is explained as a connection problem', async () => {
    api.fetchDiagrams.mockResolvedValue({ data: '<html>proxy</html>' });
    render(<App />);
    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
  });

  it('an answer such as 400 keeps only its own message, without a generic explanation', async () => {
    api.fetchDiagrams.mockRejectedValue(serverError(400));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('x');
    expect(screen.queryByText('Что это')).not.toBeInTheDocument();
  });
});

describe('the error pages of the boundary', () => {
  it('a crash shows the 500 page with the three parts and hides the technical text', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
      throw new Error('secret internals');
    };
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 500');
    expect(screen.getByRole('heading', { level: 2, name: 'Как это исправить' })).toBeInTheDocument();
    expect(screen.queryByText(/secret internals/)).not.toBeInTheDocument();
  });

  it('a failed download of code shows the network page with a retry button', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
      throw new TypeError('Failed to fetch dynamically imported module');
    };
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Нет связи с сервером');
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });
});

describe('choosing the page', () => {
  it('maps statuses and crashes to catalog entries', () => {
    expect(kindOfFailure(networkError())).toBe('network');
    expect(kindOfFailure(undefined)).toBe('network');
    expect(kindOfFailure(serverError(401))).toBe('401');
    expect(kindOfFailure(serverError(403))).toBe('403');
    expect(kindOfFailure(serverError(404))).toBe('404');
    expect(kindOfFailure(serverError(502))).toBe('500');
    expect(kindOfFailure(serverError(409))).toBeNull();
    expect(kindOfCrash(new Error('Loading chunk 3 failed'))).toBe('network');
    expect(kindOfCrash(new Error('x is undefined'))).toBe('500');
    expect(kindOfCrash(null)).toBe('500');
  });

  it.each(Object.keys(ERRORS))('the catalog entry %s is complete', (kind) => {
    const entry = ERRORS[kind];
    expect(entry.what.length).toBeGreaterThan(40);
    expect(entry.why.length).toBeGreaterThanOrEqual(2);
    expect(entry.fix.length).toBeGreaterThanOrEqual(2);
  });
});
