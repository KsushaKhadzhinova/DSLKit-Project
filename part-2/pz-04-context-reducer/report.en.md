# Practical Session No. 4. Application State Management

## 1 Purpose of the Work

To master global state management in React with the Context API and the `useReducer` hook: to show the prop drilling problem, solve it with contexts and implement the business logic of the DSLKit project, a web editor for diagrams as code (SaaS direction), as a reducer and a provider. The work is done in the `pz24` branch, the code is in the `part-2/pz-04-context-reducer` folder.

## 2 Work Progress

### 2.1 The Prop Drilling Problem

The hierarchy `PropDrilling`, `DrillingHeader`, `Navigation`, `UserMenu` and `UserAvatar` passes the user name through all levels, although only `UserAvatar` uses it. Three intermediate components receive `userName` only to pass it on, so any data change requires edits along the whole chain. The code of the chain is given in Appendix A.

### 2.2 Theme and Language Contexts

`ThemeProvider` keeps the theme in `useState`, switches it with `toggleTheme` and writes it to the `data-theme` attribute of the root element, and CSS variables change the colors of the whole page. `LanguageProvider` keeps the language and a dictionary in Russian and English, components receive the `t(key)` function and do not accept texts through props. Context values are wrapped in `useMemo` so that consumers do not re-render without a data change.

### 2.3 Favorites with useReducer and Context

The domain is favorite diagram templates. The state is an array of `{ id, addedAt }` records. The reducer handles the actions `ADD` without duplicates, `REMOVE`, `TOGGLE` and `CLEAR`, returns a new array and does not change the previous one, and leaves the state unchanged for an unknown action. The time of adding comes in the action, so the reducer stays a pure function. The provider exposes the state and `dispatch` through two separate contexts: components that only send actions do not re-render when the list changes. The list is saved to `localStorage` by an effect and read by the lazy initializer of `useReducer`. Data of a wrong format and unavailable storage do not break the application.

### 2.4 Creation Time and Error Page

Every template in the list shows its creation time, and every favorite shows the time it was added, in the format "2026-10-16 12:30:05", so the records differ visually. The `ErrorBoundary` component shows a styled 500 page with a reload button instead of a blank screen if rendering fails with an error.

### 2.5 Input Validation

The work has no input fields, so checks of length, empty and whitespace-only values and the `limits.json` file are not needed here. The only external data source, the `localStorage` content, is checked: the value must be an array of records with a numeric `id` and a string `addedAt`, otherwise an empty list is used.

### 2.6 Testing

Thirteen automated tests cover the reducer as a pure function, theme and language switching, adding, removing and clearing favorites, creation and adding times, restoring after a reload, corrupted data and data of the old format, a storage write error, the error page and the prop drilling demo. Running instructions are in `README.md`.

## 3 Answers to Control Questions

The answers cover questions 25, 26 and 27, which match variant 26.

25. Yes. `useReducer` does not depend on Context: a component can keep `const [state, dispatch] = useReducer(reducer, initial)` and use it locally, for example for a form with several related fields or a counter with the actions `inc`, `dec` and `reset`. Context is needed only when components at different tree levels must read the state.
26. Context with `useReducer` is built into React, needs no dependencies and fits a small project such as DSLKit with a theme, a language and favorites. Redux adds middleware, selectors with fine-grained subscriptions, `Redux DevTools` with an action history and a strict structure, so it scales better to many entities but needs more code and packages. The downside of Context: all consumers re-render when the value changes, and there are no ready selectors or debugging tools.
27. Split the Context in two: one holds the state, the other only `dispatch`. The `dispatch` function from `useReducer` does not change between renders, so components that only send actions subscribe to the `dispatch` context and do not re-render when the list changes. The work does this in `FavoritesContext.jsx` with the hooks `useFavorites` and `useFavoritesDispatch`.

## Conclusion

Prop drilling is shown on a chain of five components and removed with the theme, language and favorites contexts. The business logic lives in a pure reducer, the state and `dispatch` are available in any component through the `useTheme`, `useLanguage`, `useFavorites` and `useFavoritesDispatch` hooks, favorites persist between sessions, and records differ by creation time.

## Appendix A – Prop Drilling Chain

```jsx
// PropDrilling.jsx: userName passes through components that do not need it
<DrillingHeader userName={userName} />
// DrillingHeader, Navigation, UserMenu, UserAvatar
```

## Appendix B – Theme Provider

```jsx
const [theme, setTheme] = useState('light');
const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
useEffect(() => {
  document.documentElement.dataset.theme = theme;
}, [theme]);
```

## Appendix C – Favorites Reducer and Provider

```jsx
export function favoritesReducer(state, action) {
  const has = state.some((item) => item.id === action.id);
  switch (action.type) {
    case 'ADD':
      return has ? state : [...state, { id: action.id, addedAt: action.addedAt }];
    case 'REMOVE':
      return state.filter((item) => item.id !== action.id);
    case 'TOGGLE':
      return has ? state.filter((item) => item.id !== action.id) : [...state, { id: action.id, addedAt: action.addedAt }];
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

const [favorites, dispatch] = useReducer(favoritesReducer, undefined, loadFavorites);
```
