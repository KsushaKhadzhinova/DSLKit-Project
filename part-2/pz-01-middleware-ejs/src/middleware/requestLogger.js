import { UserError } from '../errors.js';
import { safeLogText } from './security.js';

// Writes the request into the request_log table BEFORE the route runs, so a database failure
// reaches the error handler and the user sees the styled 500 page. Status and duration are added
// to the same row when the response finishes.
// The sign-in flag of the imitation must not be copied into the log, so a reader of the log cannot reuse it.
// Express decodes the query string before it looks at parameter names, so "%61uth=1" signs a visitor in just
// like "auth=1" does; masking has to work on the decoded name too, not on the raw text of the address.
export const hideAuth = (url) => {
  const text = String(url);
  const mark = text.indexOf('?');
  if (mark === -1) return text;
  const query = text.slice(mark + 1);
  if (query === '') return text;
  const masked = new URLSearchParams();
  let changed = false;
  for (const [key, value] of new URLSearchParams(query)) {
    if (key.toLowerCase() === 'auth') {
      masked.append(key, '***');
      changed = true;
    } else {
      masked.append(key, value);
    }
  }
  return changed ? `${text.slice(0, mark)}?${masked.toString()}` : text;
};

export const requestLogger =
  (log, write = console.log, urlMax = 500) =>
  (req, res, next) => {
    const startedAt = Date.now();
    // The address is user input: line breaks and control characters are escaped and the length is cut (log injection).
    const url = safeLogText(hideAuth(req.originalUrl), urlMax);
    let id;
    try {
      id = log.start({ time: new Date(startedAt).toISOString(), method: req.method, url });
    } catch (cause) {
      // The database layer already names the problem (UserError); anything else is wrapped in a plain error.
      const error = cause instanceof UserError ? cause : new Error('Request log write failed', { cause });
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
