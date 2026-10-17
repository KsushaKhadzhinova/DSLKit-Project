import { safeLogText } from './security.js';

// Writes the request into the request_log table BEFORE the route runs, so a database failure
// reaches the error handler and the user sees the styled 500 page. Status and duration are added
// to the same row when the response finishes.
export const requestLogger =
  (log, write = console.log, urlMax = 500) =>
  (req, res, next) => {
    const startedAt = Date.now();
    // The address is user input: line breaks and control characters are escaped and the length is cut (log injection).
    const url = safeLogText(req.originalUrl, urlMax);
    let id;
    try {
      id = log.start({ time: new Date(startedAt).toISOString(), method: req.method, url });
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
      write(`[${new Date(startedAt).toISOString()}] ${req.method} ${url} ${res.statusCode} ${ms}ms`);
    });
    return next();
  };
