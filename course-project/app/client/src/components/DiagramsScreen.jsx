import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import limits from '../limits.json';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useDiagrams } from '../hooks/useDiagrams';
import Alert from './Alert';
import DiagramForm from './DiagramForm';
import ErrorHelp from './ErrorHelp';
import DiagramItem from './DiagramItem';
import LoadMore from './LoadMore';
import Progress from './Progress';
import SearchField from './SearchField';

// The list screen is separate so the hook runs only for a signed-in user.
export default function DiagramsScreen() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), limits.searchDebounceMs);
  // /diagrams?tag=billing shows only the diagrams with that tag; the address is the filter, so the link can be shared.
  const tag = useSearchParams()[0].get('tag') || undefined;
  const { items, loading, loadingMore, error, errorKind, notice, busy, syncing, hasMore, total, retry, dismissNotice, loadMore, add, remove, update } =
    useDiagrams(debouncedSearch, tag);
  const showList = !error;
  const settled = !error && !loading;

  return (
    <>
      <DiagramForm onAdd={add} />
      <SearchField value={search} onChange={setSearch} />
      {tag && (
        <p className="note">
          <span className="note__text">Тег: {tag}. </span>
          <Link className="link" to="/diagrams">
            Показать все диаграммы
          </Link>
        </p>
      )}
      {notice && <Alert text={notice} actionLabel="Закрыть" onAction={dismissNotice} quiet />}
      {loading && <Progress>Загрузка…</Progress>}
      {error && !loading && <Alert text={error} actionLabel="Повторить" onAction={retry} />}
      {error && !loading && <ErrorHelp kind={errorKind} />}
      {settled && items.length === 0 && (
        <p className="note">
          <span className="note__text">Диаграмм не найдено.</span>
        </p>
      )}
      {syncing > 0 && <Progress>Сохранение на сервере…</Progress>}
      {showList && (
        <ul className="cards">
          {items.map((diagram) => (
            <DiagramItem key={diagram.id} diagram={diagram} busy={busy.has(diagram.id)} onUpdate={update} onRemove={remove} />
          ))}
        </ul>
      )}
      {settled && total !== null && total > 0 && (
        <p className="stats">
          Показано {items.length} из {total}
        </p>
      )}
      {settled && hasMore && <LoadMore loading={loadingMore} onClick={loadMore} />}
    </>
  );
}
