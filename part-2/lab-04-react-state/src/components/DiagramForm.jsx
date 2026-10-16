import { useState } from 'react';
import { NOTATIONS } from '../data/initialDiagrams';
import { validateTitle } from '../utils/validation';

export default function DiagramForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [notation, setNotation] = useState(NOTATIONS[0]);
  const [error, setError] = useState(null);

  // A form submit covers both the button and the Enter key.
  const handleSubmit = (event) => {
    event.preventDefault();
    const problem = validateTitle(title);
    setError(problem);
    if (problem) return;
    onAdd({ title: title.trim(), notation });
    setTitle('');
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        Название диаграммы
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Например, схема оплаты"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'title-error' : undefined}
        />
        {error && (
          <span id="title-error" className="error" role="alert">
            {error}
          </span>
        )}
      </label>
      <label className="field">
        Нотация
        <select value={notation} onChange={(e) => setNotation(e.target.value)}>
          {NOTATIONS.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <button type="submit">Добавить</button>
    </form>
  );
}
