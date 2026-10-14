import { fireEvent, render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  afterEach(() => jest.clearAllMocks());

  test('renders its text and is a button that does not submit forms by default', () => {
    render(<Button>Нажми меня</Button>);
    const button = screen.getByRole('button', { name: 'Нажми меня' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  test('calls the handler on click', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Клик</Button>);
    fireEvent.click(screen.getByText('Клик'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('uses the variant for the class and passes other attributes to the element', () => {
    render(
      <Button variant="quiet" disabled aria-label="Тихая кнопка">
        Тихая
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Тихая кнопка' });
    expect(button).toHaveClass('quiet');
    expect(button).toBeDisabled();
  });
});
