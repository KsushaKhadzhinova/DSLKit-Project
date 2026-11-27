import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { UserError, fileFailure } from '../errors.js';
import { translate } from '../i18n.js';

export const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];

const seed = () => [
  {
    id: 1,
    title: 'Order service sequence',
    notation: 'UML',
    description: 'Sequence diagram of a checkout request passing through the API gateway.',
    code: 'sequenceDiagram\n  Client->>API: POST /orders\n  API->>DB: insert order\n  API-->>Client: 201 Created',
    revision: 3,
    createdAt: '2026-10-01T09:00:00.000Z',
  },
  {
    id: 2,
    title: 'Approval workflow',
    notation: 'BPMN',
    description: 'Business process: a diagram goes from draft to review to published.',
    code: 'start -> draft -> review -> published',
    revision: 1,
    createdAt: '2026-10-02T10:30:00.000Z',
  },
  {
    id: 3,
    title: 'Project database',
    notation: 'ERD',
    description: 'Entities user, project and diagram with one-to-many links.',
    code: 'user 1--* project\nproject 1--* diagram',
    revision: 0,
    createdAt: '2026-10-03T14:15:00.000Z',
  },
];

// A ceiling on the table: the oldest record is dropped first, like a ring buffer.
const MAX_ITEMS = 5000;

// The diagrams live in a table of the same SQLite database as the request log (variant 26 is even: the data are
// kept in the database). The connection opens lazily, the schema is created on first use and the three sample
// records are seeded into an empty table; a database that cannot be reached fails the request (the styled 500 page),
// not the whole server. Without a file name the table is private to this store and lives in memory (tests).
// Every record gets its own creation time: it is always later than the previous one, even within one millisecond.
const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS diagrams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    notation TEXT NOT NULL,
    description TEXT NOT NULL,
    code TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK (revision >= 0),
    created_at TEXT NOT NULL
  )`;
const COLUMNS = 'id, title, notation, description, code, revision, created_at AS createdAt';

export const createDiagramStore = (now = Date.now, file = ':memory:') => {
  let db = null;
  let sql = null;
  const connect = () => {
    if (sql) return sql;
    if (file !== ':memory:' && !existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
    if (file !== ':memory:' && existsSync(file) && statSync(file).isDirectory()) throw Object.assign(new Error('a folder stands in the place of the file'), { code: 'EISDIR' });
    const opened = new DatabaseSync(file);
    try {
      opened.exec(CREATE_TABLE);
      if (file !== ':memory:') opened.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 2000;');
      const insert = opened.prepare('INSERT INTO diagrams (title, notation, description, code, revision, created_at) VALUES (?, ?, ?, ?, ?, ?)');
      if (opened.prepare('SELECT COUNT(*) AS n FROM diagrams').get().n === 0) {
        for (const one of seed()) insert.run(one.title, one.notation, one.description, one.code, one.revision, one.createdAt);
      }
      sql = {
        insert,
        all: opened.prepare(`SELECT ${COLUMNS} FROM diagrams ORDER BY id`),
        find: opened.prepare(`SELECT ${COLUMNS} FROM diagrams WHERE id = ?`),
        latest: opened.prepare('SELECT created_at AS createdAt FROM diagrams ORDER BY id DESC LIMIT 1'),
        update: opened.prepare('UPDATE diagrams SET title = ?, notation = ?, description = ?, code = ?, revision = ? WHERE id = ?'),
        remove: opened.prepare('DELETE FROM diagrams WHERE id = ?'),
        trim: opened.prepare('DELETE FROM diagrams WHERE id IN (SELECT id FROM diagrams ORDER BY id LIMIT MAX(0, (SELECT COUNT(*) FROM diagrams) - ?))'),
        exec: (text) => opened.exec(text),
      };
    } catch (error) {
      opened.close();
      throw error;
    }
    db = opened;
    return sql;
  };
  // Any failure of the database becomes the error page about the database (the same page as for the request log).
  const guard =
    (action) =>
    (...args) => {
      try {
        return action(...args);
      } catch (error) {
        throw error instanceof UserError ? error : new UserError(fileFailure(error, 'log-database-unavailable'), error);
      }
    };
  // A row that does not look like a record (a damaged file) is a failure of the database, not a crash of the page.
  const asItem = (row) => {
    if (!row || typeof row.title !== 'string' || !Number.isSafeInteger(row.revision)) throw new Error('damaged diagram row');
    return { ...row };
  };
  return {
    all: guard(() => connect().all.all().map(asItem)),
    find: guard((id) => {
      const row = connect().find.get(id);
      return row ? asItem(row) : undefined;
    }),
    add: guard(({ title, notation, description, code, revision }) => {
      const q = connect();
      // The time is read and the row is written in one transaction, so two writers cannot take the same time.
      q.exec('BEGIN IMMEDIATE');
      try {
        const previous = q.latest.get();
        const last = Math.max(now(), previous ? Date.parse(previous.createdAt) + 1 : 0);
        const id = Number(q.insert.run(title, notation, description, code, revision, new Date(last).toISOString()).lastInsertRowid);
        q.trim.run(MAX_ITEMS);
        q.exec('COMMIT');
        return asItem(q.find.get(id));
      } catch (error) {
        q.exec('ROLLBACK');
        throw error;
      }
    }),
    // Edit keeps the id and the creation time, only the form fields change.
    update: guard((id, { title, notation, description, code, revision }) => {
      const q = connect();
      return q.update.run(title, notation, description, code, revision, id).changes ? asItem(q.find.get(id)) : undefined;
    }),
    remove: guard((id) => connect().remove.run(id).changes > 0),
    close: () => {
      if (db) db.close();
      db = null;
      sql = null;
    },
  };
};

const CONTROL = /[\p{Cc}\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
// Code keeps its line breaks and tabs (code is written on more than one line); every other control
// character and direction override is refused, the same as for the title and the description.
const CONTROL_IN_CODE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
// Zero-width and filler characters look like nothing: a title made only of them would be an empty-looking line in every list.
const INVISIBLE_ONLY = /^[\p{Z}\p{Cf}\u115f\u1160\u3164\uffa0]*$/u;

// The default translator is plain English, byte-for-byte the text this module always returned before
// the translation layer existed, so a caller that does not pass `t` (every existing test, for one) sees
// no change at all.
const defaultT = (key, vars) => translate('en', key, vars);

const required = (t, field, value, max) => {
  if (value === '') return t(`validation.${field}.required`);
  if (value.length > max) return t(`validation.${field}.maxLength`, { max });
  return null;
};

// Values arrive already trimmed, so a whitespace-only value is an empty one.
// Returns an object of field errors, empty when the input is valid. Limits come from limits.json.
// `t` is the translator of the request (res.locals.t); callers that omit it get English, as before.
export const validateDiagram = (input, limits, t = defaultT) => {
  const errors = {};
  const set = (field, message) => message && (errors[field] = message);
  set('title', required(t, 'title', input.title, limits.title.maxLength));
  // Control characters (NUL, escape) and text-direction overrides are not part of a title: they break lists and can flip the text around it.
  if (!errors.title && CONTROL.test(input.title)) errors.title = t('validation.title.control');
  if (!errors.title && INVISIBLE_ONLY.test(input.title)) errors.title = t('validation.title.invisible');
  set('description', required(t, 'description', input.description, limits.description.maxLength));
  if (!errors.description && CONTROL.test(input.description)) errors.description = t('validation.description.control');
  if (input.code.length > limits.code.maxLength) errors.code = t('validation.code.maxLength', { max: limits.code.maxLength });
  if (!errors.code && CONTROL_IN_CODE.test(input.code)) errors.code = t('validation.code.control');
  if (!NOTATIONS.includes(input.notation)) errors.notation = t('validation.notation.invalid');
  const { min, max } = limits.revision;
  if (input.revision === '') errors.revision = t('validation.revision.required');
  else if (!/^\d+$/.test(input.revision) || Number(input.revision) < min || Number(input.revision) > max) {
    errors.revision = t('validation.revision.range', { min, max });
  }
  return errors;
};
