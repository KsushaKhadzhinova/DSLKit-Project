import { useState } from 'react';
import limits from '../limits.json';
import { formatTime } from '../utils/validation';

// One record: view mode, edit mode for the title (PUT) and delete (DELETE).
export default function DiagramItem({ diagram, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(diagram.title);
  const [error, setError] = useState(null);

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
    <li className="item" aria-busy={diagram.pending ? 'true' : undefined}>
      {editing ? (
        <span className="item__title">
          <input aria-label="Новое название" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown} autoFocus />
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
      {diagram.pending && <span className="badge">Сохраняется…</span>}
      {editing ? (
        <button type="button" aria-label={`Сохранить: ${diagram.title}`} onClick={save}>
          Сохранить
        </button>
      ) : (
        <button type="button" aria-label={`Изменить: ${diagram.title}`} disabled={diagram.pending} onClick={() => setEditing(true)}>
          Изменить
        </button>
      )}
      <button type="button" className="danger" aria-label={`Удалить: ${diagram.title}`} disabled={diagram.pending} onClick={() => onRemove(diagram.id)}>
        Удалить
      </button>
    </li>
  );
}
