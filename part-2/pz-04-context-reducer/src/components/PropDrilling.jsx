// Two blocks side by side. The problem: only UserAvatar uses userName,
// but Header, Navigation and UserMenu carry it down as a prop.
// The solution: the same tree, the name lives in UserContext and UserAvatar reads it directly.
import { createContext, useContext } from 'react';
import { useLanguage } from '../context/LanguageContext';

// An empty or missing name must not break the page.
const initial = (userName) => (userName || '?').trim().charAt(0).toUpperCase() || '?';

// Problem: props at every level.
function UserAvatar({ userName }) {
  return <span className="badge">{initial(userName)}</span>;
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

// Solution: Context. The middle levels take no props at all.
const UserContext = createContext('');
export const useUser = () => useContext(UserContext);

function ContextAvatar() {
  return <span className="badge">{initial(useUser())}</span>;
}

function ContextMenu() {
  return (
    <div className="actions">
      <ContextAvatar />
    </div>
  );
}

function ContextNavigation() {
  return (
    <div>
      <ContextMenu />
    </div>
  );
}

function ContextHeader() {
  return (
    <div className="card">
      <ContextNavigation />
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
      <h3 className="card__title">{t('drillingProblem')}</h3>
      <DrillingHeader userName={userName} />
      <h3 className="card__title">{t('drillingSolution')}</h3>
      <p className="section__lead">{t('drillingSolutionHint')}</p>
      <UserContext.Provider value={userName}>
        <ContextHeader />
      </UserContext.Provider>
    </section>
  );
}
