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

Screenshots of the Sources panel with a breakpoint are given in section 3.8.

### 3.5 Performance Analysis with Lighthouse

The audit is run on the built application for desktop. Before the improvements Lighthouse found a broken heading order (notation cards came right after the level-one heading), an invalid `robots.txt` file, a missing `llms.txt` and a 404 error for the `favicon.ico` icon. The result before the improvements is shown in figure 1.

![Lighthouse report before the improvements](figures/lighthouse-before.jpg)

Figure 1 – Lighthouse before the improvements: performance 100, accessibility 98, best practices 96, SEO 91

Four improvements are made. Notation cards get the heading level `h2` through a new prop `headingLevel`, and a correct `robots.txt`, a file `llms.txt` and an icon `favicon.svg` linked in `index.html` are added to the folder `public`. The result after the improvements is shown in figure 2, and the comparison of metrics is given in table 3.

![Lighthouse report after the improvements](figures/lighthouse-after.jpg)

Figure 2 – Lighthouse after the improvements: all four categories 100

Table 3 – Metrics before and after the improvements

| Metric | Before | After |
|---|---|---|
| Performance | 100 | 100 |
| Accessibility | 98 | 100 |
| Best practices | 96 | 100 |
| SEO | 91 | 100 |
| FCP, ms | 347 | 352 |
| LCP, ms | 347 | 352 |
| CLS | 0.00 | 0.00 |
| TBT, ms | 0 | 0 |

FCP, LCP, CLS and TBT are taken from the same Lighthouse 13.5.0 reports (desktop profile, local server without network throttling), so the absolute values are small, and the FCP and LCP difference is within the measurement error.

### 3.6 Code Coverage

Running `npm run test:coverage` executes 54 tests in seven suites. Coverage of all files is 100 percent for statements, branches, functions and lines, which is above the thresholds of 70 and 60 percent. The final report is shown in figure 3. There are no uncovered places: conditional rendering branches and default values are checked by separate tests.

![Code coverage report](figures/coverage-report.jpg)

Figure 3 – Istanbul report: 100 percent coverage in all folders

### 3.7 Committing the Changes

The commit with the implementation: https://github.com/KsushaKhadzhinova/DSLKit-Project/commit/d8a95d7. The commit message: `feat: add unit tests, component tests, and performance audit with Lighthouse`.

### 3.8 Debugging in DevTools

Debugging was done in Chrome 155 on the development server.

The breakpoint is shown in Figure 4: in helpers.js it stands on the first line of the pluralizeFiles function.

![DevTools screenshot](figures/devtools-01-sources-breakpoint.png)

Figure 4 – The Sources panel: a breakpoint in helpers.js

The pause is shown in Figure 5: the Scope area holds the count parameter with the value 4 and the call stack lists the chain from main.jsx to ProjectCard.

![DevTools screenshot](figures/devtools-02-sources-paused.png)

Figure 5 – The Sources panel: a pause on the breakpoint, the Scope and Call Stack areas

The Step Over action is shown in Figure 6: line 22 is executed and the Scope area gets the variable lastTwo with the value 4.

![DevTools screenshot](figures/devtools-03-sources-step-over.png)

Figure 6 – The Sources panel: the Step Over action

The Step Into action is shown in Figure 7: the debugger moves to the next line of the function and shows the new variable values.

![DevTools screenshot](figures/devtools-04-sources-step-into.png)

Figure 7 – The Sources panel: the Step Into action

The console is shown in Figure 8: the handler output is marked with the file name and the line, for example App.jsx:21.

![DevTools screenshot](figures/devtools-05-console.png)

Figure 8 – The application console

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
