import { render, screen, within } from '@testing-library/react';
import { mockNotations } from '../../data/notations';
import NotationCard from './NotationCard';
import NotationList from './NotationList';

describe('NotationCard (composite: Card + Badge)', () => {
  test('shows the code, the title, the status and the example', () => {
    render(<NotationCard notation={mockNotations[0]} />);
    expect(screen.getByRole('heading', { name: 'UML' })).toBeInTheDocument();
    expect(screen.getByText(mockNotations[0].title)).toBeInTheDocument();
    expect(screen.getByText('В бете')).toHaveClass('success');
    expect(screen.getByText(mockNotations[0].example)).toBeInTheDocument();
  });

  test('marks a planned notation with the warning tone', () => {
    render(<NotationCard notation={mockNotations[3]} />);
    expect(screen.getByText('В планах')).toHaveClass('warning');
  });
});

describe('NotationList', () => {
  test('renders one card per notation from the mock array', () => {
    render(<NotationList notations={mockNotations} />);
    const items = within(screen.getByTestId('notation-list')).getAllByRole('listitem');
    expect(items).toHaveLength(mockNotations.length);
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual(mockNotations.map((notation) => notation.code));
  });

  test('shows a message for an empty list', () => {
    render(<NotationList notations={[]} />);
    expect(screen.getByText('Нотации пока не добавлены.')).toBeInTheDocument();
    expect(screen.queryByTestId('notation-list')).not.toBeInTheDocument();
  });
});
