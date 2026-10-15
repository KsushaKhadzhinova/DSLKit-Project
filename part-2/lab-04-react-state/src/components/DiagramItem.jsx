import { useState } from 'react';

export default function DiagramItem({ diagram, onToggle, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(diagram.title);

  const save = () => {
    if (draft.trim()) onRename(diagram.id, draft.trim());
    setEditing(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') save();
    if (event.key === 'Escape') {
      setDraft(diagram.title);
      setEditing(false);
    }
  };

  return (
    <li className="item">
      {editing ? (
        <input aria-label="Новое название" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown} autoFocus />
      ) : (
        <span className="item__title">{diagram.title}</span>
      )}
      <span className="badge">{diagram.notation}</span>
      <span className="item__date">{diagram.updatedAt}</span>
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
