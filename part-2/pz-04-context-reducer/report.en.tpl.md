# Practical Session No. 4. Application State Management

## 1 Purpose of the Work

To master global state management in React with the Context API and the `useReducer` hook: to show the prop drilling problem, solve it with contexts and implement the business logic of the DSLKit project, a web editor for diagrams as code (SaaS direction), as a reducer and a provider.

## 2 Work Progress

### 2.1 The Prop Drilling Problem

The hierarchy `PropDrilling` → `DrillingHeader` → `Navigation` → `UserMenu` → `UserAvatar` passes the user name through all levels, although only `UserAvatar` uses it. Three intermediate components receive `userName` only to pass it on, so any data change requires edits along the whole chain. The code is given in Appendix A.

### 2.2 Theme and Language Contexts

`ThemeProvider` keeps the theme in `useState`, switches it with `toggleTheme` and writes it to the `data-theme` attribute of the root element, and CSS variables change the colors of the whole page. `LanguageProvider` keeps the language and a dictionary in Russian and English, components receive the `t(key)` function and do not accept texts through props. Context values are wrapped in `useMemo` so that consumers do not re-render without a data change.

### 2.3 Favorites on useReducer and Context

The subject area is favorite diagram templates. The state is an array of identifiers. The reducer handles the actions `ADD` (without duplicates), `REMOVE`, `TOGGLE` and `CLEAR`, returns a new array and never changes the old one, and an unknown action leaves the state unchanged. `FavoritesProvider` provides `favorites` and `dispatch`, so a template card and the "Избранное" panel work with one state without passing it through props. The list is saved to `localStorage` by an effect and read by the lazy initializer of `useReducer`.

### 2.4 Resistance to Foreign Data

The content of `localStorage` can be edited by hand. The `sanitizeFavorites` function keeps only known template identifiers, once each. The theme and the language are accepted from storage only with valid values, otherwise the theme follows the system setting and the language is Russian. Blocked storage and broken JSON do not break the application. Texts are rendered as text, so markup in a user name is not executed, and an empty name in the prop drilling chain is replaced by a question mark. The 500 page is shown through `ErrorBoundary` when rendering fails.

### 2.5 Appearance

The application uses the styles and markup of the first-part site: a sticky header with the logo and a menu of the page sections, a language button, a moon and sun theme switch with a tooltip, cards and a footer. The theme switch and the language button read the same contexts as the other components, and the header labels change with the language.

### 2.6 Demonstration

Diagram templates in cards with favorite buttons are shown in figure 1.

![Diagram templates](figures/01-templates.png)

Figure 1 – Template cards with the "В избранное" buttons in the light theme

Two chosen templates go into the "Избранное" panel, where the counter is visible, as in figure 2.

![Favorites panel](figures/02-favorites.png)

Figure 2 – The "Избранное" panel with two templates and the selected counter

Switching the theme changes the colours of the whole page, which figure 3 shows.

![Dark theme](figures/03-dark-theme.png)

Figure 3 – The page in the dark theme with the tooltip at the switch

Changing the language translates the headings, the template names and the button labels, as in figure 4.

![English language](figures/04-english.png)

Figure 4 – The page after switching the language to English

### 2.7 Testing

Nineteen automated tests check the reducer as a pure function, the theme and language switching, saving of the choice, adding, removing and clearing favorites, restoring after a reload, broken data, a storage write error, the prop drilling demo, markup rendered as text and the 500 page.

## Conclusion

Prop drilling is shown on a chain of five components and removed with the theme, language and favorites contexts. The business logic lives in a pure reducer, the state and `dispatch` are available in any component through the `useTheme`, `useLanguage` and `useFavorites` hooks, and favorites persist between sessions.

## Appendix A (mandatory) Key Code Fragments

```jsx
// PropDrilling.jsx: userName passes through components that do not need it
<DrillingHeader userName={userName} />
// DrillingHeader → Navigation → UserMenu → UserAvatar
```

```jsx
// ThemeContext.jsx: theme provider
const [theme, setThemeState] = useState(readTheme);
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
