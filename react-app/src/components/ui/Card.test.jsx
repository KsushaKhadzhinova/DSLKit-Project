import { render, screen } from '@testing-library/react';
import Badge from './Badge';
import Card from './Card';

describe('Card', () => {
  test('shows the title and the children', () => {
    render(
      <Card title="Заголовок">
        <p>Содержимое</p>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Заголовок' })).toBeInTheDocument();
    expect(screen.getByText('Содержимое')).toBeInTheDocument();
  });

  test('does not render a heading when there is no title', () => {
    render(<Card>Без заголовка</Card>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Без заголовка')).toBeInTheDocument();
  });

  test('adds an extra class', () => {
    render(<Card className="extra">Текст</Card>);
    expect(screen.getByRole('article')).toHaveClass('card', 'extra');
  });
});

describe('Badge', () => {
  test('shows the text with the neutral tone by default', () => {
    render(<Badge>Метка</Badge>);
    expect(screen.getByText('Метка')).toHaveClass('badge', 'neutral');
  });

  test('uses the given tone', () => {
    render(<Badge tone="success">Готово</Badge>);
    expect(screen.getByText('Готово')).toHaveClass('success');
  });
});

describe('Card heading level', () => {
  test('uses h3 by default and the level passed through props', () => {
    const { rerender } = render(<Card title="Заголовок">x</Card>);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    rerender(
      <Card title="Заголовок" headingLevel="h2">
        x
      </Card>,
    );
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });
});
