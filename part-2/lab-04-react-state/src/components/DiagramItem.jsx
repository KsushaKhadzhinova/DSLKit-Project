import { useId, useState } from 'react';
import { formatTime, validateTitle } from '../utils/validation';

export default function DiagramItem({ diagram, onToggle, onRename, onDelete }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(diagram.title);
  const [error, setError] = useState(null);
  const statusText = diagram.published ? 'Опубликована' : 'Черновик';

  const finish = () => {
    setError(null);
    setEditing(false);
  };

  const save = () => {
    const problem = validateTitle(draft);
    if (problem) {
      setError(problem);
      return;
    }
    onRename(diagram.id, draft.trim());
    finish();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') save();
    if (event.key === 'Escape') {
      setDraft(diagram.title);
      finish();
    }
  };

  return (
    <li className="cards__item">
      <article className="card">
        {editing ? (
          <div className="form__field">
            <input
              className="form__input"
              aria-label="Новое название"
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {error && (
              <span id={`${id}-error`} className="form__error" role="alert">
                {error}
              </span>
            )}
          </div>
        ) : (
          <h3 className="card__title">{diagram.title}</h3>
        )}
        <p className="card__meta">
          <span className="badge">{diagram.notation}</span>
        </p>
        <p className="card__text">Создана: {formatTime(diagram.createdAt)}</p>
        <div className="card__actions">
          <button
            type="button"
            className="button button--tonal button--small"
            aria-pressed={diagram.published}
            aria-label={`${statusText}: ${diagram.title}`}
            onClick={() => onToggle(diagram.id)}
          >
            {statusText}
          </button>
          {editing ? (
            <button type="button" className="button button--small" aria-label={`Сохранить: ${diagram.title}`} onClick={save}>
              Сохранить
            </button>
          ) : (
            <button type="button" className="button button--small" aria-label={`Изменить: ${diagram.title}`} onClick={() => setEditing(true)}>
              Изменить
            </button>
          )}
          <button type="button" className="button button--quiet button--danger button--small" aria-label={`Удалить: ${diagram.title}`} onClick={() => onDelete(diagram.id)}>
            Удалить
          </button>
        </div>
      </article>
    </li>
  );
}
