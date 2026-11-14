import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { TEMPLATES } from '../data/templates';
import limits from '../limits.json';

export const FAVORITES_KEY = 'dslkit.favorites';
export const MAX_QTY = limits.maxQty;
export const MAX_HISTORY = limits.maxHistory;

// Quantity is always a whole number from 1 to MAX_QTY, anything else is replaced by the nearest valid value.
// Number()/Math.trunc() can throw on a Symbol or an object with a poisoned valueOf; such a value is treated
// the same as any other junk input, not allowed to crash the reducer.
export function clampQty(value) {
  let number;
  try {
    number = Math.trunc(Number(value));
  } catch {
    return 1;
  }
  if (!Number.isFinite(number)) return 1;
  return Math.min(MAX_QTY, Math.max(1, number));
}

// A change that leaves every quantity as it was returns the same array, so the history records no step for it.
const changeQty = (state, id, next) => {
  let changed = false;
  const result = state.map((item) => {
    if (item.id !== id) return item;
    const qty = clampQty(next(item.qty));
    if (qty === item.qty) return item;
    changed = true;
    return { ...item, qty };
  });
  return changed ? result : state;
};

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
      return state.some((item) => item.id === action.id) ? state.filter((item) => item.id !== action.id) : state;
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
      return state.length ? [] : state;
    default:
      return state;
  }
}

// localStorage can hold anything: keep only known template ids, once each, with a valid quantity.
// A plain id (the format of the first version) is accepted as quantity 1.
// The versioned form { v: 1, items: [...] } is read too; any other version is not understood and gives an empty list.
export function sanitizeFavorites(value) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value) && value.v === 1) value = value.items;
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

export const BACKUP_KEY = `${FAVORITES_KEY}.bak`;

// Data that the sanitizer changes or drops (a newer schema, damaged JSON, an unknown id) is copied to a backup key first,
// so a rollback of the application or a manual fix does not lose it.
function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw === null) return [];
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Damaged JSON is kept in the backup below.
    }
    const items = sanitizeFavorites(parsed);
    if (JSON.stringify(items) !== raw) {
      try {
        localStorage.setItem(BACKUP_KEY, raw);
      } catch {
        // No room for a backup: nothing else can be done.
      }
    }
    return items;
  } catch {
    return [];
  }
}

const sameItems = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Undo and redo around any reducer: the state is { past, present, future }, the wrapped reducer only sees `present`.
// An action that changes nothing (the reducer returns the same array) leaves no step in the history, a new change clears the redo steps.
export const withHistory = (reducer, limit = MAX_HISTORY) => {
  // A limit that is not a positive number keeps no steps at all.
  const cap = Number.isFinite(limit) && limit >= 1 ? Math.floor(limit) : 0;
  const keep = (steps) => (cap ? steps.slice(-cap) : []);
  const isHistory = (value) => value !== null && typeof value === 'object' && Array.isArray(value.past) && Array.isArray(value.future) && 'present' in value;
  return (current, action) => {
    const state = isHistory(current) ? current : { past: [], present: current?.present ?? current, future: [] };
    if (action?.type === 'UNDO') {
      if (state.past.length === 0) return state;
      return { past: state.past.slice(0, -1), present: state.past.at(-1), future: [state.present, ...state.future] };
    }
    if (action?.type === 'REDO') {
      if (state.future.length === 0) return state;
      return { past: keep([...state.past, state.present]), present: state.future[0], future: state.future.slice(1) };
    }
    // Data that arrived from another tab replaces the present value without a step in the history.
    if (action?.type === 'HYDRATE') {
      return sameItems(state.present, action.items) ? state : { ...state, present: action.items };
    }
    const present = reducer(state.present, action);
    if (present === state.present) return state;
    return { past: keep([...state.past, state.present]), present, future: [] };
  };
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

  // The first value (loaded or empty) is never written back, so data of a newer schema survives until the user changes something.
  const lastSeen = useRef(favorites);
  useEffect(() => {
    if (lastSeen.current === favorites) return;
    lastSeen.current = favorites;
    try {
      const json = JSON.stringify(favorites);
      // Writing the same text would be no change; this also keeps data from another tab from being written back in a loop.
      if (localStorage.getItem(FAVORITES_KEY) !== json) localStorage.setItem(FAVORITES_KEY, json);
    } catch {
      // Storage is blocked or full: the state still works in memory.
    }
  }, [favorites]);

  // Another tab saved new favorites: take them over (the storage event never fires in the tab that wrote).
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== null && event.key !== FAVORITES_KEY) return;
      try {
        let parsed = null;
        try {
          parsed = JSON.parse(event.newValue ?? localStorage.getItem(FAVORITES_KEY));
        } catch {
          return;
        }
        dispatch({ type: 'HYDRATE', items: sanitizeFavorites(parsed) });
      } catch {
        // Storage is blocked: keep the current state.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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
