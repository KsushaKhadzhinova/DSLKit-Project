import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

export const FAVORITES_KEY = 'dslkit.favorites';

// State is an array of template ids. Every action returns a new array and never mutates the old one.
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

function loadFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const [favorites, dispatch] = useReducer(favoritesReducer, undefined, loadFavorites);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // Storage is blocked or full: the state still works in memory.
    }
  }, [favorites]);

  const value = useMemo(() => ({ favorites, dispatch }), [favorites]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
