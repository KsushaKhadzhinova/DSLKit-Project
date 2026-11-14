// The error card of errors/404.html and errors/500.html: a code badge, one h1, an explanation, hints and the way out.
export default function ErrorPage({ code, title, text, hints = [], children }) {
  return (
    <section className="error" aria-labelledby="error-title">
      <p className="error__code">Код ошибки: {code}</p>
      <h1 className="error__title" id="error-title">
        {title}
      </h1>
      <p className="error__text">{text}</p>
      {hints.length > 0 && (
        <>
          <p className="error__text">Что можно сделать:</p>
          <ul className="error__list">
            {hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </>
      )}
      {children}
    </section>
  );
}
