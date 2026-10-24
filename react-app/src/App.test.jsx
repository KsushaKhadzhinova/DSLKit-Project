import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { mockNotations } from './data/notations';
import { mockPlans } from './data/plans';
import { mockProjects } from './data/projects';

describe('App (integration of the components)', () => {
  test('renders the three sections with data from the mock arrays', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Диаграммы как код' })).toBeInTheDocument();
    expect(screen.getByTestId('notation-list').children).toHaveLength(mockNotations.length);
    expect(screen.getAllByRole('button', { name: 'Открыть' })).toHaveLength(mockProjects.length);
    expect(screen.getAllByRole('button', { name: 'Выбрать' })).toHaveLength(mockPlans.length);
  });

  test('the signup button shows a confirmation', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Записаться в бету' }));
    expect(screen.getByRole('status')).toHaveTextContent('Вы записаны в бету');
  });

  test('opening a project shows its name and the message can be closed', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Открыть' })[0]);
    expect(screen.getByRole('status')).toHaveTextContent('Открыт проект «Обработка заказов»');
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  test('changing the notation filters the list', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Нотация'), { target: { value: 'BPMN' } });
    expect(screen.getAllByRole('button', { name: 'Открыть' })).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Нотация'), { target: { value: 'all' } });
    expect(screen.getAllByRole('button', { name: 'Открыть' })).toHaveLength(mockProjects.length);
  });

  test('choosing a plan shows the plan name', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Выбрать' })[1]);
    expect(screen.getByRole('status')).toHaveTextContent('Выбран тариф «Команда»');
  });
});

describe('App accessibility landmarks', () => {
  test('has a skip link to the main content and a named projects region', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'К основному содержимому' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('region', { name: 'Проекты' })).toBeInTheDocument();
  });
});
