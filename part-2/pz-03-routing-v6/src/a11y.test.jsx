import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { AUTH_KEY, AuthProvider, USER_KEY } from './auth';
import ErrorBoundary from './shell/ErrorBoundary';

// Accessibility check with axe-core (WCAG 2 A and AA rules). jsdom has no layout, so the colour contrast rule cannot run here;
// the contrast of the palette is checked separately by tools/contrast.js in Part 1.
const audit = async (container = document.body) => {
  const { violations } = await axe.run(container, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }, rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`);
};

const renderAt = (path, signed) => {
  localStorage.clear();
  if (signed) {
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem(USER_KEY, signed);
  }
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe('accessibility of every page (axe-core)', () => {
  it.each([
    ['/', undefined],
    ['/catalog', undefined],
    ['/catalog/1', undefined],
    ['/about', undefined],
    ['/login', undefined],
    ['/dashboard', 'bob'],
    ['/admin', 'admin'],
    ['/admin', 'bob'],
    ['/nowhere', undefined],
    ['/dashboard', undefined],
  ])('%s as %s has no violations', async (path, signed) => {
    renderAt(path, signed);
    await screen.findAllByRole('heading', { level: 1 });
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
});

describe('the audit itself', () => {
  it('finds a real problem, so a clean result means something', async () => {
    render(
      <main>
        <img src="x.png" />
        <input />
        <button />
      </main>,
    );
    const found = await audit();
    expect(found.join(' ')).toMatch(/image-alt/);
    expect(found.join(' ')).toMatch(/label/);
    expect(found.join(' ')).toMatch(/button-name/);
  });
});
