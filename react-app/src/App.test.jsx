import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { mockNotations } from './data/notations';
import { mockPlans } from './data/plans';
import { mockProjects } from './data/projects';

describe('App (integration of the components)', () => {
  let log;
  let group;
  let table;

  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
    group = jest.spyOn(console, 'group').mockImplementation(() => {});
    table = jest.spyOn(console, 'table').mockImplementation(() => {});
    jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  test('renders the three sections with data from the mock arrays', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Диаграммы как код' })).toBeInTheDocument();
    expect(screen.getByTestId('notation-list').children).toHaveLength(mockNotations.length);
    expect(screen.getAllByRole('button', { name: 'Открыть' })).toHaveLength(mockProjects.length);
    expect(screen.getAllByRole('button', { name: 'Выбрать' })).toHaveLength(mockPlans.length);
  });

  test('the signup button writes to the console', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Записаться в бету' }));
    expect(log).toHaveBeenCalledWith('Запись в бету');
  });

  test('opening a project groups the output and prints a table', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Открыть' })[0]);
    expect(group).toHaveBeenCalledWith('Открыт проект: Обработка заказов');
    expect(table).toHaveBeenCalledWith(mockProjects[0]);
  });

  test('changing the notation and choosing a plan write to the console', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Нотация'), { target: { value: 'BPMN' } });
    expect(log).toHaveBeenCalledWith('Выбрана нотация:', 'BPMN');
    fireEvent.click(screen.getAllByRole('button', { name: 'Выбрать' })[1]);
    expect(log).toHaveBeenCalledWith('Выбран тариф:', 'Команда');
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
