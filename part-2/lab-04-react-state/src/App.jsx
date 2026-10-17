import { useEffect, useState } from 'react';
import DiagramFilters from './components/DiagramFilters';
import DiagramForm from './components/DiagramForm';
import DiagramItem from './components/DiagramItem';
import StatsBar from './components/StatsBar';
import { INITIAL_DIAGRAMS } from './data/initialDiagrams';
import { useAutosaveStatus } from './hooks/useAutosaveStatus';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ThemeProvider } from './shell/theme';
import SiteFooter from './shell/SiteFooter';
import SiteHeader, { LogoContent } from './shell/SiteHeader';
import { filterDiagrams, getStats, newId, sortDiagrams, uniqueCreatedAt } from './utils/diagrams';
import { canAddMore, isDiagramList } from './utils/validation';

export const STORAGE_KEY = 'dslkit.diagrams';

const today = () => new Date().toISOString().slice(0, 10);

const NAV = (
  <>
    <li className="nav__item">
      <a className="nav__link" href="#add">
        Новая диаграмма
      </a>
    </li>
    <li className="nav__item">
      <a className="nav__link" href="#list">
        Список
      </a>
    </li>
  </>
);

const FOOTER_LINKS = (
  <>
    <li className="footer__item">
      <a className="footer__link" href="#add">
        Новая диаграмма
      </a>
    </li>
    <li className="footer__item">
      <a className="footer__link" href="#list">
        Список диаграмм
      </a>
    </li>
  </>
);

export default function App() {
  const [diagrams, setDiagrams] = useLocalStorage(STORAGE_KEY, INITIAL_DIAGRAMS, isDiagramList);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const autosave = useAutosaveStatus(diagrams);

  useEffect(() => {
    document.title = `DSLKit: диаграмм ${diagrams.length}`;
  }, [diagrams.length]);

  // Functional updates read the latest state, so quick consecutive clicks do not lose changes.
  const addDiagram = ({ title, notation }) =>
    setDiagrams((prev) =>
      canAddMore(prev.length)
        ? [...prev, { id: newId(), title, notation, published: false, createdAt: uniqueCreatedAt(prev), updatedAt: today() }]
        : prev,
    );
  const deleteDiagram = (id) => setDiagrams((prev) => prev.filter((d) => d.id !== id));
  const renameDiagram = (id, title) => setDiagrams((prev) => prev.map((d) => (d.id === id ? { ...d, title, updatedAt: today() } : d)));
  const togglePublished = (id) => setDiagrams((prev) => prev.map((d) => (d.id === id ? { ...d, published: !d.published, updatedAt: today() } : d)));

  const visible = sortDiagrams(filterDiagrams(diagrams, { query, status }), sortBy);

  return (
    <ThemeProvider>
      <a className="skip-link" href="#main">
        Перейти к основному содержимому
      </a>
      <SiteHeader
        logo={
          <a className="header__logo" href="/">
            <LogoContent />
          </a>
        }
        nav={NAV}
      />
      <main className="main" id="main" tabIndex={-1}>
        <div className="page-head">
          <h1 className="page__title">Мои диаграммы</h1>
          <p className="page-head__lead">Список диаграмм проекта: добавляйте, переименовывайте, публикуйте и ищите. Данные хранятся в этом браузере.</p>
        </div>
        <section className="section" id="add" aria-labelledby="add-title">
          <h2 className="section__title" id="add-title">
            Новая диаграмма
          </h2>
          <DiagramForm onAdd={addDiagram} full={!canAddMore(diagrams.length)} />
        </section>
        <section className="section" id="list" aria-labelledby="list-title">
          <h2 className="section__title" id="list-title">
            Список диаграмм
          </h2>
          <DiagramFilters query={query} status={status} sortBy={sortBy} onQuery={setQuery} onStatus={setStatus} onSort={setSortBy} />
          <StatsBar stats={getStats(diagrams)} autosave={autosave} />
          {visible.length === 0 ? (
            <p className="empty">Диаграммы не найдены.</p>
          ) : (
            <ul className="cards" aria-label="Диаграммы">
              {visible.map((d) => (
                <DiagramItem key={d.id} diagram={d} onToggle={togglePublished} onRename={renameDiagram} onDelete={deleteDiagram} />
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter links={FOOTER_LINKS} />
    </ThemeProvider>
  );
}
