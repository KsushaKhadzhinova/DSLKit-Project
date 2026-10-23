# Practical Session No. 4. Application State Management

## 1 Purpose of the Work

To master global state management in React with the Context API and the `useReducer` hook: to show the prop drilling problem, solve it with contexts and implement the business logic of the DSLKit project, a web editor for diagrams as code (SaaS direction), as a reducer and a provider.

## 2 Work Progress

### 2.1 The Prop Drilling Problem

The hierarchy `PropDrilling` → `DrillingHeader` → `Navigation` → `UserMenu` → `UserAvatar` passes the user name through all levels, although only `UserAvatar` uses it. Three intermediate components receive `userName` only to pass it on, so any data change requires edits along the whole chain. The code is given in Appendix A.

The solution is shown next to it in the same page section. The user name lives in `UserContext`, while `ContextHeader`, `ContextNavigation` and `ContextMenu` receive no props: `ContextAvatar` reads the name with the `useUser` hook. The nesting depth is the same, but the passing of data down the chain disappears and adding a level needs no edits.

### 2.2 Theme and Language Contexts

`ThemeProvider` keeps the theme in `useState`, switches it with `toggleTheme` and writes it to the `data-theme` attribute of the root element, and CSS variables change the colors of the whole page. `LanguageProvider` keeps the language and a dictionary in Russian and English, components receive the `t(key)` function and do not accept texts through props. Context values are wrapped in `useMemo` so that consumers do not re-render without a data change.

### 2.3 Favorites on useReducer and Context

The subject area is favorite diagram templates. The state is an array of `{ id, qty }` objects. The reducer handles the actions `ADD` (without duplicates), `REMOVE`, `TOGGLE`, `INCREMENT`, `DECREMENT`, `SET_QTY` and `CLEAR`, returns a new array and never changes the old one, and an unknown action leaves the state unchanged. The quantity is always a whole number from 1 to the `maxQty` limit of `limits.json`, and a value out of range, fractional or not a number is replaced by the nearest valid one. `FavoritesProvider` is split into two contexts: the data (`useFavorites`) changes with every action, while `dispatch` (`useFavoritesDispatch`) never changes, so a component that only sends actions is not re-rendered when the data changes. A template card and the "Избранное" panel work with one state without passing it through props, and the panel has "minus" and "plus" buttons and the current quantity. The list is saved to `localStorage` by an effect and read by the lazy initializer of `useReducer`.

The "Undo" and "Redo" buttons in the favorites panel work through the `withHistory` function. It wraps the reducer and keeps the state as `{ past, present, future }`. An action that changes nothing creates no history step, and a new change clears the redo steps. The favorites reducer itself stays the same and is checked by the same tests.

### 2.4 Resistance to Foreign Data

The content of `localStorage` can be edited by hand. The `sanitizeFavorites` function keeps only known template identifiers, once each, repairs a damaged quantity and accepts the old format with a list of identifiers as quantity 1. The theme and the language are accepted from storage only with valid values, otherwise the theme follows the system setting and the language is Russian. Blocked storage and broken JSON do not break the application. Texts are rendered as text, so markup in a user name is not executed, and an empty name in the prop drilling chain is replaced by a question mark. The 500 page is shown through `ErrorBoundary` when rendering fails.

### 2.5 Appearance

The application uses the styles and markup of the first-part site: a sticky header with the logo and a menu of the page sections, a language button, a moon and sun theme switch with a tooltip, cards and a footer. The theme switch and the language button read the same contexts as the other components, and the header labels change with the language.

### 2.6 Demonstration

Diagram templates in cards with the favorite buttons are shown in figure 1.

![Diagram templates](figures/01-templates.png)

Figure 1 – Template cards with the "В избранное" buttons in the light theme

Two chosen templates go to the "Избранное" panel, where the counter is visible, as in figure 2.

![Favorites panel](figures/02-favorites.png)

Figure 2 – The "Избранное" panel with two templates and the counter of chosen items

The buttons with the signs "+" and "−" change the quantity through reducer actions, and figure 3 shows the result.

![Quantity in favorites](figures/08-quantity.png)

Figure 3 – The "Избранное" panel with the quantity 3 for the first template

After the page is reloaded the choice and the quantity are kept, as figure 4 shows.

![Favorites after reload](figures/05-after-reload.png)

Figure 4 – The "Избранное" panel after a page reload

The theme switch changes the colors of the whole page, as figure 5 shows.

![Dark theme](figures/03-dark-theme.png)

Figure 5 – Page in the dark theme with the tooltip at the switch

Changing the language translates the headings, the template names and the button labels, as in figure 6.

![English language](figures/04-english.png)

Figure 6 – Page after switching the language to English

The prop drilling problem and its solution through the context stand side by side, as in figure 7.

![Prop drilling problem and solution](figures/06-prop-drilling.png)

Figure 7 – Block with the name passed through props and the block with the same name from `UserContext`

The "Очистить" button resets the list with the `CLEAR` action and the panel shows a message, as in figure 8.

![Empty favorites](figures/09-cleared.png)

Figure 8 – The "Избранное" panel after the list is cleared

On a phone width of 375 pixels the blocks go in one column, as in figure 9.

![Page on a phone](figures/07-mobile.png)

Figure 9 – Application page on a screen 375 pixels wide

### 2.7 Testing

Thirty-eight automated tests check the reducer as a pure function, the quantity change with its limits, the split of the contexts (the number of re-renders), the prop drilling problem and its solution, a double click on the buttons, the theme and language switching, saving of the choice, adding, removing and clearing favorites, restoring after a reload, broken data, a storage write error, the prop drilling demo, markup rendered as text and the 500 page.

## Conclusion

Prop drilling is shown on a chain of five components and removed with the theme, language and favorites contexts, and the block with the solution stands next to the problem. The business logic lives in a pure reducer, the state and `dispatch` are available in any component through the `useTheme`, `useLanguage`, `useFavorites` and `useFavoritesDispatch` hooks, and favorites persist between sessions.

## Answers to Control Questions

{{answers}}
1. **What is prop drilling?** Passing data through a chain of components that do not need it. Any change of the data requires edits along the whole chain.
2. **How to create and use the Context API?** Create `createContext`, wrap the tree in a `Provider` with a value and read the value with `useContext` in any descendant.
3. **What is the advantage of `useReducer`?** The transition logic is collected in one pure function, it is easy to test, and updates are described by actions.
4. **How to combine Context and `useReducer`?** Create `[state, dispatch] = useReducer(...)` in the provider and pass them in `value`. In the project `FavoritesProvider` works this way.
5. **How to prevent extra re-renders?** Memoize the value with `useMemo`, split the contexts by purpose and use `React.memo`.
6. **Which data suits Context?** Rarely changing global data: theme, language, user.
7. **How to split Context into several?** Create separate contexts and nest their providers, like `ThemeProvider`, `LanguageProvider` and `FavoritesProvider`.
8. **What is `useMemo` and how does it help?** It remembers a calculated value until the dependencies change, so the object in `value` is not created again and the consumers are not re-rendered for nothing.
9. **How to handle in a reducer an action that depends on the state?** Read `state` inside the `case`, as in `ADD`: if the identifier is already there, return the old state.
10. **How to save a cart to `localStorage`?** Write the state with an effect on every change and read it with the lazy initializer of `useReducer`, checking the data format.
11. **What is the difference between `useState` and `useReducer`?** `useState` suits simple independent values, `useReducer` suits related fields and complex transitions.
12. **How to pass `dispatch` through Context?** Put it in a context of its own and get it in the descendant: `const dispatch = useFavoritesDispatch()`.
13. **What are actions?** Plain objects with a `type` field and data: `{ type: 'INCREMENT', id: 2 }`. The type is written as a constant or an upper-case string.
14. **How to handle several state fields?** Keep an object and return a copy with the changed field `{ ...state, cart: ... }` or split into several reducers.
15. **How to avoid mutation?** Return new arrays and objects: `[...state, item]` and `filter`, not `push` and field assignment.
16. **How to subscribe to a part of the state?** Split the context into several or calculate the derived value in the component. Exact selectors need an external library.
17. **How to use several `useReducer`?** Call the hook several times with different reducers, each has its own state and `dispatch`.
18. **How to implement a reset?** Add a `RESET` action that returns the initial state. In the project it is `CLEAR`.
19. **How to debug `dispatch`?** Print the `action` and the state to the console inside the reducer or wrap `dispatch` in a logging function, and use the React developer tools.
20. **How to pass the initial state as a function?** As the third argument `useReducer(reducer, arg, init)`. In the project `useReducer(favoritesReducer, undefined, loadFavorites)`.
21. **How to memoize the provider value?** `const value = useMemo(() => ({ favorites, dispatch }), [favorites])`. In the project the data and `dispatch` are in two contexts, and `dispatch` never changes, so only the data context needs the new value.
22. **What is an action creator?** A function that returns an action object: `const increment = (id) => ({ type: 'INCREMENT', id })`.
23. **How to organize authentication?** The state `{ user, status }` and the actions `LOGIN` and `LOGOUT` in the reducer, and keep the token outside the state or in a protected storage.
24. **How to implement undo?** Keep a history `{ past, present, future }`, and the `UNDO` action moves the last state from `past` to `present`. The work does exactly this: the `withHistory` function wraps the favorites reducer, keeps up to twenty steps and adds the `UNDO` and `REDO` actions.
25. **Can `useReducer` be used without Context?** Yes, for the local state of one component, for example a form or a counter: `const [n, dispatch] = useReducer(r, 0)`.
26. **How does Context plus `useReducer` differ from Redux?** It is simpler and needs no dependencies for small projects, but there are no debugging tools, middleware and exact subscriptions as in Redux.
27. **How to get only `dispatch`?** Move `dispatch` to a separate context, then the component is not re-rendered when the state changes. The project does exactly this with `useFavoritesDispatch`.
28. **What is a thunk and how to imitate asynchronous actions?** It is a function instead of an action object. In `useReducer` the asynchronous code is run in a handler and `dispatch` is called with the result.
29. **How to fix extra re-renders?** Split the context into two, for the data and for `dispatch`, and memoize the values. The project has the two contexts `useFavorites` and `useFavoritesDispatch`, and a test counts the renders.
30. **How to test a reducer?** Call the function directly: `expect(reducer([], { type: 'ADD', id: 1 })).toEqual([{ id: 1, qty: 1 }])`. The tests of the project are written this way.
{{/answers}}

## Appendix A (mandatory) Key Code Fragments

```jsx
// PropDrilling.jsx: userName passes through components that do not need it
<DrillingHeader userName={userName} />
// DrillingHeader → Navigation → UserMenu → UserAvatar
```

```jsx
// PropDrilling.jsx: the solution, the name comes from the context
<UserContext.Provider value={userName}>
  <ContextHeader />
</UserContext.Provider>
// ContextAvatar: const userName = useUser();
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
      return state.some((item) => item.id === action.id) ? state : [...state, { id: action.id, qty: 1 }];
    case 'REMOVE':
      return state.filter((item) => item.id !== action.id);
    case 'INCREMENT':
      return changeQty(state, action.id, (qty) => qty + 1);
    case 'DECREMENT':
      return changeQty(state, action.id, (qty) => qty - 1);
    case 'SET_QTY':
      return changeQty(state, action.id, () => action.qty);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

const [favorites, dispatch] = useReducer(favoritesReducer, undefined, loadFavorites);
```

```jsx
// Templates.jsx: the data and dispatch come from different contexts
const favorites = useFavorites();
const dispatch = useFavoritesDispatch();
dispatch({ type: 'INCREMENT', id: template.id });
```
