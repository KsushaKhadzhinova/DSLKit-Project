// Reproduces a real journal failure for the page-500 screenshot: drops the journal table while the server runs.
// Usage: node tools/break-journal.mjs [journal.sqlite]. Every request then answers 500 and carries out nothing.
// Restore: stop the server, delete the file (the table is created again on start) or run with --restore.
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';

export const breakJournal = (file) => {
  const db = new DatabaseSync(file);
  db.exec('DROP TABLE IF EXISTS request_log');
  db.close();
};

export const restoreJournal = (file) => {
  const db = new DatabaseSync(file);
  db.exec('CREATE TABLE IF NOT EXISTS request_log (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, method TEXT NOT NULL, path TEXT NOT NULL, ip TEXT NOT NULL, status INTEGER, request_id TEXT)');
  db.close();
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const restore = process.argv.includes('--restore');
  const file = process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? 'journal.sqlite';
  (restore ? restoreJournal : breakJournal)(file);
  console.log(`${restore ? 'Restored' : 'Dropped'} the request_log table in ${file}`);
}
