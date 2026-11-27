# Audit, practical 1 "Middleware and templating" (variant 26)

Folder `part-2/pz-01-middleware-ejs`, work branch `pz21`, executor branch `wip/t37-pz1`. Russian version: `pz-01-AUDIT.md`.

| # | Requirement | Where met | Evidence | Status |
| --- | --- | --- | --- | --- |
| 1 | Express + EJS, `view engine`, `views` | `src/app.js` | `test/app.test.js` | done |
| 2 | At least 3 dynamic pages: list, detail, form | `views/index.ejs`, `item.ejs`, `add.ejs`, partials | `test/app.test.js`, report figures | done |
| 3 | Logging middleware: method, URL, time | `src/middleware/requestLogger.js` (console and `request_log` table, even variant) | `test/log-*.test.js` | done |
| 4 | Simulated auth `?auth=1`, else `/login` | `src/middleware/fakeAuth.js` | `test/security.test.js` | done |
| 5 | Routes `GET /`, `GET /item/:id`, `GET/POST /add` with redirect | `src/app.js` | `test/app.test.js`, `edit-delete.test.js` | done |
| 6 | Separate styled 404 and 500 pages, error logged | `views/404.ejs`, `500.ejs`, `errorHandlers.js` | `negative*.test.js`, report figures | done |
| 7 | 500 page from a real failure, not a button | server started with an unreachable `DB_FILE`; test "database that stops" | `test/log-sabotage.test.js`, README | done (owner decision b) |
| 8 | Data and request log in DB tables (owner decision of 27 Nov) | `src/data/diagrams.js` (table `diagrams`, schema and samples on first start, transactions, rollback), `requestLog.js` | `test/store-db.test.js`, `units.test.js` | fixed |
| 9 | Form validation: blanks, lengths, number not below zero | `validateDiagram`, `limits.json` | `test/negative*.test.js`, `stress.test.js` | done |
| 10 | Limits in a separate file | `limits.json`, `src/limits.js` | boundary tests | done |
| 11 | Unique creation time per record | `createdAt`, strictly increasing | `diagrams.js`, store tests | done |
| 12 | CSRF, headers, rate limit | `middleware/security.js` | `test/security.test.js` | done |
| 13 | Tests, 100 % coverage, ESLint | `npm test`, `npm run lint` | run on 2026-11-27 | done |
| 14 | Run from scratch by README | `npm install`, `npm start`, `.env.example` | `npm install` and `npm test` in a clean worktree | done (server not opened by hand in a browser) |
| 15 | README RU and EN, branch, how to run | `README.md` | reading | done |
| 16 | Defence study guide | `docs/study/18-PZ1-MIDDLEWARE-EJS(.en).md` | reading | done |
| 17 | Report, questions 25-27 | handled by sub-chat T38 | untouched | out of my scope |
| 18 | Screenshots of console, browser, log table | `figures/` | - | owner only (list below) |

Total: done 13, fixed 1 (data in the DB), owner only 1, out of scope 1; decision (a) taken, (b) the 500 page stays a real failure. Coverage of `src/**`: 100 % lines, branches and functions (threshold in `npm test`), 185 tests including golden pages in `test/golden/`. `report.test.mjs` is red until the report is rebuilt (listings changed): T38 task.

## Owner decisions: two options each

**(a) Data in DB or array (decided 27 Nov: DB, implemented).** Array: no change, 0 h; risk: the teacher's 16 Oct note expects a table. DB: move `createDiagramStore` to SQLite, same interface `all/find/add/update/remove`; about 3-4 h with tests; risk: the task text says "no database", the report needs a remark. The request log is already a DB table.

**(b) 500 page.** Now a real failure (unreachable DB file, DB stopped at runtime), no button. Option with a debug route `/boom`: about 30 min; risk: a dedicated route in production code and "500 was staged". Recommendation: keep the real failure.

## Owner only (screenshots)

Console with the request log; browser: list, detail, form with errors, 404, 500 (start with `DB_FILE=package.json/blocked/log.db npm start`); the `request_log` table in a SQLite viewer.


## What changed and what T38 must update

- Diagrams are now rows of table `diagrams` in the same SQLite database (`DB_FILE`), not an array; `request_log` is unchanged. A diagram write runs in a `BEGIN IMMEDIATE` transaction, creation time strictly increases. A DB failure and a damaged row both give the styled 500.
- When the log write fails the action is not performed (the log is written before the route): test `when the request log cannot be written, the action is NOT done`.
- Report: replace the store listing (`diagrams.js`, `server.js`), drop "data in an array", add table `diagrams` (id, title, notation, description, code, revision, created_at) and "how to reproduce a log failure" (`DB_FILE=package.json/blocked/log.db npm start`); the report quotes 166 tests and 99.59 %: now 185 and 100 %.
- Owner screenshots: `diagrams-table`, `request-log-table` (SQLite viewer), `server-error` (500 after starting with an unreachable `DB_FILE`), `not-found`, `list`, `detail`, `form-errors`, `log`.
- Cheat sheet: `docs/study/18b-PZ1-NEW-METRIC.md`. Not verified: the server by hand in a browser, Stryker (mutation testing was not run).

## Error pages (owner requirement)

Pages 400, 403, 404, 405, 413, 429 and 500 (and the log error codes) show: code and name, "what happened", "why", "what to do", a link home and the request number (also in the `X-Request-Id` header and the server log lines). No stack, paths, SQL or table names. Tests: `test/error-pages.test.js`, golden copies in `test/golden/`. Screens to add for T38 and the owner: `error-400`, `error-403`, `error-404`, `error-405`, `error-413`, `error-429`, `error-500-real-failure`. There are no JSON API answers except `/health`.
