import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { AUTH_KEY, AuthProvider, USER_KEY, validateUserName } from './auth';
import { buildCrumbs } from './components/Breadcrumbs';
import { AppRouter } from './router';
import ErrorBoundary from './shell/ErrorBoundary';

// Tests for the findings of the red-team audit of ПЗ3 (redteam-pz3.md), F1-F7 except F5 and F8
// (F5 is a defence-in-depth gap that is not reachable, F8 is the documented demo limitation; see NOTES.md).
// Each `it` below used to fail against the pre-fix code and passes against the fixed code.

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

const signedIn = (name) => {
  localStorage.setItem(AUTH_KEY, 'true');
  localStorage.setItem(USER_KEY, name);
};

describe('F1: a prototype-named address segment no longer crashes the page (Breadcrumbs.jsx)', () => {
  it.each(['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty'])(
    'answers 404 for /%s instead of a React-child crash that showed 500',
    async (segment) => {
      renderAt(`/${segment}`);
      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Ошибка 404');
      expect(screen.queryByText(/Ошибка 500/)).toBeNull();
      expect(screen.queryByRole('navigation', { name: 'Хлебные крошки' })).toBeNull();
    },
  );

  it('builds no crumbs for a prototype-named segment under /catalog either', () => {
    expect(buildCrumbs('/catalog/__proto__')).toEqual([]);
    expect(buildCrumbs('/__proto__')).toEqual([]);
    expect(buildCrumbs('/constructor')).toEqual([]);
  });
});

describe('F2: the skip-link reaches <main> under the hash router too (Layout.jsx)', () => {
  it('moves focus to main instead of turning "#main" into the hash route "main"', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/');
    render(
      <AppRouter env={{ VITE_ROUTER: 'hash' }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AppRouter>,
    );
    await screen.findByRole('heading', { level: 1, name: 'DSLKit' });
    await user.click(screen.getByRole('link', { name: 'Перейти к основному содержимому' }));
    expect(screen.getByRole('main')).toHaveFocus();
    expect(screen.queryByText(/Ошибка 404/)).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'DSLKit' })).toBeInTheDocument();
  });
});

describe('F3: ErrorBoundary links home correctly in every router mode (ErrorBoundary.jsx)', () => {
  const Broken = () => {
    throw new Error('boom');
  };

  it('points at "<base>#/" when the app uses the hash router', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary env={{ VITE_ROUTER: 'hash', BASE_URL: '/dslkit/' }}>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/dslkit/#/');
    spy.mockRestore();
  });

  it('points at the plain base address with the usual browser router', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary env={{ BASE_URL: '/dslkit/' }}>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/dslkit/');
    spy.mockRestore();
  });
});

describe('F6: /logout no longer acts on a bare GET (logout-CSRF, pages.jsx)', () => {
  it('does not sign the user out on a direct/fresh visit to /logout and asks to confirm', async () => {
    signedIn('Ксения');
    renderAt('/logout');
    expect(await screen.findByRole('button', { name: 'Подтвердить выход' })).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_KEY)).toBe('true');
  });

  it('signs out only after the confirmation button is clicked', async () => {
    const user = userEvent.setup();
    signedIn('Ксения');
    renderAt('/logout');
    await user.click(await screen.findByRole('button', { name: 'Подтвердить выход' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'DSLKit' })).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });

  it('still signs out at once on the real in-app "Выйти" link (unchanged behaviour)', async () => {
    const user = userEvent.setup();
    signedIn('Ксения');
    renderAt('/dashboard');
    await screen.findByRole('heading', { name: 'Личный кабинет' });
    await user.click(screen.getByRole('link', { name: 'Выйти' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'DSLKit' })).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });
});

describe('F7: invisible and bidi characters in a user name are rejected (auth.jsx)', () => {
  it.each([['​'.repeat(10), 'zero-width spaces'], ['ㅤㅤㅤ', 'Hangul fillers'], ['‮admin', 'a leading RLO override'], ['a\u0000b', 'an embedded NUL']])(
    'rejects a name made of %s (%s)',
    (value) => {
      expect(validateUserName(value)).not.toBeNull();
    },
  );

  it('still accepts an ordinary name', () => {
    expect(validateUserName('Ксения')).toBeNull();
  });

  it('refuses to sign in with a name hidden behind zero-width spaces', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(screen.getByLabelText('Имя пользователя'), '​​​');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });
});
