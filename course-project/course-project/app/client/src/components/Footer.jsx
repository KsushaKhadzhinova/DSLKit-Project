// Page footer of Part 1.
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <nav className="footer__nav" aria-label="Нижняя навигация">
          <ul className="footer__list">
            <li className="footer__item">
              <a className="footer__link" href="https://dslkit.io/">
                Сайт DSLKit
              </a>
            </li>
          </ul>
        </nav>
        <address className="footer__address">
          Контакты:{' '}
          <a className="footer__link" href="mailto:hello@dslkit.io">
            hello@dslkit.io
          </a>
        </address>
        <p className="footer__copy">DSLKit, курсовой проект: клиент React и серверный API</p>
      </div>
    </footer>
  );
}
