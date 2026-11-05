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

// Nothing ever deleted an old row on its own: a server left running would grow the table forever.
// Every TRIM_EVERY-th insert removes rows past MAX_ROWS, so the table stays bounded without a cron job
// or a visit to the "clear the log" button.
const MAX_ROWS = 20000;
const TRIM_EVERY = 500;

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
      // WAL lets readers (the log page) and the writer (every request) work at the same time instead of
      // taking turns, and NORMAL synchronous trades a little durability on a power loss for a much shorter
      // fsync on every insert; node:sqlite still runs each statement synchronously (it blocks the event loop
      // for as long as the write itself takes), so this shortens that block rather than removing it. A
      // :memory: database has no file to hold a WAL, so it keeps its own default journal.
      if (file !== ':memory:') opened.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
      statements = {
        insert: opened.prepare('INSERT INTO request_log (created_at, method, url) VALUES (?, ?, ?)'),
        finish: opened.prepare('UPDATE request_log SET status = ?, duration_ms = ? WHERE id = ?'),
        clear: opened.prepare('DELETE FROM request_log'),
        recent: opened.prepare('SELECT id, created_at AS time, method, url, status, duration_ms AS ms FROM request_log ORDER BY id DESC LIMIT ?'),
        trim: opened.prepare('DELETE FROM request_log WHERE id <= (SELECT MAX(id) FROM request_log) - ?'),
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
    start: guard(({ time, method, url }) => {
      const id = Number(connect().insert.run(time, method, url).lastInsertRowid);
      if (id % TRIM_EVERY === 0) connect().trim.run(MAX_ROWS);
      return id;
    }),
    finish: guard((id, status, ms) => connect().finish.run(status, ms, id)),
    // Removes every row and returns how many were removed.
    clear: guard(() => Number(connect().clear.run().changes)),
    recent: guard((limit) =>
      connect()
        .recent.all(limit)
        .map((row) => ({ ...row })),
    ),
    // A lazy, row-by-row view of the same rows `recent` returns, for the export: the file is written
    // one line at a time, so even the full table is never held in memory as one array. The database is
    // opened (and can fail) the moment this is called, same as `recent`; only the row fetching itself is lazy.
    iterate: guard((limit) => {
      const statement = connect().recent;
      return (function* () {
        for (const row of statement.iterate(limit)) yield { ...row };
      })();
    }),
    close: () => {
      // A second close must not throw: the connection is closed once and then forgotten.
      if (db) db.close();
      db = null;
    },
  };
};
