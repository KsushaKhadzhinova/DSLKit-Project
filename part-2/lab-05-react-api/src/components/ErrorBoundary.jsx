import { Component } from 'react';
import { ERRORS, kindOfCrash } from '../errorCatalog';
import ErrorHelp from './ErrorHelp';

// Styled error page instead of a blank screen: 500 for a crash, "no connection" when a piece of code could not be downloaded.
// A class component is required for error boundaries. The technical text of the error goes to the console only.
export default class ErrorBoundary extends Component {
  state = { failed: false, kind: '500' };

  static getDerivedStateFromError(error) {
    return { failed: true, kind: kindOfCrash(error) };
  }

  componentDidCatch(error) {
    console.error('DSLKit: rendering failed', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { code, title } = ERRORS[this.state.kind];
    return (
      <main className="error-page" role="alert">
        <p className="error-page__code" aria-hidden="true">
          {code}
        </p>
        <h1 className="page-title">{title}</h1>
        <ErrorHelp kind={this.state.kind} />
        <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
          {this.state.kind === 'network' ? 'Повторить' : 'Обновить страницу'}
        </button>
      </main>
    );
  }
}
