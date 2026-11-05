// The footer of the Part 1 site. `links` holds the <li> items of the bottom navigation.
const DEFAULT_LABELS = { nav: 'Нижняя навигация', copy: '© 2026 DSLKit. Учебный проект БГУИР.' };

export default function SiteFooter({ links = null, labels = DEFAULT_LABELS }) {
  return (
    <footer className="footer">
      <div className="footer__inner">
        {links && (
          <nav className="footer__nav" aria-label={labels.nav}>
            <ul className="footer__list">{links}</ul>
          </nav>
        )}
        <p className="footer__copy">
          <small>{labels.copy}</small>
        </p>
      </div>
    </footer>
  );
}
