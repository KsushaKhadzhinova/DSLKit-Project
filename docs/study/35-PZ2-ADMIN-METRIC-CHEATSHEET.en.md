# Practical 2: cheat sheet "add a new metric for the administrator" and journal failure

Russian version: `35-PZ2-ADMIN-METRIC-CHEATSHEET.md`. Work: `part-2/pz-02-rest-api`, branch `pz22`.

## How the journal works

File `src/journal.js`. Table `request_log` (SQLite, file from `JOURNAL_FILE`, default `journal.sqlite`): `id`, `created_at`, `method`, `path`, `ip`, `status`. The `journaling` middleware sits in `src/app.js` right after the rate limiter and **before** body parsing and routes:

1. the request is written to the table (`journal.begin`) with an empty status;
2. if the write fails, the answer is 500 `journal_unavailable` in the one error format, **the route is not run**, the error goes to the console;
3. otherwise the request goes on and on the `finish` event the response code is stored (`journal.finish`); a failure of that write is only logged (the answer is already sent).

The teacher's rule: if the journal fails the system must not continue silently. So the write comes before the action. Resource data live in an array (PZ2 assignment), so there is nothing to roll back: the action simply never starts.

## Reproducing the failure

- Test: `node --test test/journal.test.js` (failed write, closed database, failed status write).
- By hand: start the server, stop it, make the journal file read-only (`attrib +R journal.sqlite`), start again; every `/api/...` request answers 500 `journal_unavailable`, `GET /health` stays 200. Undo with `attrib -R journal.sqlite`.
- If the file cannot be opened at all (`JOURNAL_FILE=Z:/no/folder/j.sqlite`) the server does not start.

## The extra task: add a metric (example: processing time in ms)

1. **Table** (`src/journal.js`): add `duration_ms INTEGER` to `CREATE TABLE`. For an existing file run `ALTER TABLE request_log ADD COLUMN duration_ms INTEGER` inside a `try` that ignores "duplicate column".
2. **Write** (`journaling`): keep `const started = performance.now()` and in `res.on('finish')` pass `Math.round(performance.now() - started)` to `journal.finish(id, status, ms)`; add `duration_ms = ?` to the `UPDATE`.
3. **Read for the administrator**: add the field to the `SELECT` in `recent` and show it (a `GET /api/journal` route guarded by a token from `.env`, or just `console.table(journal.recent())`).
4. **Failure**: a metric computed at write time (in `begin`) that throws gives 500 and the request is not run; so metrics known in advance (method, path, address) go into `begin`, those computed after the answer (time) into `finish`.
5. **Test**: in `test/journal.test.js` check the row has the new field, and that a throw from `begin` gives 500.

## Likely questions

- Why write before the action? So a journal failure stops the action (working without a journal is forbidden).
- Why is `/health` not journaled? It is a liveness probe; a journal failure must not make it fail.
- Why 500 and not 503? A failed write is an internal server error; one code for every journal failure.
- What about requests refused by the rate limiter (429)? Not journaled: the limiter runs first so a flood does not load the database.
- Why SQLite? A DB table without a separate server; for PostgreSQL only `src/journal.js` changes (the same three functions).
