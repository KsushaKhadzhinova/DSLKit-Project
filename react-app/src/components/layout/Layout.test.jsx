import { fireEvent, render, screen } from '@testing-library/react';
import Footer from './Footer';
import Header from './Header';

const LINKS = [
  { href: '#notations', label: 'Нотации' },
  { href: '#plans', label: 'Тарифы' },
];

describe('Header', () => {
  test('shows the title and the navigation links', () => {
    render(<Header title="DSLKit" links={LINKS} onSignup={jest.fn()} />);
    expect(screen.getByText('DSLKit')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Основная навигация' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Тарифы' })).toHaveAttribute('href', '#plans');
  });

  test('works without links', () => {
    render(<Header title="DSLKit" onSignup={jest.fn()} />);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  test('calls onSignup when the button is clicked', () => {
    const onSignup = jest.fn();
    render(<Header title="DSLKit" links={LINKS} onSignup={onSignup} />);
    fireEvent.click(screen.getByRole('button', { name: 'Записаться в бету' }));
    expect(onSignup).toHaveBeenCalledTimes(1);
  });
});

describe('Footer', () => {
  test('shows the year and the owner from props', () => {
    render(<Footer owner="DSLKit" year={2026} />);
    expect(screen.getByText(/© 2026 DSLKit/)).toBeInTheDocument();
  });
});
