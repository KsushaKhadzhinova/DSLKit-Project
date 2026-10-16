import { Component } from 'react';

// Styled error page instead of a blank screen. A class component is required for error boundaries.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="app error-page" role="alert">
        <h1>500</h1>
        <h2>Что-то пошло не так</h2>
        <p>Приложение столкнулось с ошибкой. Обновите страницу, сохранённые диаграммы не потеряны.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Обновить страницу
        </button>
      </main>
    );
  }
}
