import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteUser, errorMessage, fetchUsers, isCanceled, setUserRole } from '../api';
import { kindOfFailure } from '../errorCatalog';

// The server refuses these actions on purpose. Its short English sentences are replaced by an explanation the administrator can act on.
const REFUSALS = {
  'Admins cannot change their own role': 'Нельзя изменить собственную роль: система не должна остаться без администратора. Роль администратора меняет другой администратор.',
  'Admins cannot delete themselves': 'Нельзя удалить самого себя: система не должна остаться без администратора.',
  'The user still owns diagrams, delete or reassign them first': 'У пользователя есть диаграммы, поэтому удалить его нельзя. Сначала удалите его диаграммы.',
};

export const adminMessage = (failure) => {
  const text = failure.response?.data?.error;
  return REFUSALS[text] ?? errorMessage(failure);
};

// The users of the administration screen: the list, a role change and a delete. Nothing is optimistic here:
// a role is a right, so the row shows the value only after the server accepted it. One action per user at a time.
export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorKind, setErrorKind] = useState(null);
  const [notice, setNotice] = useState(null);
  const [done, setDone] = useState(null);
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
    fetchUsers(controller.signal)
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data)) {
          setError('Сервер вернул неожиданный ответ. Проверьте адрес сервера');
          setErrorKind('network');
          return;
        }
        setUsers(data);
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
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const dismiss = useCallback(() => {
    setNotice(null);
    setDone(null);
  }, []);

  const changeRole = useCallback(async (user, role) => {
    if (busyIds.current.has(user.id) || role === user.role) return;
    mark(user.id, true);
    setNotice(null);
    setDone(null);
    try {
      const { data } = await setUserRole(user.id, role);
      setUsers((now) => now.map((item) => (item.id === user.id ? data : item)));
      setDone(`Роль пользователя ${user.email} изменена.`);
    } catch (failure) {
      setNotice(adminMessage(failure));
    } finally {
      mark(user.id, false);
    }
  }, []);

  const remove = useCallback(async (user) => {
    if (busyIds.current.has(user.id)) return false;
    mark(user.id, true);
    setNotice(null);
    setDone(null);
    try {
      await deleteUser(user.id);
    } catch (failure) {
      // 404: somebody removed the user already, the list is right after the next line.
      if (failure.response?.status !== 404) {
        setNotice(adminMessage(failure));
        mark(user.id, false);
        return false;
      }
    }
    setUsers((now) => now.filter((item) => item.id !== user.id));
    setDone(`Пользователь ${user.email} удалён.`);
    mark(user.id, false);
    return true;
  }, []);

  return { users, loading, error, errorKind, notice, done, busy, retry, dismiss, changeRole, remove };
}
