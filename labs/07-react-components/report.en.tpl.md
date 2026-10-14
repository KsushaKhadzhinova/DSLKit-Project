# Laboratory Work No. 7. Building a Component Interface with React

## 1 Purpose of the Work

To master the component approach in React, JSX and data passing through `props` on the example of the DSLKit project, a web editor for diagrams as code that belongs to the SaaS direction and matches the future course project, and to prepare a component base for the following works.

## 2 Brief Theoretical Background

**Component approach.** An interface is assembled from small independent parts, each with its own markup, styles and logic. A component takes data through `props` and returns a description of the interface, so it can be reused and checked on its own.

**JSX.** It is a JavaScript syntax extension that looks like HTML. The differences: `className` is written instead of `class`, `htmlFor` instead of `for`, attributes use camelCase such as `onClick`, any expression is inserted in curly braces, and every tag must be closed.

**SPA and Virtual DOM.** A single-page application loads once and changes its content without reloading the page. React keeps a light copy of the interface tree in memory (the Virtual DOM), compares the old and the new copies on a change, and updates only the differing nodes in the real DOM.

**React, Vue and Angular.** React provides a library for the interface and leaves the choice of other tools to the developer. Vue offers a progressive framework with templates and a gentler learning curve. Angular is a full framework with TypeScript, dependency injection and a strict structure.

## 3 Work Progress

### 3.1 Environment and Project Structure

The work is done in the branch `feature/react-components`, and the application lives in the folder `react-app`. The project is created with Vite, and `react`, `react-dom` and `react-router-dom` are installed, the latter is not used in this work. The folder structure matches the assignment and the components are listed in table 1.

Table 1 – Components of the DSLKit application

| Component | Group | Purpose |
|---|---|---|
| `Button` | ui | Universal button with the variants `primary` and `quiet` |
| `Card` | ui | A container with a title, the content comes through `children` |
| `Badge` | ui | A status label, the colour is set by the prop `tone` |
| `Header` | layout | Title, links to sections, a beta signup button |
| `Footer` | layout | A footer with the year and the owner from props |
| `NotationCard` | features | A notation card built from `Card` and `Badge` with a code example |
| `NotationList` | features | A list of notation cards |
| `ProjectCard` | features | A project card with an "Open" button |
| `ProjectList` | features | A project list with a notation choice |
| `PlanCard` | features | A plan with a price, features and a "Choose" button |

### 3.2 Base Components and Composition

The base components `Button`, `Card` and `Badge` know nothing about the subject area. `Button` takes a variant, a handler and the other attributes through the `...props` operator. `Card` shows an optional title and inserts `children` into the block. Subject components are built from them: `NotationCard` consists of `Card` and `Badge`, and `ProjectCard` adds `Button`. This hierarchy is shown in appendices A and B.

### 3.3 Props, Lists and Conditional Rendering

Data flows only downward. The root component passes `ProjectList` an array of projects, a list of notations and handlers, and it passes each `ProjectCard` one project. Lists are rendered with `map`, and every item has a `key` with a unique `id`. Conditional rendering is used in `Card` (the title is shown only when passed), in `ProjectCard` (the "Shared" label only for shared projects) and in the lists (a message for an empty array). Computed values are inserted as expressions in curly braces, for example `formatDate(project.updated)`.

### 3.4 Mock Data and Handlers

The folder `data` holds three arrays: six notations, eight projects and three plans. The application has no state, so handlers are stubs: pressing buttons and changing the notation choice write a message to the console through `console.log`. The notation choice in the project list only reports the value to the parent and does not filter the list, because that needs state, which comes in the next work.

### 3.5 Styling and Checking on Different Screens

CSS modules are created for the components, and the shared golden-ratio tokens, sizes and colours live in `index.css`. The card grid changes the number of columns at 576 and 1024 pixels following the mobile-first principle. The result on a 375 pixel screen is shown in figure 1.

![The application on a 375 pixel screen](figures/mobile-375.jpg)

Figure 1 – Mobile version: cards go in one column and the header wraps

On a 768 pixel tablet the cards take two columns, as shown in figure 2.

![The application on a 768 pixel screen](figures/tablet-768.jpg)

Figure 2 – Tablet: two columns of cards

On a 1280 pixel screen the cards take three columns, as shown in figure 3.

![The application on a 1280 pixel screen](figures/desktop-1280.jpg)

Figure 3 – Desktop: three columns of cards

### 3.6 Testing

An automated test reads the source files and checks the folder structure, the number of components, the function form of components, the size of mock data, the presence of `key` in lists, handler stubs, CSS modules and the absence of `useState` and `useEffect`. The application is additionally checked in Chrome: the console has no errors, and four stubs write messages to the console. A screenshot of the Components tab of React DevTools and testing in Firefox and Edge remain a task for the acceptance stage.

### 3.7 Committing the Changes

The commit with the implementation: https://github.com/KsushaKhadzhinova/DSLKit-Project/commit/f4a22b1. The commit message: `feat(react): add the DSLKit component library with mock data, props and CSS modules on Vite`.

## 4 Answers to Control Questions

{{answers}}
1. **JSX and HTML.** JSX is written inside JavaScript and turns into function calls. Three differences: `className` instead of `class`, `htmlFor` instead of `for`, and expressions in curly braces such as `{project.name}`.
2. **Passing through props.** The parent passes data as attributes, and the child component receives them as an object. In the project `ProjectList` passes `ProjectCard` a project and a handler: `<ProjectCard project={project} onOpen={onOpen} />`.
3. **Advantages of components.** Reuse, isolation of styles and logic, easy testing and a clear hierarchy. In plain JavaScript markup, handlers and state are tangled, and they are harder to change.
4. **Virtual DOM.** React builds a light tree in memory, compares it with the previous one and applies only the differing changes to the real DOM. This reduces the number of expensive DOM operations.
5. **React, Vue and Angular.** By learning curve Vue is the easiest, then React, and Angular is harder because of TypeScript and many concepts. By performance all three use efficient updates, and the differences show only in large interfaces. By ecosystem React has the widest one, Angular has much built in, and Vue sits in the middle.
6. **Pure components.** A component as a pure function always returns the same result for the same `props` and changes no outside data. This lets React safely skip needless renders and makes tests simpler.
7. **JavaScript in JSX.** An expression is written in curly braces: `Updated {formatDate(project.updated)}`. Function calls, conditions with `&&` and the ternary operator are allowed inside, but not the statements `if` and `for`.
8. **Props and state.** Props come from the parent and do not change inside the component, state belongs to the component and changes the interface. In this work all data is static and the assignment forbids `useState`, so there is no state.
9. **Conditional rendering.** `&&` and the ternary operator are used: `{title && <h3>{title}</h3>}` in `Card` and `{visible.length === 0 ? <p>…</p> : <ul>…</ul>}` in `ProjectList`.
10. **Lists and key.** An array becomes elements with `map`. The `key` attribute with a unique `id` helps React match elements between renders and not recreate extra ones.
11. **Lifting state up.** When several components must share data, the state is moved to the nearest common parent and passed down through `props`. In the project the notation filter will appear in `App` and will control `ProjectList`.
12. **Types of props.** Strings, numbers, booleans, objects, arrays and functions can be passed. In the project these are the string `title`, the number `year`, the object `project`, the array `notations` and the function `onOpen`.
13. **Composition and children.** A component outputs `{children}` where the nested content should be. `Card` wraps any content, and `NotationCard` puts a `Badge`, a paragraph and code into it.
14. **Fragments.** The form `<>…</>` groups several elements without an extra node in the DOM. In `App` the fragment joins the header, the main content and the footer.
15. **Events without state.** A handler is passed through `onClick` or `onChange` and calls a stub function such as `console.log`. In `App` such stubs are passed down as `props`.
16. **CSS modules in Vite.** It is enough to name the file `Name.module.css` and import it: `import styles from './Button.module.css'`. Vite makes class names unique, and no setup is needed.
17. **Vite and Create React App.** Vite starts the development server almost instantly thanks to native browser modules, updates the page quickly and builds the project with a modern bundler, while Create React App is no longer developed.
18. **Mock data.** Arrays are imported into the root `App` from the folder `data` and passed to child components through `props`, so components do not depend on the data source.
19. **UI and subject components.** `Button`, `Card` and `Badge` know nothing about the subject area and fit any project. `NotationCard`, `ProjectCard` and `PlanCard` know the DSLKit data, so they live in `features`.
20. **Project development.** The next works add state with `useState` and `useEffect`, routing with React Router, loading data from an API as in laboratory work 6, and component tests.
{{/answers}}

## Conclusion

An application on Vite and React with ten components is created for the DSLKit project: base, layout and subject ones. Data is passed through `props`, lists are rendered with `key`, conditional rendering and composition are used in several places, and handlers are stubs. The rule about the absence of `useState` and `useEffect` is checked by an automated test, and the layout is confirmed on three screen widths. What remains is to attach a React DevTools screenshot and to check the application in Firefox and Edge.

## Appendix A – Listing of Button.jsx

{{code:react-app/src/components/ui/Button.jsx}}

## Appendix B – Listing of Card.jsx

{{code:react-app/src/components/ui/Card.jsx}}

## Appendix C – Listing of NotationCard.jsx

{{code:react-app/src/components/features/NotationCard.jsx}}

## Appendix D – Listing of ProjectList.jsx

{{code:react-app/src/components/features/ProjectList.jsx}}

## Appendix E – Listing of App.jsx

{{code:react-app/src/App.jsx}}
