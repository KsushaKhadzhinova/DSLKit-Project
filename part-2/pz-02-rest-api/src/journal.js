import { DatabaseSync } from 'node:sqlite';
import { ApiError } from './errors.js';
import { logSafe } from './security.js';

// The request journal lives in a database table (variant 26 is even: a table, not a file). A request is written
// to the table BEFORE it is carried out. If that write fails the request is refused with 500 and the action is
// never run: working without a journal is forbidden, so the failure must not be swallowed.
// To add a metric for the administrator: add a column here, fill it in `begin`, nothing else changes.
export const createJournal = (file = ':memory:') => {
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE IF NOT EXISTS request_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    ip TEXT NOT NULL,
    status INTEGER,
    request_id TEXT
  )`);
  // A journal file made before the Request ID existed gets the column added instead of failing on every insert.
  if (!db.prepare('PRAGMA table_info(request_log)').all().some((column) => column.name === 'request_id')) db.exec('ALTER TABLE request_log ADD COLUMN request_id TEXT');
  const insert = db.prepare('INSERT INTO request_log (created_at, method, path, ip, request_id) VALUES (?, ?, ?, ?, ?)');
  const finish = db.prepare('UPDATE request_log SET status = ? WHERE id = ?');
  const recent = db.prepare('SELECT id, created_at, method, path, ip, status, request_id FROM request_log ORDER BY id DESC LIMIT ?');
  return {
    begin: ({ method, path, ip, requestId = null, at = new Date().toISOString() }) => Number(insert.run(at, method, path, ip, requestId).lastInsertRowid),
    finish: (id, status) => finish.run(status, id),
    recent: (count = 20) => recent.all(count),
    close: () => db.close(),
  };
};

// Express middleware. The path is cut so one huge URL cannot fill the table.
export const journaling = (journal, writeError = console.error) => (req, res, next) => {
  let id;
  try {
    id = journal.begin({ method: req.method, path: req.originalUrl.slice(0, 300), ip: req.ip ?? 'unknown', requestId: res.locals.requestId });
  } catch (err) {
    writeError(`[journal] cannot write ${logSafe(req.method)} ${logSafe(req.originalUrl)} request ${res.locals.requestId}`, err);
    return next(new ApiError(500, 'journal_unavailable', 'The request journal is unavailable, the request was not carried out'));
  }
  // The answer is already gone when this runs, so a failure here can only be reported, not turned into a 500.
  res.on('finish', () => {
    try {
      journal.finish(id, res.statusCode);
    } catch (err) {
      writeError('[journal] cannot record the status', err);
    }
  });
  return next();
};
