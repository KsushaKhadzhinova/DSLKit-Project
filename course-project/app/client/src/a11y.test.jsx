import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { mockProfile, renderApp } from './testUtils';
import ErrorBoundary from './components/ErrorBoundary';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchDiagrams: vi.fn(),
  addDiagram: vi.fn(),
  login: vi.fn(),
  fetchProfile: vi.fn(),
  register: vi.fn(),
}));

// Accessibility check with axe-core (WCAG 2 A and AA rules). jsdom has no layout, so the colour contrast rule cannot run here;
// the contrast of the palette is checked separately by tools/contrast.js in Part 1.
const audit = async (container = document.body) => {
  const { violations } = await axe.run(container, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }, rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`);
};

const record = (id, title) => ({ id, title, notation: 'UML', sourceCode: 'a -> b', priority: 'normal', createdAt: `2026-10-16T10:00:0${id}.000Z` });
const serverError = (status) => Object.assign(new Error('fail'), { response: { status, data: { error: 'x' } } });

beforeEach(() => {
  vi.resetAllMocks();
  mockProfile();
  localStorage.clear();
});

describe('accessibility (axe-core)', () => {
  it('the login form and the registration form have no violations, also with an error', async () => {
    const user = userEvent.setup();
    renderApp();
    expect(await audit()).toEqual([]);
    await user.click(screen.getByRole('button', { name: /Регистрация|Зарегистрироваться|Войти/ }));
    expect(await audit()).toEqual([]);
  });

  it('the list screen has no violations with records, with none, and while loading', async () => {
    localStorage.setItem('token', 'jwt');
    api.fetchDiagrams.mockResolvedValue({ data: [record(1, 'Order processing'), record(2, 'Billing schema')], headers: { 'x-total-count': '2' } });
    const { unmount } = renderApp();
    expect(await audit()).toEqual([]);
    await screen.findByText('Order processing');
    expect(await audit()).toEqual([]);
    unmount();
    api.fetchDiagrams.mockResolvedValue({ data: [], headers: { 'x-total-count': '0' } });
    renderApp();
    await screen.findByText('Диаграмм не найдено.');
    expect(await audit()).toEqual([]);
  });

  it.each([401, 403, 404, 500, 0])('the explained load error %s has no violations', async (status) => {
    localStorage.setItem('token', 'jwt');
    api.fetchDiagrams.mockRejectedValue(status === 0 ? Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }) : serverError(status));
    renderApp();
    await screen.findByRole('button', { name: 'Повторить' });
    expect(await audit()).toEqual([]);
  });

  it('the 500 and the network error pages have no violations', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const message of ['boom', 'Failed to fetch dynamically imported module']) {
      const Broken = () => {
        throw new Error(message);
      };
      const { unmount } = render(
        <ErrorBoundary>
          <Broken />
        </ErrorBoundary>,
      );
      expect(await audit()).toEqual([]);
      unmount();
    }
  });

  it('the audit finds a real problem, so a clean result means something', async () => {
    render(
      <main>
        <img src="x.png" />
        <input />
      </main>,
    );
    expect((await audit()).join(' ')).toMatch(/image-alt/);
  });
});
