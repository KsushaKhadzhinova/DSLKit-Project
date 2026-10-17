// Part 1 of the work: the problem. Only UserAvatar uses userName,
// but Header, Navigation and UserMenu have to carry it down as a prop.
import { useLanguage } from '../context/LanguageContext';

function UserAvatar({ userName }) {
  // An empty or missing name must not break the page.
  return <span className="badge">{(userName || '?').trim().charAt(0).toUpperCase() || '?'}</span>;
}

function UserMenu({ userName }) {
  return (
    <div className="actions">
      <UserAvatar userName={userName} />
    </div>
  );
}

function Navigation({ userName }) {
  return (
    <div>
      <UserMenu userName={userName} />
    </div>
  );
}

function DrillingHeader({ userName }) {
  return (
    <div className="card">
      <Navigation userName={userName} />
    </div>
  );
}

export default function PropDrilling({ userName }) {
  const { t } = useLanguage();
  return (
    <section className="section" id="drilling" aria-labelledby="drilling-title">
      <h2 className="section__title" id="drilling-title">
        {t('drillingTitle')}
      </h2>
      <p className="section__lead">{t('drillingHint')}</p>
      <DrillingHeader userName={userName} />
    </section>
  );
}
