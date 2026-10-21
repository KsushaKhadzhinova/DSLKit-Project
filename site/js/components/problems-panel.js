import { formatProblem, ui } from '../notations/messages.js';

const ICONS = {
  error:
    '<svg class="icon problems__icon problems__icon--error" aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7"/><path d="M7 7l6 6M13 7l-6 6"/></svg>',
  warning:
    '<svg class="icon problems__icon problems__icon--warning" aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 3l8 14H2z"/><path d="M10 8v4M10 14v.5"/></svg>',
  info: '<svg class="icon problems__icon" aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7"/><path d="M10 9v5M10 6v.5"/></svg>',
};

const count = (problems, severity) => problems.filter((item) => item.severity === severity).length;

// Writes the problems of the last run into the panel, the status bar, the banner and the code lines.
export const showProblems = ({ root, page, problems, lang, file }) => {
  const errors = count(problems, 'error');
  const warnings = count(problems, 'warning');
  const list = page.querySelector('.problems__list');
  list?.replaceChildren(
    ...problems.map((item, index) => {
      const li = root.createElement('li');
      li.className = 'problems__item';
      li.id = `problem-${index + 1}`;
      li.innerHTML = `${ICONS[item.severity]}<span class="problems__severity visually-hidden"></span><span class="problems__message"></span><a class="problems__location"></a>`;
      li.querySelector('.problems__severity').textContent = ui(item.severity, {}, lang);
      li.querySelector('.problems__message').textContent = formatProblem(item, lang);
      const link = li.querySelector('.problems__location');
      link.href = `#line-${item.line}`;
      link.textContent = `${file}:${item.line}`;
      return li;
    }),
  );
  const status = page.querySelector('.problems__status');
  if (status) status.textContent = problems.length === 0 ? ui('clean', {}, lang) : ui('status', { n: errors + warnings, e: errors, w: warnings }, lang);
  const counter = page.querySelector('.problems__count');
  if (counter) counter.textContent = String(errors + warnings);
  const tab = page.querySelector('.problems__tab');
  tab?.setAttribute('aria-label', ui('tab', { n: errors + warnings }, lang));
  const banner = page.querySelector('.editor-banner');
  if (banner) {
    banner.hidden = errors === 0;
    banner.querySelector('.editor-banner__text').textContent = ui('banner', { n: errors }, lang);
  }
  const bar = page.querySelector('.editor-status__problems');
  if (bar) bar.textContent = `⊗ ${errors} ⚠ ${warnings}`;
  page.querySelectorAll('.button--run').forEach((button) => button.setAttribute('aria-disabled', String(errors > 0)));
  const reason = page.querySelector('.editor-toolbar__reason');
  if (reason) reason.hidden = errors === 0;
  page.querySelectorAll('.code__line').forEach((line, index) => {
    const here = problems.findIndex((item) => item.line === index + 1 && item.severity === 'error');
    line.id = `line-${index + 1}`;
    line.classList.toggle('code__line--error', here >= 0);
    if (here >= 0) line.setAttribute('aria-describedby', `problem-${here + 1}`);
    else line.removeAttribute('aria-describedby');
  });
};
