import { useState } from 'react';
import limits from '../limits.json';
import { formatTime } from '../utils/validation';

// One record as a card: view mode, edit mode for the title (PUT) and delete (DELETE).
export default function DiagramItem({ diagram, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(diagram.title);
  const [error, setError] = useState(null);

  const startEdit = () => {
    setDraft(diagram.title);
    setEditing(true);
  };

  const finish = () => {
    setError(null);
    setEditing(false);
  };

  const save = () => {
    const length = draft.trim().length;
    if (length < limits.title.minLength) return setError('Введите название');
    if (length > limits.title.maxLength) return setError(`Название не длиннее ${limits.title.maxLength} символов`);
    if (draft.trim() !== diagram.title) onUpdate(diagram.id, { title: draft.trim() });
    return finish();
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
      <article className="card" aria-busy={diagram.pending ? 'true' : undefined}>
        {editing ? (
          <div className="card__title">
            <input className="form__input" aria-label="Новое название" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown} autoFocus />
            {error && (
              <p className="form__error" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <h2 className="card__title">{diagram.title}</h2>
        )}
        <p className="card__meta">
          <span className="badge">{diagram.notation}</span>
          {diagram.pending && <span className="badge badge--planned">Сохраняется…</span>}
        </p>
        <p className="card__text">Создана: {formatTime(diagram.createdAt)}</p>
        <div className="actions">
          {editing ? (
            <button type="button" className="button" aria-label={`Сохранить: ${diagram.title}`} onClick={save}>
              Сохранить
            </button>
          ) : (
            <button type="button" className="button" aria-label={`Изменить: ${diagram.title}`} disabled={diagram.pending} onClick={startEdit}>
              Изменить
            </button>
          )}
          <button type="button" className="button button--quiet" aria-label={`Удалить: ${diagram.title}`} disabled={diagram.pending} onClick={() => onRemove(diagram.id)}>
            Удалить
          </button>
        </div>
      </article>
    </li>
  );
}
