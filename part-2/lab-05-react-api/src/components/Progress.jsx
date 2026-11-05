// A line with a spinner for something that is still running in the background.
export default function Progress({ children }) {
  return (
    <p role="status" className="status">
      <span className="spinner" aria-hidden="true"></span>
      {children}
    </p>
  );
}
