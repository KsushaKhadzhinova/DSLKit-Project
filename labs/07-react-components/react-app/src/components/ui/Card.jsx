import styles from './Card.module.css';

// Container with an optional title; the content arrives through `children`.
// `headingLevel` keeps the heading order of the page correct (h2 under h1, h3 under h2).
function Card({ children, title, className = '', headingLevel: Heading = 'h3' }) {
  return (
    <article className={`${styles.card} ${className}`.trim()}>
      {title && <Heading className={styles.title}>{title}</Heading>}
      <div className={styles.content}>{children}</div>
    </article>
  );
}

export default Card;
