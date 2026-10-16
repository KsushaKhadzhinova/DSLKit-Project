import { TEMPLATES } from '../data/templates';
import { useFavorites } from '../context/FavoritesContext';
import { useLanguage } from '../context/LanguageContext';

function TemplateCard({ template }) {
  const { favorites, dispatch } = useFavorites();
  const { language, t } = useLanguage();
  const isFavorite = favorites.includes(template.id);
  const title = template.title[language];

  return (
    <li className="card">
      <span className="card__title">{title}</span>
      <span className="badge">{template.notation}</span>
      <button
        type="button"
        aria-pressed={isFavorite}
        aria-label={`${t(isFavorite ? 'remove' : 'add')}: ${title}`}
        onClick={() => dispatch({ type: 'TOGGLE', id: template.id })}
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
  const { favorites, dispatch } = useFavorites();
  const { language, t } = useLanguage();
  const chosen = TEMPLATES.filter((template) => favorites.includes(template.id));

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
            {chosen.map((template) => (
              <li key={template.id}>
                {template.title[language]}{' '}
                <button type="button" aria-label={`${t('remove')}: ${template.title[language]}`} onClick={() => dispatch({ type: 'REMOVE', id: template.id })}>
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
