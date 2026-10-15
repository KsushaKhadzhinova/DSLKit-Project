export const notFound = (req, res) => {
  res.status(404).render('404', { title: 'Not found', url: req.originalUrl });
};

// Four parameters mark this as the error-handling middleware.
export const serverError =
  (write = console.error) =>
  (err, req, res, _next) => {
    write(`[error] ${req.method} ${req.originalUrl}`, err);
    if (res.headersSent) return res.end();
    return res.status(500).render('500', { title: 'Server error' });
  };
