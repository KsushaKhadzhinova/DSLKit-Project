import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import ErrorBoundary from './shell/ErrorBoundary';

// Accessibility check with axe-core (WCAG 2 A and AA rules). jsdom has no layout, so the colour contrast rule cannot run here;
// the contrast of the palette is checked separately by tools/contrast.js in Part 1.
const audit = async (container = document.body) => {
  const { violations } = await axe.run(container, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }, rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`);
};

describe('accessibility (axe-core)', () => {
  it('the main screen has no violations', async () => {
    localStorage.clear();
    render(<App />);
    expect(await audit()).toEqual([]);
  });

  it('a card in the edit mode and the form with a validation error have no violations', async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(await audit()).toEqual([]);
    const row = screen.getAllByRole('listitem').find((li) => within(li).queryByRole('button', { name: /^Изменить/ }));
    await user.click(within(row).getByRole('button', { name: /^Изменить/ }));
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
