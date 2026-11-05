import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ErrorBoundary from './components/ErrorBoundary';

afterEach(() => vi.restoreAllMocks());

const Broken = () => {
  throw new Error('boom');
};

it('shows the styled 500 page instead of a blank screen', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('500');
  expect(screen.getByRole('button', { name: 'Обновить страницу' })).toBeInTheDocument();
});

it('renders the children when nothing fails', () => {
  render(
    <ErrorBoundary>
      <p>fine</p>
    </ErrorBoundary>,
  );
  expect(screen.getByText('fine')).toBeInTheDocument();
});
