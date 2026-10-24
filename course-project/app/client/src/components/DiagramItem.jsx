import { useState } from 'react';
import { Link } from 'react-router-dom';
import limits from '../limits.json';
import { NOTATIONS, formatTime } from '../utils/validation';

// One record as a card: view mode, edit mode for the title and the notation (PUT) and delete (DELETE).
export default function DiagramItem({ diagram, busy = false, onUpdate, onRemove }) {
  // A new record waits for POST, a changed one for PUT: in both cases the card shows progress and cannot be changed again.
  const working = Boolean(diagram.pending) || busy;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(diagram.title);
  const [notationDraft, setNotationDraft] = useState(diagram.notation);
  const [error, setError] = useState(null);

  const startEdit = () => {
    setDraft(diagram.title);
    setNotationDraft(diagram.notation);
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
    if (!NOTATIONS.includes(notationDraft)) return setError('Выберите нотацию');
    const changes = {};
    if (draft.trim() !== diagram.title) changes.title = draft.trim();
    if (notationDraft !== diagram.notation) changes.notation = notationDraft;
    if (Object.keys(changes).length > 0) onUpdate(diagram.id, changes);
    return finish();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') save();
    if (event.key === 'Escape') {
      setDraft(diagram.title);
      setNotationDraft(diagram.notation);
      finish();
    }
  };

  return (
    <li className="cards__item">
      <article className="card" aria-busy={working ? 'true' : undefined}>
        {editing ? (
          <div className="card__title">
            <input
              className="form__input"
              aria-label="Новое название"
              value={draft}
              maxLength={limits.title.maxLength}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <select className="form__input" aria-label="Новая нотация" value={notationDraft} onChange={(e) => setNotationDraft(e.target.value)} onKeyDown={handleKeyDown}>
              {NOTATIONS.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            {error && (
              <p className="form__error" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <h2 className="card__title">
            {working ? diagram.title : <Link className="card__link" to={`/diagrams/${diagram.id}`}>{diagram.title}</Link>}
          </h2>
        )}
        <p className="card__meta">
          <span className="badge">{diagram.notation}</span>
          {working && <span className="badge badge--planned">Сохраняется…</span>}
        </p>
        <p className="card__text">Создана: {formatTime(diagram.createdAt)}</p>
        <div className="actions">
          {editing ? (
            <button type="button" className="button" aria-label={`Сохранить: ${diagram.title}`} onClick={save}>
              Сохранить
            </button>
          ) : (
            <button type="button" className="button" aria-label={`Изменить: ${diagram.title}`} disabled={working} onClick={startEdit}>
              Изменить
            </button>
          )}
          <button
            type="button"
            className="button button--quiet"
            aria-label={`Удалить: ${diagram.title}`}
            disabled={working}
            onClick={() => onRemove(diagram.id)}
          >
            Удалить
          </button>
        </div>
      </article>
    </li>
  );
}
