export default function LoadMore({ loading, onClick }) {
  return (
    <div className="actions">
      <button type="button" className="button" disabled={loading} aria-busy={loading ? 'true' : undefined} onClick={onClick}>
        {loading ? 'Загрузка…' : 'Загрузить ещё'}
      </button>
    </div>
  );
}
