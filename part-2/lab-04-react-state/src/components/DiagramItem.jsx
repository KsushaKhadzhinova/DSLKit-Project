import { useState } from 'react';
import { formatTime, validateTitle } from '../utils/validation';

export default function DiagramItem({ diagram, onToggle, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(diagram.title);
  const [error, setError] = useState(null);

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
    <li className="item">
      {editing ? (
        <span className="item__title">
          <input
            aria-label="Новое название"
            aria-invalid={error ? 'true' : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          {error && (
            <span className="error" role="alert">
              {error}
            </span>
          )}
        </span>
      ) : (
        <span className="item__title">{diagram.title}</span>
      )}
      <span className="badge">{diagram.notation}</span>
      <span className="item__date">Создана: {formatTime(diagram.createdAt)}</span>
      <button
        type="button"
        className="badge"
        aria-pressed={diagram.published}
        aria-label={`${diagram.published ? 'Опубликована' : 'Черновик'}: ${diagram.title}`}
        onClick={() => onToggle(diagram.id)}
      >
        {diagram.published ? 'Опубликована' : 'Черновик'}
      </button>
      {editing ? (
        <button type="button" aria-label={`Сохранить: ${diagram.title}`} onClick={save}>
          Сохранить
        </button>
      ) : (
        <button type="button" aria-label={`Изменить: ${diagram.title}`} onClick={() => setEditing(true)}>
          Изменить
        </button>
      )}
      <button type="button" className="danger" aria-label={`Удалить: ${diagram.title}`} onClick={() => onDelete(diagram.id)}>
        Удалить
      </button>
    </li>
  );
}
