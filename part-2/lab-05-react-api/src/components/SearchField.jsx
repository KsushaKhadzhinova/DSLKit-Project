import limits from '../limits.json';

export default function SearchField({ value, onChange }) {
  return (
    <div className="form__field toolbar">
      <label className="form__label" htmlFor="search">
        Поиск по названию
      </label>
      <input
        id="search"
        className="form__input"
        type="search"
        autoComplete="off"
        value={value}
        maxLength={limits.title.maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
