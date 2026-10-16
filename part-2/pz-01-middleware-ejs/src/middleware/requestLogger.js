// Writes the request into the request_log table BEFORE the route runs, so a database failure
// reaches the error handler and the user sees the styled 500 page. Status and duration are added
// to the same row when the response finishes.
export const requestLogger =
  (log, write = console.log) =>
  (req, res, next) => {
    const startedAt = Date.now();
    let id;
    try {
      id = log.start({ time: new Date(startedAt).toISOString(), method: req.method, url: req.originalUrl });
    } catch (cause) {
      const error = new Error('Request log write failed', { cause });
      error.publicMessage = 'The request log table could not be written. Check the database file and try again.';
      return next(error);
    }
    res.on('finish', () => {
      const ms = Date.now() - startedAt;
      try {
        log.finish(id, res.statusCode, ms);
      } catch (error) {
        write(`[log] could not finish row ${id}: ${error.message}`);
      }
      write(`[${new Date(startedAt).toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    return next();
  };
