const MAX_PATH = 200;

// Request-controlled text is written to the log, so control characters (a new line would forge a log line)
// are replaced and the length is capped. The query string is dropped: it may carry tokens.
const clean = (text, max) =>
  String(text)
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, '?')
    .slice(0, max);

// Even variant: the log goes to a database table, not to a file.
// The row is written before the route runs. If that fails the error goes to the error handler, so the client gets 500.
// The status is added after the response is sent, on a best-effort basis.
const createRequestLogger =
  ({ RequestLog }) =>
  async (req, res, next) => {
    let row;
    try {
      row = await RequestLog.create({
        method: clean(req.method, 10),
        path: clean(req.path, MAX_PATH),
        ip: clean(req.ip ?? 'unknown', 64),
      });
    } catch (error) {
      return next(error);
    }
    res.on('finish', () => {
      row.update({ status: res.statusCode }).catch((error) => console.error('Cannot save the response status to the request log:', error.message));
    });
    return next();
  };

module.exports = { createRequestLogger, clean };
