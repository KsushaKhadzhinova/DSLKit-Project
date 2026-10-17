import { Component } from 'react';

// Styled 500 page instead of a blank screen. A class component is required for error boundaries.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="error-page" role="alert">
        <p className="error-page__code" aria-hidden="true">
          500
        </p>
        <h1 className="page-title">500: что-то пошло не так</h1>
        <p className="page-lead">Приложение столкнулось с ошибкой. Обновите страницу, сохранённые диаграммы не потеряны.</p>
        <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
          Обновить страницу
        </button>
      </main>
    );
  }
}
