import { useState } from 'react';
import limits from '../limits.json';
import { useComments } from '../hooks/useComments';
import { formatTime, validateComment } from '../utils/validation';
import Alert from './Alert';
import ErrorHelp from './ErrorHelp';
import LoadMore from './LoadMore';
import Progress from './Progress';

// One comment: the text is shown by React as plain text, line breaks are kept by CSS (white-space: pre-wrap).
// The author or an administrator sees the buttons; the server checks the same rule on every request.
function CommentItem({ comment, user, busy, onEdit, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const [error, setError] = useState(null);
  const mine = user?.id === comment.authorId;
  const mayChange = mine || user?.role === 'admin';
  const author = mine ? 'Вы' : `Пользователь №${comment.authorId}`;

  const save = async () => {
    const problem = validateComment(draft);
    if (problem) return setError(problem);
    setError(null);
    if (draft.trim() === comment.text) return setEditing(false);
    if (await onEdit(comment.id, draft.trim())) setEditing(false);
    return undefined;
  };

  const cancel = () => {
    setDraft(comment.text);
    setError(null);
    setEditing(false);
  };

  return (
    <li className="comment" aria-busy={busy ? 'true' : undefined}>
      <p className="comment__meta">
        <strong>{author}</strong>, {formatTime(comment.createdAt)}
        {comment.updatedAt !== comment.createdAt && <span className="badge"> изменён</span>}
      </p>
      {editing ? (
        <div className="form__field">
          <label className="form__label" htmlFor={`comment-edit-${comment.id}`}>
            Текст комментария
          </label>
          <textarea
            id={`comment-edit-${comment.id}`}
            className="form__input"
            rows={3}
            value={draft}
            maxLength={limits.comment.maxLength}
            onChange={(e) => setDraft(e.target.value)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `comment-edit-${comment.id}-error` : undefined}
            autoFocus
          />
          {error && (
            <span className="form__error" id={`comment-edit-${comment.id}-error`}>
              {error}
            </span>
          )}
        </div>
      ) : (
        <p className="comment__text">{comment.text}</p>
      )}
      {mayChange && (
        <div className="actions">
          {editing ? (
            <>
              <button type="button" className="button" disabled={busy} onClick={save}>
                Сохранить
              </button>
              <button type="button" className="button button--quiet" onClick={cancel}>
                Отмена
              </button>
            </>
          ) : (
            <>
              <button type="button" className="button" aria-label={`Изменить комментарий №${comment.id}`} disabled={busy} onClick={() => setEditing(true)}>
                Изменить
              </button>
              <button type="button" className="button button--quiet" aria-label={`Удалить комментарий №${comment.id}`} disabled={busy} onClick={() => onRemove(comment.id)}>
                Удалить
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function CommentForm({ onAdd, posting }) {
  const [text, setText] = useState('');
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (posting) return;
    const problem = validateComment(text);
    setError(problem);
    if (problem) return;
    if (await onAdd(text.trim())) setText('');
  };

  return (
    <form className="form form--wide" onSubmit={submit} noValidate aria-label="Форма комментария">
      <div className="form__field">
        <label className="form__label" htmlFor="new-comment">
          Новый комментарий
        </label>
        <textarea
          id="new-comment"
          className="form__input"
          rows={3}
          value={text}
          maxLength={limits.comment.maxLength}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'new-comment-error new-comment-count' : 'new-comment-count'}
        />
        <span className="form__hint" id="new-comment-count">
          {text.length} / {limits.comment.maxLength}
        </span>
        {error && (
          <span className="form__error" id="new-comment-error">
            {error}
          </span>
        )}
      </div>
      <div className="form__actions">
        <button type="submit" className="button button--primary" disabled={posting}>
          {posting ? 'Отправляем…' : 'Отправить'}
        </button>
      </div>
    </form>
  );
}

// The comments of one diagram: the list with "load more", the form and the states of loading and failure.
export default function CommentsSection({ diagramId, user }) {
  const { items, total, loading, loadingMore, error, errorKind, notice, posting, busy, hasMore, retry, dismissNotice, loadMore, add, edit, remove } = useComments(diagramId);

  return (
    <section className="comments" aria-labelledby="comments-title">
      <h2 id="comments-title" className="comments__title">
        Комментарии{total !== null && total > 0 ? ` (${total})` : ''}
      </h2>
      {notice && <Alert text={notice} actionLabel="Закрыть" onAction={dismissNotice} quiet />}
      {loading && <Progress>Загрузка комментариев…</Progress>}
      {error && !loading && <Alert text={error} actionLabel="Повторить" onAction={retry} />}
      {error && !loading && <ErrorHelp kind={errorKind} level={3} />}
      {!loading && !error && items.length === 0 && (
        <p className="note">
          <span className="note__text">Комментариев пока нет.</span>
        </p>
      )}
      {!error && items.length > 0 && (
        <ul className="comments__list">
          {items.map((comment) => (
            <CommentItem key={comment.id} comment={comment} user={user} busy={busy.has(comment.id)} onEdit={edit} onRemove={remove} />
          ))}
        </ul>
      )}
      {!loading && !error && hasMore && <LoadMore loading={loadingMore} onClick={loadMore} />}
      {!loading && !error && <CommentForm onAdd={add} posting={posting} />}
    </section>
  );
}
