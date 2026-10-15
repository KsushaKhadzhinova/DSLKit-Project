import { useState } from 'react';
import { NOTATIONS } from '../data/initialDiagrams';

export default function DiagramForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [notation, setNotation] = useState(NOTATIONS[0]);

  // A form submit covers both the button and the Enter key.
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), notation });
    setTitle('');
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="field">
        Название диаграммы
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, схема оплаты" />
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
