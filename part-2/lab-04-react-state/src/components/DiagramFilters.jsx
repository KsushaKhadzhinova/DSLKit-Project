export default function DiagramFilters({ query, status, sortBy, onQuery, onStatus, onSort }) {
  return (
    <div className="filters">
      <label className="field">
        Поиск
        <input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Часть названия" />
      </label>
      <label className="field">
        Статус
        <select value={status} onChange={(e) => onStatus(e.target.value)}>
          <option value="all">Все</option>
          <option value="published">Опубликованные</option>
          <option value="draft">Черновики</option>
        </select>
      </label>
      <label className="field">
        Сортировка
        <select value={sortBy} onChange={(e) => onSort(e.target.value)}>
          <option value="date">По дате изменения</option>
          <option value="title">По названию</option>
          <option value="none">Без сортировки</option>
        </select>
      </label>
    </div>
  );
}
