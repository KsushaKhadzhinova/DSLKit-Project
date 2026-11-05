import { useCallback, useEffect, useRef, useState } from 'react';
import { addDiagramTag, errorMessage, fetchDiagramTags, isCanceled, removeDiagramTag } from '../api';
import { kindOfFailure } from '../errorCatalog';

// Tags of one diagram. Like comments, the changes are not optimistic: a tag appears after the server has accepted it.
// busy holds the ids of tags with a request in flight (and 'new' while a tag is being added), a second action on the same one is ignored.
export function useTags(diagramId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorKind, setErrorKind] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(() => new Set());
  const [attempt, setAttempt] = useState(0);
  const busyIds = useRef(new Set());

  const mark = (id, on) => {
    if (on) busyIds.current.add(id);
    else busyIds.current.delete(id);
    setBusy(new Set(busyIds.current));
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setErrorKind(null);
    fetchDiagramTags(diagramId, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(response.data)) {
          setError('Сервер вернул неожиданный ответ. Проверьте адрес сервера');
          setErrorKind('network');
          return;
        }
        setItems(response.data);
      })
      .catch((failure) => {
        if (isCanceled(failure) || controller.signal.aborted) return;
        setError(errorMessage(failure));
        setErrorKind(kindOfFailure(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [diagramId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const add = useCallback(
    async (name) => {
      if (busyIds.current.has('new')) return false;
      mark('new', true);
      try {
        const { data } = await addDiagramTag(diagramId, name);
        setItems((now) => (now.some((tag) => tag.id === data.id) ? now : [...now, data].sort((a, b) => a.name.localeCompare(b.name))));
        return true;
      } catch (failure) {
        setNotice(`Не удалось добавить тег. ${errorMessage(failure)}`);
        return false;
      } finally {
        mark('new', false);
      }
    },
    [diagramId],
  );

  const remove = useCallback(
    async (id) => {
      if (busyIds.current.has(id)) return;
      mark(id, true);
      try {
        await removeDiagramTag(diagramId, id);
      } catch (failure) {
        // 404 means the link is already gone, so the list is corrected below and no error is shown.
        if (failure.response?.status !== 404) {
          setNotice(`Не удалось убрать тег. ${errorMessage(failure)}`);
          mark(id, false);
          return;
        }
      }
      setItems((now) => now.filter((tag) => tag.id !== id));
      mark(id, false);
    },
    [diagramId],
  );

  return { items, loading, error, errorKind, notice, busy, retry, dismissNotice, add, remove };
}
