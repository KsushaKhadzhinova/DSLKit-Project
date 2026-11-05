import { useCallback, useEffect, useRef, useState } from 'react';
import { addDiagram, deleteDiagram, errorMessage, fetchDiagrams, isCanceled, updateDiagram } from '../api';
import { kindOfFailure } from '../errorCatalog';
import limits from '../limits.json';

const isTemporary = (id) => typeof id === 'string' && id.startsWith('temp-');

// The server sends the size of the whole list in X-Total-Count. A missing or broken value means "unknown", then there is no next page.
const readTotal = (response) => {
  const value = Number(response.headers?.['x-total-count']);
  return Number.isInteger(value) && value >= 0 ? value : null;
};

// Ids of records with a PUT or DELETE in flight, shown as a progress indicator.
// A second delete or edit of the same record is ignored until the first one ends.
function useBusyIds() {
  const [busy, setBusy] = useState(() => new Set());
  const busyIds = useRef(new Set());
  const markBusy = (id) => {
    busyIds.current.add(id);
    setBusy(new Set(busyIds.current));
  };
  const unmarkBusy = (id) => {
    busyIds.current.delete(id);
    setBusy(new Set(busyIds.current));
  };
  return { busy, isBusy: (id) => busyIds.current.has(id), markBusy, unmarkBusy };
}

// Loads the list page by page: the first page for a search text, then "load more".
// The request is cancelled when the search text changes, on retry and when the component unmounts.
// A page that is being loaded for the old search is cancelled too, so its answer never reaches the new list.
function usePagedList(search, tag, onNotice) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  // Which explained error page fits the failure (see errorCatalog.js), null when the server message is enough.
  const [errorKind, setErrorKind] = useState(null);
  const [attempt, setAttempt] = useState(0);
  // fetched: how many records of the server list are loaded (the offset of the next page), total: the size of the whole list.
  const [paging, setPaging] = useState({ fetched: 0, total: null });
  // The latest values for the handlers, so a fast second click never works with an old copy.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const pagingRef = useRef(paging);
  pagingRef.current = paging;
  // Records added in this session: they are not part of the loaded pages, so they do not move the offset of the next page.
  const localIds = useRef(new Set());
  const moreController = useRef(null);
  const loadingMoreRef = useRef(false);

  const changeTotal = (delta) => setPaging((current) => (current.total === null ? current : { ...current, total: Math.max(0, current.total + delta) }));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadingMore(false);
    loadingMoreRef.current = false;
    setError(null);
    setErrorKind(null);
    fetchDiagrams(search, controller.signal, { limit: limits.pageSize, offset: 0, tag })
      .then((response) => {
        if (controller.signal.aborted) return;
        // A body that is not a list (HTML from a proxy, an empty answer) is an error, it must not reach the list and crash it.
        if (!Array.isArray(response.data)) {
          setError('Сервер вернул неожиданный ответ. Проверьте адрес сервера');
          setErrorKind('network');
          return;
        }
        localIds.current.clear();
        setItems(response.data);
        setPaging({ fetched: response.data.length, total: readTotal(response) });
      })
      .catch((failure) => {
        if (!isCanceled(failure) && !controller.signal.aborted) {
          setError(errorMessage(failure));
          setErrorKind(kindOfFailure(failure));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      moreController.current?.abort();
    };
  }, [search, tag, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // "Load more": the next page is appended, the records already on the screen are never doubled.
  // A second click while a page is loading is ignored.
  const loadMore = useCallback(async () => {
    const { fetched, total } = pagingRef.current;
    if (loadingMoreRef.current || total === null || fetched >= total) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const controller = new AbortController();
    moreController.current = controller;
    try {
      const response = await fetchDiagrams(search, controller.signal, { limit: limits.pageSize, offset: fetched, tag });
      if (controller.signal.aborted) return;
      const loaded = response.data;
      loaded.forEach((record) => localIds.current.delete(record.id));
      setItems((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...loaded.filter((record) => !known.has(record.id))];
      });
      setPaging({ fetched: fetched + loaded.length, total: readTotal(response) ?? total });
    } catch (failure) {
      if (!isCanceled(failure) && !controller.signal.aborted) onNotice(`Не удалось загрузить ещё. ${errorMessage(failure)}`);
    } finally {
      if (!controller.signal.aborted) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [search, tag, onNotice]);

  return { items, setItems, itemsRef, paging, setPaging, changeTotal, localIds, loading, loadingMore, error, errorKind, retry, loadMore };
}

// Owns the server state of the list: the pages plus the optimistic add, delete and edit.
export function useDiagrams(search, tag) {
  const [notice, setNotice] = useState(null);
  const tempCounter = useRef(0);
  const { busy, isBusy, markBusy, unmarkBusy } = useBusyIds();
  const list = usePagedList(search, tag, setNotice);
  const { items, setItems, itemsRef, paging, setPaging, changeTotal, localIds } = list;

  const dismissNotice = useCallback(() => setNotice(null), []);

  // Optimistic add: the item appears at once with a temporary id, the real record replaces it on success.
  const add = useCallback(async (fields) => {
    tempCounter.current += 1;
    const tempId = `temp-${tempCounter.current}`;
    setItems((current) => [...current, { ...fields, id: tempId, createdAt: new Date().toISOString(), pending: true }]);
    changeTotal(1);
    try {
      const { data } = await addDiagram(fields);
      localIds.current.add(data.id);
      setItems((current) => current.map((item) => (item.id === tempId ? data : item)));
      return true;
    } catch (failure) {
      setItems((current) => current.filter((item) => item.id !== tempId));
      changeTotal(-1);
      setNotice(`Не удалось добавить диаграмму. ${errorMessage(failure)}`);
      return false;
    }
  }, []);

  // Optimistic delete: the item disappears at once and returns to its place when the server refuses.
  // A record that is still being created (temporary id) or already being changed is skipped.
  const remove = useCallback(async (id) => {
    const index = itemsRef.current.findIndex((item) => item.id === id);
    if (index < 0 || isTemporary(id) || isBusy(id)) return;
    const removed = itemsRef.current[index];
    const wasLocal = localIds.current.delete(id);
    markBusy(id);
    setItems((current) => current.filter((item) => item.id !== id));
    changeTotal(-1);
    if (!wasLocal) setPaging((current) => ({ ...current, fetched: Math.max(0, current.fetched - 1) }));
    try {
      await deleteDiagram(id);
    } catch (failure) {
      // 404 means the record is already gone, so the list is right and nothing is restored.
      if (failure.response?.status !== 404) {
        setItems((current) => (current.some((item) => item.id === id) ? current : [...current.slice(0, index), removed, ...current.slice(index)]));
        changeTotal(1);
        if (wasLocal) localIds.current.add(id);
        else setPaging((current) => ({ ...current, fetched: current.fetched + 1 }));
        setNotice(`Не удалось удалить диаграмму. ${errorMessage(failure)}`);
      }
    } finally {
      unmarkBusy(id);
    }
  }, []);

  // Optimistic edit: PUT replaces the whole record, so the server gets all fields; the old record comes back on failure.
  const update = useCallback(async (id, changes) => {
    const previous = itemsRef.current.find((item) => item.id === id);
    if (!previous || isTemporary(id) || isBusy(id)) return false;
    const { title, notation, sourceCode, priority } = { ...previous, ...changes };
    markBusy(id);
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
    try {
      const { data } = await updateDiagram(id, { title, notation, sourceCode, priority });
      setItems((current) => current.map((item) => (item.id === id ? data : item)));
      return true;
    } catch (failure) {
      setItems((current) => current.map((item) => (item.id === id ? previous : item)));
      setNotice(`Не удалось сохранить изменения. ${errorMessage(failure)}`);
      return false;
    } finally {
      unmarkBusy(id);
    }
  }, []);

  const hasMore = paging.total !== null && paging.fetched < paging.total;
  // Requests that are still running in the background: shown as one progress line for edits, deletes and adds.
  const syncing = busy.size + items.filter((item) => item.pending).length;

  return {
    items,
    loading: list.loading,
    loadingMore: list.loadingMore,
    error: list.error,
    errorKind: list.errorKind,
    notice,
    busy,
    syncing,
    hasMore,
    total: paging.total,
    retry: list.retry,
    dismissNotice,
    loadMore: list.loadMore,
    add,
    remove,
    update,
  };
}
