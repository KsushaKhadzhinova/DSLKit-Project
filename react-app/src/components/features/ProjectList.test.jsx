import { fireEvent, render, screen } from '@testing-library/react';
import { mockProjects } from '../../data/projects';
import PlanCard from './PlanCard';
import ProjectCard from './ProjectCard';
import ProjectList from './ProjectList';

const NOTATIONS = ['IDEF0', 'BPMN', 'ERD'];

describe('ProjectCard (component with an event handler)', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows the project data', () => {
    render(<ProjectCard project={mockProjects[0]} onOpen={jest.fn()} />);
    expect(screen.getByRole('heading', { name: 'Обработка заказов' })).toBeInTheDocument();
    expect(screen.getByText('IDEF0')).toBeInTheDocument();
    expect(screen.getByText('Общий доступ')).toBeInTheDocument();
    expect(screen.getByText(/12\.10\.2026/)).toBeInTheDocument();
    expect(screen.getByText(/4 файла/)).toBeInTheDocument();
  });

  test('hides the shared label for a private project', () => {
    render(<ProjectCard project={mockProjects[2]} onOpen={jest.fn()} />);
    expect(screen.queryByText('Общий доступ')).not.toBeInTheDocument();
  });

  test('calls onOpen with the project when the button is clicked', () => {
    const onOpen = jest.fn();
    render(<ProjectCard project={mockProjects[1]} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Открыть' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(mockProjects[1]);
  });
});

describe('ProjectList', () => {
  afterEach(() => jest.clearAllMocks());

  test('renders every project from the mock array', () => {
    render(<ProjectList projects={mockProjects} notations={NOTATIONS} onOpen={jest.fn()} onFilterChange={jest.fn()} />);
    expect(screen.getAllByRole('button', { name: 'Открыть' })).toHaveLength(mockProjects.length);
    expect(screen.getByTestId('project-list')).toBeInTheDocument();
  });

  test('keeps only the projects of the notation passed through props', () => {
    render(<ProjectList projects={mockProjects} notation="BPMN" notations={NOTATIONS} onOpen={jest.fn()} onFilterChange={jest.fn()} />);
    expect(screen.getAllByRole('button', { name: 'Открыть' })).toHaveLength(2);
    expect(screen.getByText('Оформление покупки')).toBeInTheDocument();
    expect(screen.queryByText('Обработка заказов')).not.toBeInTheDocument();
  });

  test('shows a message when nothing matches', () => {
    render(<ProjectList projects={mockProjects} notation="UML-unknown" notations={NOTATIONS} onOpen={jest.fn()} onFilterChange={jest.fn()} />);
    expect(screen.getByText('Проектов не найдено.')).toBeInTheDocument();
    expect(screen.queryByTestId('project-list')).not.toBeInTheDocument();
  });

  test('reports the chosen notation through onFilterChange', () => {
    const onFilterChange = jest.fn();
    render(<ProjectList projects={mockProjects} notations={NOTATIONS} onOpen={jest.fn()} onFilterChange={onFilterChange} />);
    fireEvent.change(screen.getByLabelText('Нотация'), { target: { value: 'ERD' } });
    expect(onFilterChange).toHaveBeenCalledWith('ERD');
  });

  test('passes the clicked project to onOpen', () => {
    const onOpen = jest.fn();
    render(<ProjectList projects={mockProjects} notations={NOTATIONS} onOpen={onOpen} onFilterChange={jest.fn()} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Открыть' })[0]);
    expect(onOpen).toHaveBeenCalledWith(mockProjects[0]);
  });

  test('works without a list of notations', () => {
    render(<ProjectList projects={[]} onOpen={jest.fn()} onFilterChange={jest.fn()} />);
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });
});

describe('PlanCard', () => {
  const plan = { id: 2, name: 'Команда', price: 12, diagramsPerDay: 100, features: ['Все нотации', 'История версий'] };

  test('shows the price, the limit and every feature', () => {
    render(<PlanCard plan={plan} onChoose={jest.fn()} />);
    expect(screen.getByRole('heading', { name: 'Команда' })).toBeInTheDocument();
    expect(screen.getByText(/в месяц/)).toBeInTheDocument();
    expect(screen.getByText('До 100 диаграмм в день')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  test('shows "Бесплатно" without the monthly suffix for a free plan', () => {
    render(<PlanCard plan={{ ...plan, price: 0 }} onChoose={jest.fn()} />);
    expect(screen.getByText('Бесплатно')).toBeInTheDocument();
    expect(screen.queryByText(/в месяц/)).not.toBeInTheDocument();
  });

  test('calls onChoose with the plan', () => {
    const onChoose = jest.fn();
    render(<PlanCard plan={plan} onChoose={onChoose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать' }));
    expect(onChoose).toHaveBeenCalledWith(plan);
  });
});
