import { useState } from 'react';
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
    <form className="form" onSubmit={submit} noValidate aria-label="Новая диаграмма">
      <label className="field">
        Название
        <input value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={errors.title ? 'true' : undefined} />
        {errors.title && <span className="error">{errors.title}</span>}
      </label>
      <label className="field">
        Нотация
        <select value={notation} onChange={(e) => setNotation(e.target.value)}>
          {NOTATIONS.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Исходный код
        <input value={sourceCode} onChange={(e) => setSourceCode(e.target.value)} aria-invalid={errors.sourceCode ? 'true' : undefined} />
        {errors.sourceCode && <span className="error">{errors.sourceCode}</span>}
      </label>
      <button type="submit">Добавить</button>
    </form>
  );
}
