import NotationCard from './NotationCard';

// A list of cards; the key lets React match items between renders.
function NotationList({ notations }) {
  if (notations.length === 0) return <p>Нотации пока не добавлены.</p>;
  return (
    <ul className="grid" data-testid="notation-list">
      {notations.map((notation) => (
        <li key={notation.id}>
          <NotationCard notation={notation} />
        </li>
      ))}
    </ul>
  );
}

export default NotationList;
