// Part 1 of the work: the problem. Only UserAvatar uses userName,
// but Header, Navigation and UserMenu have to carry it down as a prop.
import { useLanguage } from '../context/LanguageContext';

function UserAvatar({ userName }) {
  return <span className="avatar">{userName.charAt(0).toUpperCase()}</span>;
}

function UserMenu({ userName }) {
  return (
    <div className="user-menu">
      <UserAvatar userName={userName} />
    </div>
  );
}

function Navigation({ userName }) {
  return (
    <nav>
      <UserMenu userName={userName} />
    </nav>
  );
}

function DrillingHeader({ userName }) {
  return (
    <div className="drilling-header">
      <Navigation userName={userName} />
    </div>
  );
}

export default function PropDrilling({ userName }) {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="drilling-title">
      <h2 id="drilling-title">{t('drillingTitle')}</h2>
      <p>{t('drillingHint')}</p>
      <DrillingHeader userName={userName} />
    </section>
  );
}
