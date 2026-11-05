import Button from '../ui/Button';
import styles from './Header.module.css';

// Page header: the product title, links to the sections and a call-to-action button.
function Header({ title, links = [], onSignup }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <span className={styles.logo}>{title}</span>
        <nav aria-label="Основная навигация">
          <ul className={styles.links}>
            {links.map((link) => (
              <li key={link.href}>
                <a className={styles.link} href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <Button onClick={onSignup}>Записаться в бету</Button>
      </div>
    </header>
  );
}

export default Header;
