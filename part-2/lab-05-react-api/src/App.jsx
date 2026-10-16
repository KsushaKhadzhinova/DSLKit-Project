import { useEffect, useState } from 'react';
import { TOKEN_KEY } from './api';
import AuthForm from './components/AuthForm';
import DiagramForm from './components/DiagramForm';
import DiagramItem from './components/DiagramItem';
import limits from './limits.json';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useDiagrams } from './hooks/useDiagrams';

// The list screen is separate so the hook runs only for a signed-in user.
function Diagrams({ onLogout }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), limits.searchDebounceMs);
  const { items, loading, error, notice, retry, dismissNotice, add, remove, update } = useDiagrams(debouncedSearch);

  return (
    <>
      <div className="filters">
        <label className="field">
          Поиск по названию
          <input type="search" value={search} maxLength={limits.title.maxLength} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <button type="button" onClick={onLogout}>
          Выйти
        </button>
      </div>
      <DiagramForm onAdd={add} />
      {notice && (
        <p className="error" role="alert">
          {notice}{' '}
          <button type="button" onClick={dismissNotice}>
            Закрыть
          </button>
        </p>
      )}
      {loading && (
        <p role="status" className="spinner">
          Загрузка…
        </p>
      )}
      {error && !loading && (
        <div role="alert" className="error">
          <p>{error}</p>
          <button type="button" onClick={retry}>
            Повторить
          </button>
        </div>
      )}
      {!loading && !error && items.length === 0 && <p>Диаграмм не найдено.</p>}
      {!error && (
        <ul className="list">
          {items.map((diagram) => (
            <DiagramItem key={diagram.id} diagram={diagram} onUpdate={update} onRemove={remove} />
          ))}
        </ul>
      )}
    </>
  );
}

export default function App() {
  const [signedIn, setSignedIn] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  // api.js sends this event when the server answers 401 for the saved token.
  useEffect(() => {
    const handleLogout = () => setSignedIn(false);
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setSignedIn(false);
  };

  return (
    <main className="app">
      <h1>DSLKit: диаграммы на сервере</h1>
      {signedIn ? <Diagrams onLogout={logout} /> : <AuthForm onLoggedIn={() => setSignedIn(true)} />}
    </main>
  );
}
