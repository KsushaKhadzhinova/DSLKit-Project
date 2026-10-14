import styles from './Footer.module.css';

// Page footer; the year and the owner come through props so the component stays pure.
function Footer({ owner, year }) {
  return (
    <footer className={styles.footer}>
      <p className={styles.copy}>
        © {year} {owner}. Дипломный проект БГУИР.
      </p>
    </footer>
  );
}

export default Footer;
