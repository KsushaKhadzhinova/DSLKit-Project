import { useState } from 'react';
import { Link } from 'react-router';
import limits from '../limits.json';
import { useTags } from '../hooks/useTags';
import { validateTag } from '../utils/validation';
import Alert from './Alert';
import ErrorHelp from './ErrorHelp';
import Progress from './Progress';

function TagForm({ onAdd, adding, full }) {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (adding) return;
    const problem = validateTag(name);
    setError(problem);
    if (problem) return;
    if (await onAdd(name.trim())) setName('');
  };

  return (
    <form className="form form--wide" onSubmit={submit} noValidate aria-label="Форма тега">
      <div className="form__field">
        <label className="form__label" htmlFor="new-tag">
          Новый тег
        </label>
        <input
          id="new-tag"
          className="form__input"
          autoComplete="off"
          value={name}
          maxLength={limits.tag.maxLength}
          disabled={full}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'new-tag-error' : undefined}
        />
        {error && (
          <span className="form__error" id="new-tag-error">
            {error}
          </span>
        )}
        {full && <span className="form__hint">У диаграммы уже {limits.tagsPerDiagram} тегов, это предел</span>}
      </div>
      <div className="form__actions">
        <button type="submit" className="button" disabled={adding || full}>
          {adding ? 'Добавляем…' : 'Добавить тег'}
        </button>
      </div>
    </form>
  );
}

// The tags of one diagram. Each tag opens the list of diagrams with that tag. The owner and an administrator also see the
// buttons to add and remove; the server checks the same rule on every request.
export default function TagsSection({ diagramId, canChange }) {
  const { items, loading, error, errorKind, notice, busy, retry, dismissNotice, add, remove } = useTags(diagramId);

  return (
    <section className="tags" aria-labelledby="tags-title">
      <h2 id="tags-title">Теги</h2>
      {notice && <Alert text={notice} actionLabel="Закрыть" onAction={dismissNotice} quiet />}
      {loading && <Progress>Загрузка тегов…</Progress>}
      {error && !loading && <Alert text={error} actionLabel="Повторить" onAction={retry} />}
      {error && !loading && <ErrorHelp kind={errorKind} level={3} />}
      {!loading && !error && items.length === 0 && (
        <p className="note">
          <span className="note__text">Тегов пока нет.</span>
        </p>
      )}
      {!error && items.length > 0 && (
        <ul className="tags__list">
          {items.map((tag) => (
            <li key={tag.id} className="tags__item">
              <Link className="badge" to={`/diagrams?tag=${encodeURIComponent(tag.name)}`}>
                {tag.name}
              </Link>
              {canChange && (
                <button type="button" className="button button--quiet" aria-label={`Убрать тег ${tag.name}`} disabled={busy.has(tag.id)} onClick={() => remove(tag.id)}>
                  Убрать
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canChange && !loading && !error && <TagForm onAdd={add} adding={busy.has('new')} full={items.length >= limits.tagsPerDiagram} />}
    </section>
  );
}
