# Audit of Lab 1 "Server application on Node.js" (variant 26)

Folder `part-2/lab-01-node-server`, submission branch `lab21`. Checked 2026-11-27 on `wip/t37-lab1` from `origin/main` (ff07ffe2). Russian version: `lab-01-AUDIT.md`.

Statuses: **done** (existed and confirmed), **fixed** (found and corrected in this task), **awaits decision** (depends on an owner decision), **owner only**.

## 1 Table "requirement → where met → evidence → status"

| # | Requirement | Where met | Evidence | Status |
| --- | --- | --- | --- | --- |
| 1 | `npm init`, `express`, `nodemon` as dev, scripts `start` and `dev` | `package.json` | clean `npm install`, `npm start` prints "Server running" | done |
| 2 | `server.js`, `express.json()`, port, `listen` | `server.js`, `src/app.js` | `tests/health.test.js`, smoke test in `stress.test.js` | done |
| 3 | GET list, GET by id, POST, PUT, DELETE of a domain resource | routes, controller | `tests/diagrams.test.js`; PATCH added (condition question 10) | done |
| 4 | Data in an in-memory array | `src/models/diagram.model.js` | store tests | done by the condition, see row 12 |
| 5 | 404 with JSON | `error-handler.js`, `errors.js` | 404 tests for all methods and unknown paths | done |
| 6 | 400 on bad data | `validate.js`, `list-query.js` | `negative.test.js`, `control-chars.test.js`, `paging.test.js` | done |
| 7 | Global error handler | `error-handler.js` | test "unexpected failure answers 500 without the internal message" | done |
| 8 | `routes/`, `controllers/`, `models/` layout | `src/…` | folder tree | done |
| 9 | Testing with Postman, REST Client, curl | `requests.http`, `postman_collection.json`, `npm test` | 78 tests, coverage 100 / 98.13 / 100 | done |
| 10 | Screenshots from Postman or browser | `figures/01…09`, `shots/shots.mjs` | figures 6–8 are script output, not a Postman window | owner only (section 3) |
| 11 | Report content | `report.tpl.md`, `report.en.tpl.md` | `npm test` runs the report linter; RU and EN built, `node tools/build.js` leaves no diff | done |
| 12 | Teacher rule of 16 Oct: even variant keeps Lab 1 data in a DB | currently an array | the condition says "array", owner decision "array" | awaits decision (a) |
| 13 | 500 page from a real failure, not a button | API returns a JSON 500 with no internal text; no real failure in array mode, no HTML pages in Lab 1 | tests replace the store with one that throws | awaits decision (b), depends on (a) |
| 14 | Whitespace values and length limits, limits in a separate file | `limits.json`, `validate.js` | trim, 80/60/10000 characters, invisible characters, 413 body tests | done |
| 15 | Numbers ≥ 0, huge numbers | `list-query.js`, `parseId` | `paging.test.js`, `negative.test.js` (`1e9`, `-1`, `0x10`, 10000 digits) | done |
| 16 | Unique creation time | `stamp()` | same-millisecond creation test | done |
| 17 | Styled 404 and 500 | JSON API, uniform `{ "error": … }` | format tests | done for the API; HTML pages await (a) |
| 18 | No secrets, `.env.example` present | `.env.example`, `.gitignore` | `.env` not tracked | done |
| 19 | ESLint clean | `eslint.config.js` | `npm run lint` empty | done |
| 20 | Report layout rules from `06` | report templates | `lint-report.js` via `report.test.mjs` | done |
| 21 | Control questions n−1, n, n+1 | report 3.7 answers 9, 10, 11 of 16 | condition has 16, 26 mod 16 = 10 | done; question count awaits confirmation (d) |
| 22 | README: what is done, how to run, branch | `README.md`, `README.en.md` | branch `lab21` stated, `npm audit` note corrected (`braces` → `minimatch`) | fixed |
| 23 | Defence study doc | `docs/study/10-LR1-NODE-SERVER.md`, `.en.md` | sections 5–6; storage-options section added | fixed |
| 24 | Run from scratch | `npm install`, `npm test`, `npm run lint` | Node 24.13.1: 78 of 78, lint clean | done in the work tree; not checked on a separate fresh copy or Node 22 |
| 25 | Submission branch `lab21` | none | created and pushed by the owner | owner only |

Totals over 25 rows: done 18 (1–9, 11, 14–16, 18–21; rows 17 and 24 with a caveat), fixed 2 (22, 23), awaits decision 2 (12, 13), owner only 2 (10, 25).

## 2 Gaps by priority

| Priority | Gap | Action |
| --- | --- | --- |
| High | Array versus the teacher's "even variant in a DB" | Owner decision (a), options in section 4 |
| High | No real Postman screenshots | Owner (section 3) |
| Medium | 16 Oct: "Lab 1 needs only whitespace and length checks, other validation is redundant". The code also has enum checks for `notation` and `priority`, control-character rejection, paging, sorting, search `q`, PATCH, security headers: beyond the condition | Owner decides: keep (all tested, must be explained at the defence) or remove. Not removed here to keep verified work |
| Low | `npm audit`: moderate `minimatch` issue in `nodemon` (dev only) | Noted in README |
| Low | Not checked on Node 22 or on a separate fresh copy | Reviewer |

## 3 Owner only

1. Install Postman, import `part-2/lab-01-node-server/postman_collection.json`, run `npm start` in the work folder.
2. `GET http://localhost:3000/diagrams`: shot with URL, status 200 and body (two diagrams).
3. `GET http://localhost:3000/diagrams/1`: status 200.
4. `POST http://localhost:3000/diagrams`, Body → raw → JSON `{"title":"Login flow","notation":"UML","sourceCode":"user -> server","owner":"carol"}`: 201, `Location` visible under Headers.
5. `POST` with body `{"title":"   ","notation":"XYZ","sourceCode":"x","owner":"o"}`: 400 and `details`.
6. `PUT http://localhost:3000/diagrams/1` with a full body: 200.
7. `PATCH http://localhost:3000/diagrams/1` with body `{"priority":"high"}`: 200.
8. `GET http://localhost:3000/diagrams/99`: 404.
9. `DELETE http://localhost:3000/diagrams/2`: 204, then repeat: 404.
10. Every shot shows method, URL, request body and status. Replace figures 6–8 in `figures/` and rebuild with `node tools/build.js part-2/lab-01-node-server`.
11. Create and push the `lab21` branch with the folder content (name from the condition).
12. If the DB option is chosen: table structure shot (pgAdmin or DBeaver) and a `SELECT` result.

## 4 Owner decisions: both options

### (a) Lab 1 data: array or DB

| | Array (now) | DB |
| --- | --- | --- |
| Matches | the condition ("keep data in an array"), earlier decision | the teacher's 16 Oct rule for even variants |
| Effort | 0 | SQLite via built-in `node:sqlite`, no new dependency: about 0.5–1 day (new store with the same interface, async controller, tests on a temp file, report, README, study doc). PostgreSQL: about 1.5 days plus a DB server |
| Risks | teacher's remark at the defence | report no longer matches the condition ("array"); Lab 2 loses its point as the first DB work; `node:sqlite` is experimental; PostgreSQL complicates the from-scratch run and screenshots |
| Code readiness | none | `createApp(store)` takes the store, routes and validation do not change |

Suggestion without pushing: ask the teacher whether a DB is mandatory in Lab 1, since the condition says "array".

### (b) 500 page from a real failure

Depends on (a). With an array there is no real failure; the only proof is a test with a failing store. With a DB the failure is reproduced by stopping the DB or denying file writes, and the handler already returns a 500 with no internal text (about 0.5 day for the test and report text). An HTML page is not needed in Lab 1 (a JSON API); the 404 and 500 pages belong to Practical 1.

### (c) SQLite or PostgreSQL

Concerns Labs 2 and 3; for Lab 1 only if (a) picks a DB.

### (d) Number of control questions

The condition lists 16, the report answers 9, 10, 11. If the number differs, edit the `{{answers}}` block in both templates (about an hour).

## 5 For the independent reviewer

- `npm test` from a clean install is green and coverage stays at 100 / 98 / 100.
- "Looks required but does not work": figures 6–8 are script-made, not Postman; the 500 in tests comes from a mocked store, not a real failure; rows 12 and 13 remain undecided.
- Run on Node 22 and on a separate fresh copy, README commands.
