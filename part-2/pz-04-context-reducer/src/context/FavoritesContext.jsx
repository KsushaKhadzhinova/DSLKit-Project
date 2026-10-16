import { createContext, useContext, useEffect, useReducer } from 'react';

export const FAVORITES_KEY = 'dslkit.favorites';

// State is an array of { id, addedAt }. The time comes in the action, so the reducer stays a pure function.
// Every action returns a new array and never mutates the old one.
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

const isItem = (item) => item && typeof item.id === 'number' && typeof item.addedAt === 'string';

function loadFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY));
    return Array.isArray(parsed) && parsed.every(isItem) ? parsed : [];
  } catch {
    return [];
  }
}

// Two contexts: components that only send actions do not re-render when the list changes,
// because dispatch from useReducer is stable.
const FavoritesContext = createContext(null);
const FavoritesDispatchContext = createContext(null);

export function FavoritesProvider({ children }) {
  const [favorites, dispatch] = useReducer(favoritesReducer, undefined, loadFavorites);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // Storage is blocked or full: the state still works in memory.
    }
  }, [favorites]);

  return (
    <FavoritesDispatchContext.Provider value={dispatch}>
      <FavoritesContext.Provider value={favorites}>{children}</FavoritesContext.Provider>
    </FavoritesDispatchContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
export const useFavoritesDispatch = () => useContext(FavoritesDispatchContext);
