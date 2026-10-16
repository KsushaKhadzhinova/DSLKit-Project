# Laboratory Work No. 4. State Management in a React Application

## 1 Purpose of the Work

To master local state management in React with the `useState` and `useEffect` hooks, side effect handling and dynamic interface updates on the example of a diagram list of the DSLKit project, a web editor for diagrams as code (SaaS direction).

## 2 Brief Description of the Application

The application shows the list of a user's diagrams. A diagram has a title, a notation (UML, BPMN, ERD, DFD, IDEF0, Petri nets), a status, "Draft" or "Published", and a modification date. The user adds a diagram with a form, renames it, changes its status, deletes it, searches by title, filters by status and sorts by date or title. The list survives a page reload because it is stored in `localStorage`.

The project is created on Vite with `npm create vite@latest` and the React template, tests use Vitest and React Testing Library. Running instructions are in the `README.md` of the work.

## 3 Work Progress

### 3.1 Component State

The array of diagrams, the title input, the selected notation, the search string, the status filter and the sort mode are kept with `useState`. Array changes use functional updates such as `setDiagrams((prev) => ...)`, so quick consecutive actions do not overwrite each other. The input is controlled, and the form is submitted by the button and by the Enter key. Key parts of the code are given in Appendix A.

### 3.2 Storage in localStorage

The storage logic is extracted into the `useLocalStorage` hook. The initial value is read from `localStorage` by the `useState` initializer function, so saved data is visible on the first render. A `useEffect` that depends on the value writes the array with `JSON.stringify` on every change. If the key is missing or the JSON is broken, the initial set of three diagrams is used.

### 3.3 Filtering, Sorting and Statistics

The functions `filterDiagrams`, `sortDiagrams` and `getStats` are pure and live in `utils/diagrams.js`, so they are tested without rendering. Sorting works on a copy of the array and does not change the state.

### 3.4 Additional Effects

The tab title is updated by an effect and shows the number of diagrams. The `useAutosaveStatus` hook shows "Saving…" after a change and "Saved" after 500 ms of quiet. This is a debounce: every new change clears the previous timer with the effect cleanup function.

### 3.5 Input Validation

The form and the edit mode check the diagram title before saving. A value made of spaces only counts as empty and is rejected with the message "Введите название диаграммы". A title longer than the limit is rejected with a message that names the allowed number of characters. The limit and the minimum length live in a separate file, `src/limits.json`, not in the component code. The "Создана" field of every record shows a unique creation time with seconds, so records differ visually. The `ErrorBoundary` component shows a styled message instead of a blank page when rendering fails.

### 3.6 Testing

The automated tests (19 in total) cover the pure functions, both hooks and the application behavior: adding, deleting, editing with Enter and Esc, status toggling, filters, sorting and restoring the list after a re-render. Manual check: `npm run dev`, then the steps from the "What to check" section of `README.md`, the `localStorage` content is viewed in the Application tab of the developer tools.

## Conclusion

The Vite application implements adding, deleting and editing diagrams, filtering and sorting, saving to `localStorage` and two additional effects, the page title and autosave with debounce. The storage logic is extracted into a custom hook, which will simplify replacing `localStorage` with a REST API in laboratory work No. 5.

## Appendix A – Key Code Fragments

```jsx
// hooks/useLocalStorage.js: load through an initializer, save with an effect
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readStorage(key, initialValue));
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}
```

```jsx
// hooks/useAutosaveStatus.js: 500 ms debounce with timer cleanup
useEffect(() => {
  setStatus('saving');
  const timer = setTimeout(() => setStatus('saved'), AUTOSAVE_DELAY);
  return () => clearTimeout(timer);
}, [value]);
```

```jsx
// App.jsx: functional state updates and the page title
const deleteDiagram = (id) => setDiagrams((prev) => prev.filter((d) => d.id !== id));

useEffect(() => {
  document.title = `DSLKit: диаграмм ${diagrams.length}`;
}, [diagrams.length]);
```
