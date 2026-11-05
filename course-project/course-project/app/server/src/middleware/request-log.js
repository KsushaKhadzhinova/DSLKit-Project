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

// Personal data (the address of the client, the time and the path of a request) is kept for a limited time only:
// rows older than the retention period are deleted at the start and then once an hour.
const DEFAULT_RETENTION_DAYS = 30;
const HOUR_MS = 60 * 60 * 1000;

const purgeOldLogs = async ({ RequestLog }, days = DEFAULT_RETENTION_DAYS, now = Date.now) => {
  const { Op } = require('sequelize');
  return RequestLog.destroy({ where: { createdAt: { [Op.lt]: new Date(now() - days * 24 * HOUR_MS) } } });
};

// Returns the timer, so a test or a graceful stop can clear it. A failed purge is reported and tried again next hour.
const startLogRetention = (models, days = DEFAULT_RETENTION_DAYS) => {
  const run = () => purgeOldLogs(models, days).catch((error) => console.error('Cannot delete old request log rows:', error.message));
  run();
  return setInterval(run, HOUR_MS).unref();
};

module.exports = { createRequestLogger, clean, purgeOldLogs, startLogRetention };
