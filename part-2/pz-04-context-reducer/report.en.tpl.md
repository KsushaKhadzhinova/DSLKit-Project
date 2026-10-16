# Practical Session No. 4. Application State Management

## 1 Purpose of the Work

To master global state management in React with the Context API and the `useReducer` hook: to show the prop drilling problem, solve it with contexts and implement the business logic of the DSLKit project, a web editor for diagrams as code (SaaS direction), as a reducer and a provider.

## 2 Work Progress

### 2.1 The Prop Drilling Problem

The hierarchy `PropDrilling` → `DrillingHeader` → `Navigation` → `UserMenu` → `UserAvatar` passes the user name through all levels, although only `UserAvatar` uses it. Three intermediate components receive `userName` only to pass it on, so any data change requires edits along the whole chain. The code is given in Appendix A.

### 2.2 Theme and Language Contexts

`ThemeProvider` keeps the theme in `useState`, switches it with `toggleTheme` and writes it to the `data-theme` attribute of the root element, and CSS variables change the colors of the whole page. `LanguageProvider` keeps the language and a dictionary in Russian and English, components receive the `t(key)` function and do not accept texts through props. Context values are wrapped in `useMemo` so that consumers do not re-render without a data change.

### 2.3 Favorites with useReducer and Context

The domain is favorite diagram templates. The state is an array of identifiers. The reducer handles the actions `ADD` (without duplicates), `REMOVE`, `TOGGLE` and `CLEAR`, returns a new array and does not change the previous one, and leaves the state unchanged for an unknown action. `FavoritesProvider` exposes `favorites` and `dispatch`, so a template card and the "Favorites" panel work with one state without passing it through props. The list is saved to `localStorage` by an effect and read by the lazy initializer of `useReducer`. A wrong format and unavailable storage do not break the application.

### 2.4 Testing

Ten automated tests cover the reducer as a pure function, theme and language switching, adding, removing and clearing favorites, restoring after a reload, corrupted data, a storage write error and the prop drilling demo.

## Conclusion

Prop drilling is shown on a chain of five components and removed with the theme, language and favorites contexts. The business logic lives in a pure reducer, the state and `dispatch` are available in any component through the `useTheme`, `useLanguage` and `useFavorites` hooks, and favorites persist between sessions.

## Appendix A – Key Code Fragments

```jsx
// PropDrilling.jsx: userName passes through components that do not need it
<DrillingHeader userName={userName} />
// DrillingHeader → Navigation → UserMenu → UserAvatar
```

```jsx
// ThemeContext.jsx: theme provider
const [theme, setTheme] = useState('light');
const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
useEffect(() => {
  document.documentElement.dataset.theme = theme;
}, [theme]);
```

```jsx
// FavoritesContext.jsx: reducer and provider
export function favoritesReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return state.includes(action.id) ? state : [...state, action.id];
    case 'REMOVE':
      return state.filter((id) => id !== action.id);
    case 'TOGGLE':
      return state.includes(action.id) ? state.filter((id) => id !== action.id) : [...state, action.id];
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

const [favorites, dispatch] = useReducer(favoritesReducer, undefined, loadFavorites);
```

```jsx
// Templates.jsx: any component reads the state with a hook
const { favorites, dispatch } = useFavorites();
dispatch({ type: 'TOGGLE', id: template.id });
```
