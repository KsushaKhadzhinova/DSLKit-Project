import styles from './Card.module.css';

// Container with an optional title; the content arrives through `children`.
function Card({ children, title, className = '' }) {
  return (
    <article className={`${styles.card} ${className}`.trim()}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.content}>{children}</div>
    </article>
  );
}

export default Card;
