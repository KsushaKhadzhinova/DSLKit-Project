import { TEMPLATES } from '../data/templates';
import { MAX_QTY, useFavorites, useFavoritesDispatch, useFavoritesHistory } from '../context/FavoritesContext';
import { useLanguage } from '../context/LanguageContext';

function TemplateCard({ template }) {
  const favorites = useFavorites();
  const dispatch = useFavoritesDispatch();
  const { language, t } = useLanguage();
  const isFavorite = favorites.some((item) => item.id === template.id);
  const title = template.title[language];

  return (
    <li className="cards__item">
      <article className="card">
        <h3 className="card__title">{title}</h3>
        <p className="card__meta">
          <span className="badge">{template.notation}</span>
        </p>
        <div className="card__actions">
          <button
            type="button"
            className={isFavorite ? 'button button--tonal button--small' : 'button button--small'}
            aria-pressed={isFavorite}
            aria-label={`${t(isFavorite ? 'remove' : 'add')}: ${title}`}
            onClick={() => dispatch({ type: 'TOGGLE', id: template.id })}
          >
            {isFavorite ? '★' : '☆'} {t(isFavorite ? 'remove' : 'add')}
          </button>
        </div>
      </article>
    </li>
  );
}

export function TemplateList() {
  const { t } = useLanguage();
  return (
    <section className="section" id="templates" aria-labelledby="templates-title">
      <h2 className="section__title" id="templates-title">
        {t('title')}
      </h2>
      <ul className="cards">
        {TEMPLATES.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </ul>
    </section>
  );
}

export function FavoritesPanel() {
  const favorites = useFavorites();
  const dispatch = useFavoritesDispatch();
  const { language, t } = useLanguage();
  const { canUndo, canRedo } = useFavoritesHistory();
  const chosen = TEMPLATES.flatMap((template) => {
    const item = favorites.find((entry) => entry.id === template.id);
    return item ? [{ template, qty: item.qty }] : [];
  });

  return (
    <section className="section" id="favorites" aria-labelledby="favorites-title">
      <h2 className="section__title" id="favorites-title">
        {t('favorites')}{' '}
        <span className="badge">
          {t('count')}: {chosen.length}
        </span>
      </h2>
      <p className="actions">
        <button type="button" className="button button--small" disabled={!canUndo} onClick={() => dispatch({ type: 'UNDO' })}>
          {t('undo')}
        </button>
        <button type="button" className="button button--small" disabled={!canRedo} onClick={() => dispatch({ type: 'REDO' })}>
          {t('redo')}
        </button>
      </p>
      {chosen.length === 0 ? (
        <p className="empty">{t('empty')}</p>
      ) : (
        <>
          <ul className="cards">
            {chosen.map(({ template, qty }) => (
              <li className="cards__item" key={template.id}>
                <article className="card">
                  <h3 className="card__title">{template.title[language]}</h3>
                  <div className="card__actions">
                    <button
                      type="button"
                      className="button button--small"
                      aria-label={`${t('decrease')}: ${template.title[language]}`}
                      disabled={qty <= 1}
                      onClick={() => dispatch({ type: 'DECREMENT', id: template.id })}
                    >
                      −
                    </button>
                    <output className="badge" aria-label={`${t('quantity')}: ${template.title[language]}`}>
                      {qty}
                    </output>
                    <button
                      type="button"
                      className="button button--small"
                      aria-label={`${t('increase')}: ${template.title[language]}`}
                      disabled={qty >= MAX_QTY}
                      onClick={() => dispatch({ type: 'INCREMENT', id: template.id })}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="button button--small"
                      aria-label={`${t('remove')}: ${template.title[language]}`}
                      onClick={() => dispatch({ type: 'REMOVE', id: template.id })}
                    >
                      {t('remove')}
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
          <p className="actions">
            <button type="button" className="button button--quiet button--danger" onClick={() => dispatch({ type: 'CLEAR' })}>
              {t('clear')}
            </button>
          </p>
        </>
      )}
    </section>
  );
}
