// Prints the last rows of the request journal table, for example: node tools/show-journal.mjs journal.sqlite
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';

export const lastRows = (file, count = 15) => {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return db.prepare('SELECT id, method, path, status, substr(request_id, 1, 8) AS request_id FROM request_log ORDER BY id DESC LIMIT ?').all(count);
  } finally {
    db.close();
  }
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) console.table(lastRows(process.argv[2] ?? 'journal.sqlite'));
