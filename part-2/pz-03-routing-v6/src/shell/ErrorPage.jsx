import { ERRORS } from './errorCatalog';

// The error card of errors/404.html and errors/500.html: a code badge, one h1 and three parts:
// what the error is, why it happened and how to solve it. Give `kind` (401, 403, 404, 500, network) for the texts from the catalog,
// or code, title and text yourself for a one-off page. `hints` stays as the list of the "how to solve" part.
export default function ErrorPage({ kind, code, title, text, hints, children }) {
  const entry = kind ? ERRORS[kind] : undefined;
  const shownCode = code ?? entry?.code;
  const shownTitle = title ?? entry?.title;
  const what = text ?? entry?.what;
  const why = entry?.why ?? [];
  const fix = hints ?? entry?.fix ?? [];
  return (
    <section className="error" aria-labelledby="error-title">
      <p className="error__code">Код ошибки: {shownCode}</p>
      <h1 className="error__title" id="error-title">
        {shownTitle}
      </h1>
      <h2 className="error__heading">Что это</h2>
      <p className="error__text">{what}</p>
      {why.length > 0 && (
        <>
          <h2 className="error__heading">Почему так вышло</h2>
          <ul className="error__list">
            {why.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
      {fix.length > 0 && (
        <>
          <h2 className="error__heading">Как это исправить</h2>
          <ol className="error__list error__list--steps">
            {fix.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </>
      )}
      {children}
    </section>
  );
}

// The same three parts folded into a block, for a page that has its own content (the sign-in form shows it after a 401 redirect).
export function ErrorDetails({ kind, summary }) {
  const entry = ERRORS[kind];
  return (
    <details className="error-details">
      <summary>{summary}</summary>
      <p className="error__text">{entry.what}</p>
      <h2 className="error__heading">Почему так вышло</h2>
      <ul className="error__list">
        {entry.why.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2 className="error__heading">Как это исправить</h2>
      <ol className="error__list error__list--steps">
        {entry.fix.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </details>
  );
}
