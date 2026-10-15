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
      <button type="button" className="badge" onClick={() => onToggle(diagram.id)}>
        {diagram.published ? 'Опубликована' : 'Черновик'}
      </button>
      {editing ? (
        <button type="button" onClick={save}>
          Сохранить
        </button>
      ) : (
        <button type="button" onClick={() => setEditing(true)}>
          Изменить
        </button>
      )}
      <button type="button" className="danger" onClick={() => onDelete(diagram.id)}>
        Удалить
      </button>
    </li>
  );
}
