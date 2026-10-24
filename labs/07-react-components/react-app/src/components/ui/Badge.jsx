import styles from './Badge.module.css';

// Small status label; `tone` picks the colour and the text is the child.
function Badge({ children, tone = 'neutral' }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

export default Badge;
