// A message with one action: the notice of a failed change ("Close") and the load error ("Retry") look the same.
export default function Alert({ text, actionLabel, onAction, quiet = false }) {
  return (
    <div className="alert" role="alert">
      <p className="alert__text">{text}</p>
      <button type="button" className={quiet ? 'button button--quiet' : 'button'} onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}
