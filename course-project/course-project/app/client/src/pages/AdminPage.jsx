import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth';
import Alert from '../components/Alert';
import ErrorHelp from '../components/ErrorHelp';
import Progress from '../components/Progress';
import { useUsers } from '../hooks/useUsers';
import { usePageTitle } from '../utils/usePageTitle';
import { formatTime } from '../utils/validation';

const ROLES = ['user', 'admin'];
const ROLE_LABELS = { user: 'Пользователь', admin: 'Администратор' };

// The question before a delete. It is a separate block with focus on the safe answer, so a slip of the mouse does not remove an account.
function ConfirmDelete({ user, busy, onConfirm, onCancel }) {
  const cancelButton = useRef(null);
  useEffect(() => cancelButton.current?.focus(), []);
  return (
    <section className="confirm" role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-text">
      <h2 id="confirm-title" className="confirm__title">
        Удалить пользователя?
      </h2>
      <p id="confirm-text">
        Учётная запись {user.email} будет удалена вместе с комментариями этого пользователя. Действие нельзя отменить.
      </p>
      <div className="actions">
        <button ref={cancelButton} type="button" className="button" onClick={onCancel}>
          Отмена
        </button>
        <button type="button" className="button button--quiet confirm__danger" disabled={busy} onClick={onConfirm}>
          Удалить {user.email}
        </button>
      </div>
    </section>
  );
}

// Administration: the list of users, a role select per row and delete with a confirmation.
// The server decides; its refusals (own role, own account, a user with diagrams) are shown as clear messages.
export default function AdminPage() {
  usePageTitle('Администрирование');
  const { user: me } = useAuth();
  const { users, loading, error, errorKind, notice, done, busy, retry, dismiss, changeRole, remove } = useUsers();
  const [asked, setAsked] = useState(null);

  const confirm = async () => {
    const target = asked;
    setAsked(null);
    await remove(target);
  };

  return (
    <>
      <div>
        <h1 className="page-title">Администрирование</h1>
        <p className="page-lead">Пользователи системы: смена роли и удаление. Раздел доступен только администраторам.</p>
      </div>
      {notice && <Alert text={notice} actionLabel="Закрыть" onAction={dismiss} quiet />}
      {done && (
        <p className="note" role="status">
          <span className="note__text">{done}</span>
        </p>
      )}
      {loading && <Progress>Загрузка…</Progress>}
      {error && !loading && <Alert text={error} actionLabel="Повторить" onAction={retry} />}
      {error && !loading && <ErrorHelp kind={errorKind} level={2} />}
      {asked && <ConfirmDelete user={asked} busy={busy.has(asked.id)} onConfirm={confirm} onCancel={() => setAsked(null)} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Пользователи</caption>
            <thead>
              <tr>
                <th scope="col">Почта</th>
                <th scope="col">Роль</th>
                <th scope="col">Создан</th>
                <th scope="col">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <th scope="row" className="table__email">
                    {user.email}
                    {user.id === me?.id && <span className="badge"> это вы</span>}
                  </th>
                  <td>
                    <label className="visually-hidden" htmlFor={`role-${user.id}`}>
                      Роль пользователя {user.email}
                    </label>
                    <select id={`role-${user.id}`} className="form__input" value={user.role} disabled={busy.has(user.id)} onChange={(e) => changeRole(user, e.target.value)}>
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{formatTime(user.createdAt)}</td>
                  <td>
                    <button type="button" className="button button--quiet" aria-label={`Удалить пользователя ${user.email}`} disabled={busy.has(user.id)} onClick={() => setAsked(user)}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !error && users.length === 0 && (
        <p className="note">
          <span className="note__text">Пользователей нет.</span>
        </p>
      )}
    </>
  );
}
