// Prints rows of a SQLite file for a figure: node shots/windows/query-db.mjs <file> "<SELECT ...>" ["<SELECT ...>" ...]
// The first line of each block is the query, then the column names and the rows separated by |, as the sqlite3 program does.
import { DatabaseSync } from 'node:sqlite';

const [file, ...queries] = process.argv.slice(2);
const db = new DatabaseSync(file, { readOnly: true });
for (const sql of queries) {
  const rows = db.prepare(sql).all();
  console.log(sql);
  if (rows.length) console.log(Object.keys(rows[0]).join('|'));
  for (const row of rows) console.log(Object.values(row).join('|'));
  console.log('');
}
db.close();
