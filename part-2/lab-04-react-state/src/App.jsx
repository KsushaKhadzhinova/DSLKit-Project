import { useEffect, useState } from 'react';
import DiagramFilters from './components/DiagramFilters';
import DiagramForm from './components/DiagramForm';
import DiagramItem from './components/DiagramItem';
import StatsBar from './components/StatsBar';
import { INITIAL_DIAGRAMS } from './data/initialDiagrams';
import { useAutosaveStatus } from './hooks/useAutosaveStatus';
import { useLocalStorage } from './hooks/useLocalStorage';
import { filterDiagrams, getStats, sortDiagrams } from './utils/diagrams';

export const STORAGE_KEY = 'dslkit.diagrams';

const today = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [diagrams, setDiagrams] = useLocalStorage(STORAGE_KEY, INITIAL_DIAGRAMS, Array.isArray);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const autosave = useAutosaveStatus(diagrams);

  useEffect(() => {
    document.title = `DSLKit: диаграмм ${diagrams.length}`;
  }, [diagrams.length]);

  // Functional updates read the latest state, so quick consecutive clicks do not lose changes.
  const addDiagram = ({ title, notation }) =>
    setDiagrams((prev) => [...prev, { id: crypto.randomUUID(), title, notation, published: false, updatedAt: today() }]);
  const deleteDiagram = (id) => setDiagrams((prev) => prev.filter((d) => d.id !== id));
  const renameDiagram = (id, title) => setDiagrams((prev) => prev.map((d) => (d.id === id ? { ...d, title, updatedAt: today() } : d)));
  const togglePublished = (id) => setDiagrams((prev) => prev.map((d) => (d.id === id ? { ...d, published: !d.published, updatedAt: today() } : d)));

  const visible = sortDiagrams(filterDiagrams(diagrams, { query, status }), sortBy);

  return (
    <main className="app">
      <h1>Мои диаграммы</h1>
      <DiagramForm onAdd={addDiagram} />
      <DiagramFilters query={query} status={status} sortBy={sortBy} onQuery={setQuery} onStatus={setStatus} onSort={setSortBy} />
      <StatsBar stats={getStats(diagrams)} autosave={autosave} />
      {visible.length === 0 ? (
        <p className="empty">Диаграммы не найдены.</p>
      ) : (
        <ul className="list">
          {visible.map((d) => (
            <DiagramItem key={d.id} diagram={d} onToggle={togglePublished} onRename={renameDiagram} onDelete={deleteDiagram} />
          ))}
        </ul>
      )}
    </main>
  );
}
