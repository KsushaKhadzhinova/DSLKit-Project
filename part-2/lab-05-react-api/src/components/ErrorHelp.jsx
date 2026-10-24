import { ERRORS } from '../errorCatalog';

// The three parts of an error explained: what it is, why it happened, how to solve it.
// Shown under the message of a failed request; open by default, because the reader needs it right now.
export default function ErrorHelp({ kind, open = true }) {
  const entry = ERRORS[kind];
  if (!entry) return null;
  return (
    <details className="error-help" open={open}>
      <summary className="error-help__summary">{entry.title}</summary>
      <h3 className="error-help__heading">Что это</h3>
      <p>{entry.what}</p>
      <h3 className="error-help__heading">Почему так вышло</h3>
      <ul>
        {entry.why.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h3 className="error-help__heading">Как это исправить</h3>
      <ol>
        {entry.fix.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </details>
  );
}
