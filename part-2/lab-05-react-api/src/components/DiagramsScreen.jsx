import { useState } from 'react';
import limits from '../limits.json';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useDiagrams } from '../hooks/useDiagrams';
import Alert from './Alert';
import DiagramForm from './DiagramForm';
import DiagramItem from './DiagramItem';
import LoadMore from './LoadMore';
import Progress from './Progress';
import SearchField from './SearchField';

// The list screen is separate so the hook runs only for a signed-in user.
export default function DiagramsScreen() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), limits.searchDebounceMs);
  const { items, loading, loadingMore, error, notice, busy, syncing, hasMore, total, retry, dismissNotice, loadMore, add, remove, update } =
    useDiagrams(debouncedSearch);
  const showList = !error;
  const settled = !error && !loading;

  return (
    <>
      <DiagramForm onAdd={add} />
      <SearchField value={search} onChange={setSearch} />
      {notice && <Alert text={notice} actionLabel="Закрыть" onAction={dismissNotice} quiet />}
      {loading && <Progress>Загрузка…</Progress>}
      {error && !loading && <Alert text={error} actionLabel="Повторить" onAction={retry} />}
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
