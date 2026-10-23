import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { TEMPLATES } from '../data/templates';
import limits from '../limits.json';

export const FAVORITES_KEY = 'dslkit.favorites';
export const MAX_QTY = limits.maxQty;
export const MAX_HISTORY = limits.maxHistory;

// Quantity is always a whole number from 1 to MAX_QTY, anything else is replaced by the nearest valid value.
export function clampQty(value) {
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) return 1;
  return Math.min(MAX_QTY, Math.max(1, number));
}

const changeQty = (state, id, next) => state.map((item) => (item.id === id ? { ...item, qty: clampQty(next(item.qty)) } : item));

const isTemplateId = (id) => TEMPLATES.some((template) => template.id === id);

// State is an array of { id, qty }. Every action returns a new array and never mutates the old one.
// A missing action, a null state and an id that is not a template are ignored instead of stored.
export function favoritesReducer(current, action) {
  const state = Array.isArray(current) ? current : [];
  switch (action?.type) {
    case 'ADD':
      if (!isTemplateId(action.id) || state.some((item) => item.id === action.id)) return state;
      return [...state, { id: action.id, qty: 1 }];
    case 'REMOVE':
      return state.filter((item) => item.id !== action.id);
    case 'TOGGLE':
      if (!isTemplateId(action.id)) return state;
      return state.some((item) => item.id === action.id) ? state.filter((item) => item.id !== action.id) : [...state, { id: action.id, qty: 1 }];
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

// localStorage can hold anything: keep only known template ids, once each, with a valid quantity.
// A plain id (the format of the first version) is accepted as quantity 1.
export function sanitizeFavorites(value) {
  if (!Array.isArray(value)) return [];
  const known = new Set(TEMPLATES.map((template) => template.id));
  const seen = new Set();
  const result = [];
  for (const entry of value) {
    const isObject = entry !== null && typeof entry === 'object' && !Array.isArray(entry);
    const id = isObject ? entry.id : entry;
    if (!known.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push({ id, qty: isObject ? clampQty(entry.qty) : 1 });
  }
  return result;
}

function loadFavorites() {
  try {
    return sanitizeFavorites(JSON.parse(localStorage.getItem(FAVORITES_KEY)));
  } catch {
    return [];
  }
}

// Undo and redo around any reducer: the state is { past, present, future }, the wrapped reducer only sees `present`.
// An action that changes nothing (the reducer returns the same array) leaves no step in the history, a new change clears the redo steps.
export const withHistory = (reducer, limit = MAX_HISTORY) => (state, action) => {
  if (action?.type === 'UNDO') {
    if (state.past.length === 0) return state;
    return { past: state.past.slice(0, -1), present: state.past.at(-1), future: [state.present, ...state.future] };
  }
  if (action?.type === 'REDO') {
    if (state.future.length === 0) return state;
    return { past: [...state.past, state.present].slice(-limit), present: state.future[0], future: state.future.slice(1) };
  }
  const present = reducer(state.present, action);
  if (present === state.present) return state;
  return { past: [...state.past, state.present].slice(-limit), present, future: [] };
};

const favoritesWithHistory = withHistory(favoritesReducer);
const initialHistory = () => ({ past: [], present: loadFavorites(), future: [] });

// Two contexts: the data changes often, dispatch never changes.
// A component that only sends actions subscribes to the second one and is not re-rendered when the data changes.
const FavoritesStateContext = createContext(null);
const FavoritesDispatchContext = createContext(null);
// Whether undo and redo have a step: only the two buttons subscribe to it.
const FavoritesHistoryContext = createContext(null);

export function FavoritesProvider({ children }) {
  const [state, dispatch] = useReducer(favoritesWithHistory, undefined, initialHistory);
  const favorites = state.present;
  const history = useMemo(() => ({ canUndo: state.past.length > 0, canRedo: state.future.length > 0 }), [state.past.length, state.future.length]);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // Storage is blocked or full: the state still works in memory.
    }
  }, [favorites]);

  return (
    <FavoritesStateContext.Provider value={favorites}>
      <FavoritesDispatchContext.Provider value={dispatch}>
        <FavoritesHistoryContext.Provider value={history}>{children}</FavoritesHistoryContext.Provider>
      </FavoritesDispatchContext.Provider>
    </FavoritesStateContext.Provider>
  );
}

// Outside FavoritesProvider there is no value to read: fail with a message that names the provider.
const insideProvider = (value, hook) => {
  if (value === null) throw new Error(`${hook} must be used inside FavoritesProvider`);
  return value;
};

export const useFavorites = () => insideProvider(useContext(FavoritesStateContext), 'useFavorites');
export const useFavoritesHistory = () => insideProvider(useContext(FavoritesHistoryContext), 'useFavoritesHistory');
export const useFavoritesDispatch = () => insideProvider(useContext(FavoritesDispatchContext), 'useFavoritesDispatch');
