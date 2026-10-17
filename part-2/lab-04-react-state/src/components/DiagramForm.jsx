import { useId, useState } from 'react';
import { NOTATIONS } from '../data/initialDiagrams';
import limits from '../limits.json';
import { validateTitle } from '../utils/validation';

export default function DiagramForm({ onAdd, full = false }) {
  const id = useId();
  const [title, setTitle] = useState('');
  const [notation, setNotation] = useState(NOTATIONS[0]);
  const [error, setError] = useState(null);

  // A form submit covers both the button and the Enter key.
  const handleSubmit = (event) => {
    event.preventDefault();
    const problem = validateTitle(title) ?? (full ? 'Достигнут предел списка, удалите ненужные диаграммы' : null);
    setError(problem);
    if (problem) return;
    onAdd({ title: title.trim(), notation });
    setTitle('');
  };

  return (
    <form className="form form--inline" onSubmit={handleSubmit} noValidate>
      <div className="form__row form__row--add">
        <div className="form__field">
          <label className="form__label" htmlFor={`${id}-title`}>
            Название диаграммы
          </label>
          <input
            id={`${id}-title`}
            className="form__input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например, схема оплаты"
            autoComplete="off"
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${id}-error` : `${id}-hint`}
          />
          {error ? (
            <span id={`${id}-error`} className="form__error" role="alert">
              {error}
            </span>
          ) : (
            <span id={`${id}-hint`} className="form__hint">
              До {limits.title.maxLength} символов, пробелы по краям не считаются
            </span>
          )}
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor={`${id}-notation`}>
            Нотация
          </label>
          <select id={`${id}-notation`} className="form__input" value={notation} onChange={(e) => setNotation(e.target.value)}>
            {NOTATIONS.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="form__field">
          {/* An empty label keeps the button level with the inputs. */}
          <span className="form__label form__label--spacer" aria-hidden="true">
            &nbsp;
          </span>
          <button type="submit" className="button button--primary">
            Добавить
          </button>
        </div>
      </div>
    </form>
  );
}
