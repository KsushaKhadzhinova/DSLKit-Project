import { memo, useCallback, useId, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TEMPLATES } from '../data/templates';
import limits from '../limits.json';
import { usePageTitle } from '../usePageTitle';
import PageHead from './PageHead';

export const SORTS = {
  id: { label: 'По номеру', compare: (a, b) => a.id - b.id },
  title: { label: 'По названию', compare: (a, b) => a.title.localeCompare(b.title, 'ru') },
  notation: { label: 'По нотации', compare: (a, b) => a.notation.localeCompare(b.notation) || a.id - b.id },
};

// The filter lives in the address (?q=text&sort=title), so a filtered catalog can be shared as a link.
// A value from the address is cut to the limit, a whitespace-only query and an unknown sort are ignored.
export function readCatalogParams(searchParams) {
  const raw = (searchParams.get('q') ?? '').slice(0, limits.search.maxLength);
  const sort = Object.hasOwn(SORTS, searchParams.get('sort')) ? searchParams.get('sort') : 'id';
  return { raw, query: raw.trim().toLowerCase(), sort };
}

export function filterTemplates(query, sort) {
  const found = query ? TEMPLATES.filter((t) => [t.title, t.notation, t.description].some((text) => text.toLowerCase().includes(query))) : TEMPLATES;
  return [...found].sort(SORTS[sort].compare);
}

// One card, memoized: TEMPLATES entries are stable module-level objects, so the same template passed
// again as a prop (the common case: typing into an unrelated field, or a route change elsewhere re-rendering
// Catalog without the filter actually changing) keeps the same reference and React.memo skips the re-render.
// With five templates the win is not measurable, but filterTemplates below already does one full pass over
// TEMPLATES on every change, so the same shallow-prop check keeps paying for itself as the catalog grows.
export const TemplateCard = memo(function TemplateCard({ template }) {
  return (
    <li className="cards__item">
      <article className="card">
        <h2 className="card__title">{template.title}</h2>
        <p className="card__meta">
          <span className="badge">{template.notation}</span>
        </p>
        <p className="card__text">{template.description}</p>
        <Link className="card__link" to={`/catalog/${template.id}`} aria-label={`Открыть шаблон: ${template.title}`}>
          Открыть шаблон
        </Link>
      </article>
    </li>
  );
});

export default function Catalog() {
  usePageTitle('Каталог шаблонов');
  const id = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const { raw, query, sort } = readCatalogParams(searchParams);

  // Recomputed only when the trimmed query or the sort key changes, not on every render of Catalog
  // (for example the focus-move effect in Layout runs on every route change, including ones unrelated
  // to this page's own state).
  const shown = useMemo(() => filterTemplates(query, sort), [query, sort]);

  // update is passed to both the search input and the sort select; useCallback keeps one stable function
  // across renders instead of a new closure on every keystroke, matching the TemplateCard memoization above.
  const update = useCallback(
    (next) => {
      const params = {};
      if (next.q) params.q = next.q;
      if (next.sort !== 'id') params.sort = next.sort;
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  return (
    <>
      <PageHead title="Каталог шаблонов" lead="Выберите шаблон, чтобы открыть его страницу по адресу /catalog/номер." />
      <div className="catalog-tools">
        <div className="form__field">
          <label className="form__label" htmlFor={`${id}-q`}>
            Поиск по каталогу
          </label>
          <input
            id={`${id}-q`}
            className="form__input"
            type="search"
            value={raw}
            maxLength={limits.search.maxLength}
            onChange={(e) => update({ q: e.target.value.slice(0, limits.search.maxLength), sort })}
          />
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor={`${id}-sort`}>
            Сортировка
          </label>
          <select id={`${id}-sort`} className="form__input" value={sort} onChange={(e) => update({ q: raw, sort: e.target.value })}>
            {Object.entries(SORTS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="stats" role="status">
        Найдено: {shown.length} из {TEMPLATES.length}
      </p>
      {shown.length === 0 ? (
        <p className="empty">Ничего не найдено по запросу «{raw.trim()}».</p>
      ) : (
        <ul className="cards">
          {shown.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </ul>
      )}
    </>
  );
}
