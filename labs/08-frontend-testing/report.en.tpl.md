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

## 4 Answers to Control Questions

{{answers}}
1. **Kinds of testing.** Unit tests of pure functions and components in isolation and an integration test of the root component are used. A unit test checks one part in isolation, an integration test checks several parts working together.
2. **Jest.** Grouping through `describe`, separate checks through `test` and `test.each`, assertions through `expect`, fake functions `jest.fn()`, watching with `jest.spyOn` and clearing with `jest.clearAllMocks()`.
3. **Mocks.** A mock replaces a real dependency with a controlled one. In the project `jest.fn()` replaces the `onOpen` handler, and `jest.spyOn(console, 'log')` intercepts console output.
4. **render and queries.** The function `render` mounts a component in jsdom. `getByRole`, `getByText`, `getByLabelText`, `getAllByRole` and `queryByRole` are used for searching.
5. **A click test.** `render(<Button onClick={fn}>Click</Button>); fireEvent.click(screen.getByText('Click')); expect(fn).toHaveBeenCalledTimes(1);`.
6. **Useful tools.** The Console tab showed the order of stub calls, Network confirmed the small size of resources, and Sources with a breakpoint in the project opening handler lets one see the value of `project` in the Scope panel.
7. **Lighthouse metrics.** LCP shows the time the largest element appears, CLS measures unexpected layout shifts, and INP replaced FID and measures the response to user actions.
8. **Improvements.** The heading order is fixed, and a correct `robots.txt` and `llms.txt` are added, so accessibility rose from 98 to 100 and SEO from 91 to 100.
9. **Coverage.** It is the share of code executed by tests. It shows unchecked places. 100 percent is reached, but a high percentage does not guarantee the absence of errors.
10. **Uncovered places.** The `lcov-report` report highlights unexecuted lines and branches. For conditional branches, tests are added for an empty list, a missing title, a private project and a free plan.
11. **getBy and queryBy.** `getBy` throws an error if the element is missing and suits checking presence. `queryBy` returns `null`, so it is used to check absence: `expect(screen.queryByRole('heading')).not.toBeInTheDocument()`.
12. **A list through props.** A mock array is passed, then the number of elements and their content are checked: `expect(screen.getAllByRole('listitem')).toHaveLength(mockNotations.length)`, and the headings are compared with the array.
13. **data-testid.** It is needed when an element has no role or stable text, for example a list container. Text and roles are preferable because they are closer to what a user sees, so `data-testid` is used only for list containers.
14. **Handler call.** `const onOpen = jest.fn(); render(<ProjectCard project={p} onOpen={onOpen} />); fireEvent.click(screen.getByRole('button', { name: 'Open' })); expect(onOpen).toHaveBeenCalledWith(p);`.
15. **Accessibility.** Lighthouse pointed at a broken heading order: `h3` came right after `h1`. It is fixed by adding the prop `headingLevel` and the level `h2` for notation cards.
{{/answers}}

## Conclusion

Jest and React Testing Library are set up for the React application of the DSLKit project, unit tests of five pure functions and tests of all components are written. Coverage is 100 percent with thresholds of 70 and 60. The Lighthouse audit found three remarks, and after fixing them accessibility rose to 100 and SEO to 100. What remains is to attach screenshots of the Sources panel and React DevTools and to check the application in Firefox and Edge.

## Appendix A – Listing of helpers.js

{{code:react-app/src/utils/helpers.js}}

## Appendix B – Listing of helpers.test.js

{{code:react-app/src/utils/helpers.test.js}}

## Appendix C – Listing of ProjectList.test.jsx

{{code:react-app/src/components/features/ProjectList.test.jsx}}

## Appendix D – Listing of jest.config.js

{{code:react-app/jest.config.js}}
