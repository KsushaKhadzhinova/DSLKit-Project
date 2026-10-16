import { useCallback, useEffect, useRef, useState } from 'react';
import { addDiagram, deleteDiagram, errorMessage, fetchDiagrams, isCanceled, updateDiagram } from '../api';

// Owns the server state of the list: loading, error, the items and the optimistic changes.
export function useDiagrams(search) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const tempCounter = useRef(0);

  // The request is cancelled when the search text changes, on retry and when the component unmounts.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchDiagrams(search, controller.signal)
      .then((response) => setItems(response.data))
      .catch((failure) => {
        if (!isCanceled(failure)) setError(errorMessage(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  // Optimistic add: the item appears at once with a temporary id, the real record replaces it on success.
  const add = useCallback(async (fields) => {
    tempCounter.current += 1;
    const tempId = `temp-${tempCounter.current}`;
    setItems((current) => [...current, { ...fields, id: tempId, createdAt: new Date().toISOString(), pending: true }]);
    try {
      const { data } = await addDiagram(fields);
      setItems((current) => current.map((item) => (item.id === tempId ? data : item)));
      return true;
    } catch (failure) {
      setItems((current) => current.filter((item) => item.id !== tempId));
      setNotice(`Не удалось добавить диаграмму. ${errorMessage(failure)}`);
      return false;
    }
  }, []);

  // Optimistic delete: the item disappears at once and returns to its place when the server refuses.
  const remove = useCallback(
    async (id) => {
      const index = items.findIndex((item) => item.id === id);
      const removed = items[index];
      setItems((current) => current.filter((item) => item.id !== id));
      try {
        await deleteDiagram(id);
      } catch (failure) {
        setItems((current) => [...current.slice(0, index), removed, ...current.slice(index)]);
        setNotice(`Не удалось удалить диаграмму. ${errorMessage(failure)}`);
      }
    },
    [items],
  );

  // Optimistic edit: PUT replaces the whole record, so the server gets all fields; the old record comes back on failure.
  const update = useCallback(
    async (id, changes) => {
      const previous = items.find((item) => item.id === id);
      const { title, notation, sourceCode, priority } = { ...previous, ...changes };
      setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
      try {
        const { data } = await updateDiagram(id, { title, notation, sourceCode, priority });
        setItems((current) => current.map((item) => (item.id === id ? data : item)));
        return true;
      } catch (failure) {
        setItems((current) => current.map((item) => (item.id === id ? previous : item)));
        setNotice(`Не удалось сохранить изменения. ${errorMessage(failure)}`);
        return false;
      }
    },
    [items],
  );

  return { items, loading, error, notice, retry, dismissNotice, add, remove, update };
}
