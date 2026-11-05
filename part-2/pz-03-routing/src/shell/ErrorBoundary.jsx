import { Component } from 'react';
import logoUrl from '../assets/logo.svg';
import ErrorPage from './ErrorPage';
import SiteFooter from './SiteFooter';

// Page 500: shown when rendering throws. A class component is required for error boundaries.
// It sits outside the router and the providers, so it uses a plain link and only the logo in the header, as errors/500.html does.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // The cause goes to the console for the developer, never to the page.
    console.error('DSLKit: rendering failed', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    // This boundary sits outside the router (main.jsx), so it cannot use <Link>. A hard-coded "/" would
    // send the user to the server root instead of the app when the app lives in a sub-folder (VITE_BASE)
    // or uses the hash router (VITE_ROUTER=hash, where the real home address is "<base>#/").
    // `env` can be passed in tests instead of relying on the real import.meta.env, the same way router.jsx does.
    const env = this.props.env ?? import.meta.env;
    const base = env.BASE_URL || '/';
    const homeHref = env.VITE_ROUTER === 'hash' ? `${base}#/` : base;
    return (
      <>
        <header className="header">
          <div className="header__inner">
            <a className="header__logo" href={homeHref}>
              <img className="header__logo-image" src={logoUrl} alt="" width="32" height="32" />
              <span className="header__logo-text">DSLKit</span>
            </a>
          </div>
        </header>
        <main className="main" id="main">
          <ErrorPage
            code="500"
            title="Ошибка 500: что-то пошло не так"
            text="Приложение столкнулось с внутренней ошибкой и не смогло показать страницу. Причина на нашей стороне, сохранённые данные не потеряны."
            hints={['Обновите страницу.', 'Вернитесь на главную и откройте нужный раздел заново.']}
          >
            <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
              Обновить страницу
            </button>
          </ErrorPage>
        </main>
        <SiteFooter />
      </>
    );
  }
}
