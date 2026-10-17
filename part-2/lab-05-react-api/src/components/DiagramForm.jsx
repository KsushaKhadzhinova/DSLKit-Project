import { useState } from 'react';
import limits from '../limits.json';
import { NOTATIONS, validateDiagram } from '../utils/validation';

// Adds a diagram. The form is cleared at once because the list shows the new item optimistically.
export default function DiagramForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [notation, setNotation] = useState('UML');
  const [sourceCode, setSourceCode] = useState('');
  const [errors, setErrors] = useState({});

  const submit = (event) => {
    event.preventDefault();
    const found = validateDiagram({ title, notation, sourceCode });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onAdd({ title: title.trim(), notation, sourceCode, priority: 'normal' });
    setTitle('');
    setSourceCode('');
  };

  return (
    <form className="form form--wide" onSubmit={submit} noValidate aria-label="Новая диаграмма">
      <h2 className="form__legend">Новая диаграмма</h2>
      <div className="form__row">
        <div className="form__field">
          <label className="form__label" htmlFor="new-title">
            Название
          </label>
          <input
            id="new-title"
            className="form__input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={errors.title ? 'true' : undefined}
            aria-describedby={errors.title ? 'new-title-error' : undefined}
          />
          {errors.title && (
            <span className="form__error" id="new-title-error">
              {errors.title}
            </span>
          )}
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor="new-notation">
            Нотация
          </label>
          <select id="new-notation" className="form__input" value={notation} onChange={(e) => setNotation(e.target.value)}>
            {NOTATIONS.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor="new-code">
            Исходный код
          </label>
          <input
            id="new-code"
            className="form__input"
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            aria-invalid={errors.sourceCode ? 'true' : undefined}
            aria-describedby={errors.sourceCode ? 'new-code-error' : undefined}
          />
          {errors.sourceCode && (
            <span className="form__error" id="new-code-error">
              {errors.sourceCode}
            </span>
          )}
        </div>
      </div>
      <div className="form__actions">
        <button type="submit" className="button button--primary">
          Добавить
        </button>
      </div>
    </form>
  );
}
