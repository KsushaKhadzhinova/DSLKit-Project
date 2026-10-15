export const notFound = (req, res) => {
  res.status(404).render('404', { title: 'Not found', url: req.originalUrl });
};

// Four parameters mark this as the error-handling middleware.
export const serverError =
  (write = console.error) =>
  (err, req, res, _next) => {
    write(`[error] ${req.method} ${req.originalUrl}`, err);
    if (res.headersSent) return res.end();
    // Errors from body-parser and others carry their own 4xx/5xx status.
    const status = err.status >= 400 && err.status < 600 ? err.status : 500;
    return res.status(status).render('500', { title: status >= 500 ? 'Server error' : 'Bad request', status });
  };
