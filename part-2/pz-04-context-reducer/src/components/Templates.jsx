import { TEMPLATES } from '../data/templates';
import { useFavorites, useFavoritesDispatch } from '../context/FavoritesContext';
import { useLanguage } from '../context/LanguageContext';
import { formatTime } from '../utils';

function TemplateCard({ template }) {
  const favorites = useFavorites();
  const dispatch = useFavoritesDispatch();
  const { language, t } = useLanguage();
  const isFavorite = favorites.some((item) => item.id === template.id);
  const title = template.title[language];
  const label = `${t(isFavorite ? 'remove' : 'add')}: ${title}`;

  return (
    <li className="card">
      <span className="card__title">{title}</span>
      <span className="badge">{template.notation}</span>
      <span className="card__time">
        {t('created')}: {formatTime(template.createdAt)}
      </span>
      <button
        type="button"
        aria-pressed={isFavorite}
        aria-label={label}
        onClick={() => dispatch({ type: 'TOGGLE', id: template.id, addedAt: new Date().toISOString() })}
      >
        {isFavorite ? '★' : '☆'} {t(isFavorite ? 'remove' : 'add')}
      </button>
    </li>
  );
}

export function TemplateList() {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="templates-title">
      <h2 id="templates-title">{t('title')}</h2>
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
  const chosen = favorites.map((item) => ({ ...item, template: TEMPLATES.find((template) => template.id === item.id) })).filter((item) => item.template);

  return (
    <section aria-labelledby="favorites-title">
      <h2 id="favorites-title">
        {t('favorites')}{' '}
        <span className="badge">
          {t('count')}: {chosen.length}
        </span>
      </h2>
      {chosen.length === 0 ? (
        <p>{t('empty')}</p>
      ) : (
        <>
          <ul>
            {chosen.map(({ id, addedAt, template }) => (
              <li key={id}>
                {template.title[language]}{' '}
                <span className="card__time">
                  {t('added')}: {formatTime(addedAt)}
                </span>{' '}
                <button type="button" aria-label={`${t('remove')}: ${template.title[language]}`} onClick={() => dispatch({ type: 'REMOVE', id })}>
                  {t('remove')}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => dispatch({ type: 'CLEAR' })}>
            {t('clear')}
          </button>
        </>
      )}
    </section>
  );
}
