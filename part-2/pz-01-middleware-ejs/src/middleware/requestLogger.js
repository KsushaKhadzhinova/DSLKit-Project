// In-memory log table: the practical forbids a database, so rows live in an array.
export const createRequestLog = (limit = 100) => {
  const rows = [];
  return {
    add: (row) => {
      rows.unshift(row);
      if (rows.length > limit) rows.pop();
    },
    all: () => [...rows],
  };
};

// Logs method, URL, status and duration once the response is finished.
export const requestLogger =
  (log, write = console.log) =>
  (req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      const row = {
        time: new Date(startedAt).toISOString(),
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - startedAt,
      };
      log.add(row);
      write(`[${row.time}] ${row.method} ${row.url} ${row.status} ${row.ms}ms`);
    });
    next();
  };
