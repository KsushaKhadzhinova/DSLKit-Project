import { Component } from 'react';
import logoUrl from '../assets/logo.svg';
import ErrorPage from './ErrorPage';
import { kindOfError } from './errorCatalog';
import SiteFooter from './SiteFooter';

// Page 500: shown when rendering throws. A class component is required for error boundaries.
// It sits outside the router and the providers, so it uses a plain link and only the logo in the header, as errors/500.html does.
export default class ErrorBoundary extends Component {
  state = { failed: false, kind: '500' };

  static getDerivedStateFromError(error) {
    return { failed: true, kind: kindOfError(error) };
  }

  componentDidCatch(error) {
    // The cause goes to the console for the developer, never to the page.
    console.error('DSLKit: rendering failed', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <>
        <header className="header">
          <div className="header__inner">
            <a className="header__logo" href="/">
              <img className="header__logo-image" src={logoUrl} alt="" width="32" height="32" />
              <span className="header__logo-text">DSLKit</span>
            </a>
          </div>
        </header>
        <main className="main" id="main">
          <ErrorPage kind={this.state.kind}>
            <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
              {this.state.kind === 'network' ? 'Повторить' : 'Обновить страницу'}
            </button>
          </ErrorPage>
        </main>
        <SiteFooter />
      </>
    );
  }
}
