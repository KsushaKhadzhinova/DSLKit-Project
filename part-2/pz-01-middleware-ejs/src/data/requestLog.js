import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { UserError, fileFailure } from '../errors.js';

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS request_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    status INTEGER,
    duration_ms INTEGER
  )`;

// The request log is a table in a SQLite database. The connection opens lazily on first use,
// so a database that cannot be opened fails the request (and shows the 500 page), not the whole server.
export const openRequestLog = (file = ':memory:') => {
  let db = null;
  let statements = null;
  const connect = () => {
    if (statements) return statements;
    // The folder is made only when it is missing: mkdir on the root of a drive (E:/) fails on Windows even with recursive.
    if (file !== ':memory:' && !existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
    if (file !== ':memory:' && existsSync(file) && statSync(file).isDirectory()) throw Object.assign(new Error('a folder stands in the place of the file'), { code: 'EISDIR' });
    const opened = new DatabaseSync(file);
    try {
      opened.exec(CREATE_TABLE);
      statements = {
        insert: opened.prepare('INSERT INTO request_log (created_at, method, url) VALUES (?, ?, ?)'),
        finish: opened.prepare('UPDATE request_log SET status = ?, duration_ms = ? WHERE id = ?'),
        clear: opened.prepare('DELETE FROM request_log'),
        recent: opened.prepare('SELECT id, created_at AS time, method, url, status, duration_ms AS ms FROM request_log ORDER BY id DESC LIMIT ?'),
      };
    } catch (error) {
      opened.close();
      throw error;
    }
    db = opened;
    return statements;
  };
  // Any failure of the database (a deleted or locked file, a missing folder, a full disk) becomes the error page about the log database.
  const guard =
    (action) =>
    (...args) => {
      try {
        return action(...args);
      } catch (error) {
        throw error instanceof UserError ? error : new UserError(fileFailure(error, 'log-database-unavailable'), error);
      }
    };
  return {
    start: guard(({ time, method, url }) => Number(connect().insert.run(time, method, url).lastInsertRowid)),
    finish: guard((id, status, ms) => connect().finish.run(status, ms, id)),
    // Removes every row and returns how many were removed.
    clear: guard(() => Number(connect().clear.run().changes)),
    recent: guard((limit) =>
      connect()
        .recent.all(limit)
        .map((row) => ({ ...row })),
    ),
    close: () => {
      // A second close must not throw: the connection is closed once and then forgotten.
      if (db) db.close();
      db = null;
    },
  };
};
