import { useId } from 'react';
import { NOTATIONS } from '../data/initialDiagrams';

export default function DiagramFilters({ query, status, notation = 'all', sortBy, onQuery, onStatus, onNotation = () => {}, onSort }) {
  const id = useId();
  return (
    <div className="form form--inline" role="search" aria-label="Поиск и фильтры">
      <div className="form__row form__row--4">
        <div className="form__field">
          <label className="form__label" htmlFor={`${id}-q`}>
            Поиск
          </label>
          <input id={`${id}-q`} className="form__input" type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Часть названия" />
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor={`${id}-s`}>
            Статус
          </label>
          <select id={`${id}-s`} className="form__input" value={status} onChange={(e) => onStatus(e.target.value)}>
            <option value="all">Все</option>
            <option value="published">Опубликованные</option>
            <option value="draft">Черновики</option>
          </select>
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor={`${id}-n`}>
            Фильтр по нотации
          </label>
          <select id={`${id}-n`} className="form__input" value={notation} onChange={(e) => onNotation(e.target.value)}>
            <option value="all">Все</option>
            {NOTATIONS.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor={`${id}-o`}>
            Сортировка
          </label>
          <select id={`${id}-o`} className="form__input" value={sortBy} onChange={(e) => onSort(e.target.value)}>
            <option value="date">По дате изменения</option>
            <option value="title">По названию</option>
            <option value="none">Без сортировки</option>
          </select>
        </div>
      </div>
    </div>
  );
}
