import { safeLogText } from './security.js';

export const notFound = (req, res) => {
  res.status(404).render('404', { title: 'Not found', url: req.originalUrl });
};

const HEADINGS = { 403: 'Request refused', 413: 'Request too large', 429: 'Too many requests' };

// Last resort when even the 500 template fails: still a styled page, never a bare text screen.
const fallbackPage = (status) =>
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${status} – DSLKit</title><link rel="stylesheet" href="/dslkit.css"><link rel="stylesheet" href="/pz.css"></head>` +
  `<body class="page"><main class="main"><section class="error"><p class="error__code">Error code: ${status}</p><h1 class="error__title">${status} – server error</h1><p class="error__text">The error page could not be drawn. The error was logged.</p><a class="button button--primary" href="/">Back to the list</a></section></main></body></html>`;

// Four parameters mark this as the error-handling middleware. It is mounted after every route and
// middleware, so any failure ends on the 500 page (or the 4xx variant for client errors).
export const serverError =
  (write = console.error) =>
  (err, req, res, _next) => {
    write(`[error] ${safeLogText(req.method)} ${safeLogText(req.originalUrl)}`, err);
    if (res.headersSent) return res.end();
    if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));
    // Errors from body-parser and others carry their own 4xx/5xx status.
    const status = err.status >= 400 && err.status < 600 ? err.status : 500;
    const heading = HEADINGS[status] ?? (status >= 500 ? 'Server error' : 'Bad request');
    const locals = {
      title: heading,
      heading,
      status,
      message: err.publicMessage ?? '',
      // The failure may happen before fakeAuth ran, so the page needs its own defaults.
      user: res.locals.user ?? { name: 'Guest', guest: true },
      authQuery: res.locals.authQuery ?? '',
      path: '',
    };
    return res.status(status).render('500', locals, (renderError, html) => {
      if (renderError) {
        write('[error] the 500 page failed to render', renderError);
        return res.type('html').send(fallbackPage(status));
      }
      return res.send(html);
    });
  };
