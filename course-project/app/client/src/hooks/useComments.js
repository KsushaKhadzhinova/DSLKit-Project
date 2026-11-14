import { useCallback, useEffect, useRef, useState } from 'react';
import { addComment, deleteComment, errorMessage, fetchComments, isCanceled, updateComment } from '../api';
import { kindOfFailure } from '../errorCatalog';
import limits from '../limits.json';

const readTotal = (response) => {
  const value = Number(response.headers?.['x-total-count']);
  return Number.isInteger(value) && value >= 0 ? value : null;
};

// Comments of one diagram, oldest first, loaded page by page. Unlike the list of diagrams the changes are not optimistic:
// a comment is text that other people read, so it appears after the server has accepted it.
// busy holds ids of comments with a request in flight, a second action on the same comment is ignored.
export function useComments(diagramId) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [errorKind, setErrorKind] = useState(null);
  const [notice, setNotice] = useState(null);
  const [posting, setPosting] = useState(false);
  const [busy, setBusy] = useState(() => new Set());
  const [attempt, setAttempt] = useState(0);
  const busyIds = useRef(new Set());
  const postingRef = useRef(false);
  const state = useRef({ items, total });
  state.current = { items, total };

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
    fetchComments(diagramId, controller.signal, { limit: limits.commentPageSize })
      .then((response) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(response.data)) {
          setError('Сервер вернул неожиданный ответ. Проверьте адрес сервера');
          setErrorKind('network');
          return;
        }
        setItems(response.data);
        setTotal(readTotal(response));
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

  const loadMore = useCallback(async () => {
    const { items: current, total: size } = state.current;
    if (loadingMore || size === null || current.length >= size) return;
    setLoadingMore(true);
    try {
      const response = await fetchComments(diagramId, undefined, { limit: limits.commentPageSize, offset: current.length });
      const known = new Set(current.map((item) => item.id));
      setItems((now) => [...now, ...response.data.filter((record) => !known.has(record.id) && !now.some((item) => item.id === record.id))]);
      setTotal(readTotal(response) ?? size);
    } catch (failure) {
      setNotice(`Не удалось загрузить ещё. ${errorMessage(failure)}`);
    } finally {
      setLoadingMore(false);
    }
  }, [diagramId, loadingMore]);

  const add = useCallback(
    async (text) => {
      if (postingRef.current) return false;
      postingRef.current = true;
      setPosting(true);
      try {
        const { data } = await addComment(diagramId, text);
        setItems((now) => [...now, data]);
        setTotal((now) => (now === null ? now : now + 1));
        return true;
      } catch (failure) {
        setNotice(`Не удалось добавить комментарий. ${errorMessage(failure)}`);
        return false;
      } finally {
        postingRef.current = false;
        setPosting(false);
      }
    },
    [diagramId],
  );

  const edit = useCallback(async (id, text) => {
    if (busyIds.current.has(id)) return false;
    mark(id, true);
    try {
      const { data } = await updateComment(id, text);
      setItems((now) => now.map((item) => (item.id === id ? data : item)));
      return true;
    } catch (failure) {
      setNotice(`Не удалось сохранить комментарий. ${errorMessage(failure)}`);
      return false;
    } finally {
      mark(id, false);
    }
  }, []);

  const remove = useCallback(async (id) => {
    if (busyIds.current.has(id)) return;
    mark(id, true);
    try {
      await deleteComment(id);
    } catch (failure) {
      // 404 means the comment is already gone, so the list is corrected below and no error is shown.
      if (failure.response?.status !== 404) {
        setNotice(`Не удалось удалить комментарий. ${errorMessage(failure)}`);
        mark(id, false);
        return;
      }
    }
    setItems((now) => now.filter((item) => item.id !== id));
    setTotal((now) => (now === null ? now : Math.max(0, now - 1)));
    mark(id, false);
  }, []);

  const hasMore = total !== null && items.length < total;
  return { items, total, loading, loadingMore, error, errorKind, notice, posting, busy, hasMore, retry, dismissNotice, loadMore, add, edit, remove };
}
