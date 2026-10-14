# Laboratory Work No. 8. Testing a Frontend Application

## 1 Purpose of the Work

To master the basics of testing JavaScript code and the developer tools for debugging and performance analysis on the example of the React application of the DSLKit project, a web editor for diagrams as code that belongs to the SaaS direction and matches the future course project.

## 2 Brief Theoretical Background

**Unit testing.** It checks small parts of code, for example pure functions, separately from the rest of the system. Such tests are fast and point to the place of an error exactly.

**Integration testing.** It checks several parts working together, for example the root component with its nested ones. It catches errors at the joints that unit tests do not see.

**Jest.** It runs tests and provides the functions `describe`, `test`, `expect`, fake functions `jest.fn()` and watching with `jest.spyOn`, and it measures code coverage.

**React Testing Library.** It renders components in jsdom and finds elements the way a user does: by role, text and label. A test checks the visible result and handler calls, not the internal structure of a component.

**Lighthouse.** It checks a page automatically by categories: accessibility, best practices, SEO and performance. For performance, LCP (the time the largest element appears), CLS (layout stability) and INP (response to actions) matter.

## 3 Work Progress

### 3.1 Environment Setup

The work is done in the branch `feature/frontend-testing` on the project from laboratory work 7. The packages `jest`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` and `identity-obj-proxy` are installed, and `babel-jest`, `@babel/core`, `@babel/preset-env` and `@babel/preset-react` are added so that JSX can be read. The scripts `test`, `test:watch` and `test:coverage` are set in `package.json`, and `jest.config.js` turns on the `jsdom` environment, style replacement through `identity-obj-proxy`, image replacement and coverage thresholds of 70, 60, 70 and 70 percent. The file `setupTests.js` connects the `jest-dom` matchers.

### 3.2 Tests of Pure Functions

Tests are written for five functions from `helpers.js`, listed in table 1. They relate to the subject area: the price of a plan, the change date of a project, filtering projects by notation, truncating text and the plural form of the word "file". The tests check the main scenarios and edge cases: a zero price, an incomplete date, an empty filter result, a text of exactly the maximum length and the numbers 11–14, which have a special plural form.

Table 1 – Pure functions of the DSLKit project and their checks

| Function | Purpose | Edge cases in tests |
|---|---|---|
| `formatPrice` | The price of a plan, the word "Free" for zero | Zero, another currency |
| `formatDate` | A date as day.month.year | Incomplete, empty and missing dates |
| `filterByNotation` | Projects of the chosen notation | The value "all", an empty result, the input array is not changed |
| `truncateText` | Truncating text with an ellipsis | An empty value, a text of exactly the maximum length |
| `pluralizeFiles` | The plural form of the word "file" | 1, 2, 5, 11, 14, 21, 22, 100 |

The tests and the code of the functions are given in appendices A and B.

### 3.3 Component Tests

All ten components are tested, covering the three groups of the assignment. The simple UI component `Button` is checked for its text, button type, variant class, passing of attributes and the handler call on click. The composite `NotationCard` and `NotationList` are checked for showing data from the mock arrays, the colour of the status label and the message for an empty list. The components with handlers `ProjectCard`, `ProjectList` and `PlanCard` are checked for calling functions passed through `props` with the right arguments. The root `App` is checked as an integration: the test checks the stubs that write to the console. Elements are found with `getByRole`, `getByText`, `getByLabelText`, `queryBy...` for missing elements and `data-testid` for list containers. Mocks are cleared after every test.

### 3.4 Debugging with the Developer Tools

For debugging, `App.jsx` uses `console.log` for simple events, and `console.group` with `console.table` for opening a project: the console shows a table of the project fields inside a group with its name. The network is studied in table 2: the application loads three resources, a document, one script and one stylesheet, so there are no slowest requests.

Table 2 – Resources loaded by the built application

| Resource | Size | Compressed size |
|---|---|---|
| `index.html` | 0.6 KB | 0.4 KB |
| `assets/index.js` | 227 KB | 72 KB |
| `assets/index.css` | 4.2 KB | 1.4 KB |

Screenshots of the Sources panel with a breakpoint and of React DevTools remain a task for the owner: they need manual work in a browser.

### 3.5 Performance Analysis with Lighthouse

The audit is run on the built application for desktop. Before the improvements Lighthouse found a broken heading order (notation cards came right after the level-one heading), an invalid `robots.txt` file and a missing `llms.txt`. The result before the improvements is shown in figure 1.

![Lighthouse report before the improvements](figures/lighthouse-before.jpg)

Figure 1 – Lighthouse before the improvements: accessibility 98, SEO 91

Three improvements are made. Notation cards get the heading level `h2` through a new prop `headingLevel`, and a correct `robots.txt` and a file `llms.txt` are added to the folder `public`. The result after the improvements is shown in figure 2, and the comparison of metrics is given in table 3.

![Lighthouse report after the improvements](figures/lighthouse-after.jpg)

Figure 2 – Lighthouse after the improvements: accessibility 100, best practices 100, SEO 100

Table 3 – Metrics before and after the improvements

| Metric | Before | After |
|---|---|---|
| Accessibility | 98 | 100 |
| Best practices | 100 | 100 |
| SEO | 91 | 100 |
| LCP, ms | 186 | 165 |
| CLS | 0.00 | 0.00 |

LCP and CLS are measured by a performance trace on a local server without network throttling, so the absolute values are small, and the LCP difference is within the measurement error.

### 3.6 Code Coverage

Running `npm run test:coverage` executes 54 tests in seven suites. Coverage of all files is 100 percent for statements, branches, functions and lines, which is above the thresholds of 70 and 60 percent. The final report is shown in figure 3. There are no uncovered places: conditional rendering branches and default values are checked by separate tests.

![Code coverage report](figures/coverage-report.jpg)

Figure 3 – Istanbul report: 100 percent coverage in all folders

### 3.7 Committing the Changes

The commit with the implementation: https://github.com/KsushaKhadzhinova/DSLKit-Project/commit/d8a95d7. The commit message: `feat: add unit tests, component tests, and performance audit with Lighthouse`.

## Conclusion

Jest and React Testing Library are set up for the React application of the DSLKit project, unit tests of five pure functions and tests of all components are written. Coverage is 100 percent with thresholds of 70 and 60. The Lighthouse audit found three remarks, and after fixing them accessibility rose to 100 and SEO to 100. What remains is to attach screenshots of the Sources panel and React DevTools and to check the application in Firefox and Edge.

## Appendix A – Listing of helpers.js

```js
// Pure helpers used by components and covered by the tests of lab 8.
export function formatPrice(amount, currency = 'USD') {
  if (amount === 0) return 'Бесплатно';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(isoDate) {
  const [year, month, day] = String(isoDate).split('-');
  return year && month && day ? `${day}.${month}.${year}` : '';
}

export function filterByNotation(projects, notation) {
  return notation === 'all' ? projects : projects.filter((project) => project.notation === notation);
}

export function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export function pluralizeFiles(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} файлов`;
  if (last === 1) return `${count} файл`;
  if (last >= 2 && last <= 4) return `${count} файла`;
  return `${count} файлов`;
}
```

## Appendix B – Listing of helpers.test.js

```js
import { filterByNotation, formatDate, formatPrice, pluralizeFiles, truncateText } from './helpers';

const projects = [
  { id: 1, notation: 'BPMN' },
  { id: 2, notation: 'ERD' },
  { id: 3, notation: 'BPMN' },
];

describe('formatPrice', () => {
  test('writes the free plan as a word', () => {
    expect(formatPrice(0)).toBe('Бесплатно');
  });

  test('formats dollars without cents', () => {
    expect(formatPrice(12)).toMatch(/12/);
    expect(formatPrice(12)).toMatch(/\$/);
  });

  test('accepts another currency', () => {
    expect(formatPrice(36, 'EUR')).toMatch(/€/);
  });
});

describe('formatDate', () => {
  test('turns an ISO date into day.month.year', () => {
    expect(formatDate('2026-10-12')).toBe('12.10.2026');
  });

  test('returns an empty string for an incomplete or missing date', () => {
    expect(formatDate('2026-10')).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});

describe('filterByNotation', () => {
  test('returns every project for "all"', () => {
    expect(filterByNotation(projects, 'all')).toHaveLength(3);
  });

  test('keeps only the matching notation', () => {
    expect(filterByNotation(projects, 'BPMN').map((project) => project.id)).toEqual([1, 3]);
  });

  test('returns an empty list when nothing matches and does not change the input', () => {
    expect(filterByNotation(projects, 'UML')).toEqual([]);
    expect(projects).toHaveLength(3);
  });
});

describe('truncateText', () => {
  test('cuts a long text and adds dots', () => {
    expect(truncateText('Очень длинный текст для проверки', 10)).toBe('Очень длин...');
  });

  test('keeps a short text and handles empty values', () => {
    expect(truncateText('Короткий', 20)).toBe('Короткий');
    expect(truncateText('', 5)).toBe('');
    expect(truncateText(null, 5)).toBe('');
  });

  test('does not cut a text of exactly the maximum length', () => {
    expect(truncateText('12345', 5)).toBe('12345');
  });
});

describe('pluralizeFiles', () => {
  test.each([
    [1, '1 файл'],
    [2, '2 файла'],
    [4, '4 файла'],
    [5, '5 файлов'],
    [11, '11 файлов'],
    [14, '14 файлов'],
    [21, '21 файл'],
    [22, '22 файла'],
    [100, '100 файлов'],
  ])('%i gives "%s"', (count, expected) => {
    expect(pluralizeFiles(count)).toBe(expected);
  });
});
```

## Appendix C – Listing of ProjectList.test.jsx

```jsx
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
```

## Appendix D – Listing of jest.config.js

```js
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/**/*.test.{js,jsx}', '!src/main.jsx', '!src/setupTests.js'],
  coverageThreshold: {
    global: { statements: 70, branches: 60, functions: 70, lines: 70 },
  },
};
```
