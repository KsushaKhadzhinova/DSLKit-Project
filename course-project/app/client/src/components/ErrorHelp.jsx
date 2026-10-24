import { ERRORS } from '../errorCatalog';

// The three parts of an error explained: what it is, why it happened, how to solve it.
// Shown under the message of a failed request; open by default, because the reader needs it right now.
// level: the heading level of the three parts, one below the heading above the block (h1 on an error page, h2 on a screen with a section title).
export default function ErrorHelp({ kind, open = true, level = 3 }) {
  const entry = ERRORS[kind];
  if (!entry) return null;
  const Heading = `h${level}`;
  return (
    <details className="error-help" open={open}>
      <summary className="error-help__summary">{entry.title}</summary>
      <Heading className="error-help__heading">Что это</Heading>
      <p>{entry.what}</p>
      <Heading className="error-help__heading">Почему так вышло</Heading>
      <ul>
        {entry.why.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Heading className="error-help__heading">Как это исправить</Heading>
      <ol>
        {entry.fix.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </details>
  );
}
