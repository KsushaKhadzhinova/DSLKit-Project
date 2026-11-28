# Audit, practical 2 "Designing and implementing a REST API" (variant 26)

Folder `part-2/pz-02-rest-api`, repository branch `pz22`, working branch `wip/t37-pz2`. Russian version: `PZ2-AUDIT.md`. The report (`report*.md`, answers to questions 25–27, layout) belongs to sub-chat T38 and was not changed here.

Statuses: **done** (before the audit), **fixed** (found and fixed in T37), **awaits decision** (owner decides), **owner only** (owner does it).

## 1 Requirements of the assignment

| Requirement | Where met | Evidence | Status |
| --- | --- | --- | --- |
| At least three resources | `users`, `projects`, `diagrams` (`schemas` in `src/app.js`) | `test/api.test.js`, `API.md` | done |
| CRUD: list, one, POST, PUT, PATCH, DELETE | `createResourceRouter` in `src/resource.js` | a test per method, `postman_collection.json` | done |
| Extra operations | `publish`, `duplicate`, `/users/:id/projects`, `/projects/:id/diagrams` | `test/api.test.js`, `API.md` | done |
| Array storage (by the assignment) | `createCollection` in `src/store.js` | `API.md`: data resets on restart | done |
| Validation: required fields, types | `src/validation.js`; the schema in `src/app.js` is the only source of rules and also drives filters, sorting and OpenAPI | `test/negative-misuse.test.js`, `test/redteam-fixes.test.js` | done |
| Codes 200, 201, 204, 400, 401, 404, 500 | all but 401, plus 405, 406, 409, 413, 415, 429. **No 401: the assignment has no authentication** | `API.md`, section Errors | done, 401 deliberately absent |
| Idempotency | PUT and DELETE repeatable, `publish` repeatable and changes nothing, POST creates a new record | `test/api.test.js` | done |
| `API.md` (method, URL, parameters, body, response, errors) | `API.md`, `API.generated.ru.md`, `API.generated.en.md` | `test/gen-api-md.test.js` compares with `/api/openapi.json` | done |
| Swagger/OpenAPI (optional) | `GET /api/openapi.json`, built from the schemas | `src/openapi.js`, test in `api.test.js` | done |
| Postman or similar, at least 5 operations | `postman_collection.json` (19 requests with checks), `requests.http` | section 4 | done (collection), screenshots owner only |
| `npm run dev` | `dev` = `node --watch src/server.js` | from-scratch run | done |

## 2 Teacher's requirements (`docs/notes/06`, `07`)

| Requirement | Where | Evidence | Status |
| --- | --- | --- | --- |
| Whitespace values and lengths | `checkField` in `validation.js`, trimming | `test/negative-misuse.test.js` | done |
| Numbers not below zero, huge numbers | ids and pages 1 to 15 digits, `idMax` | `test/stress.test.js`, `redteam-fixes.test.js` | done |
| Limits in a separate file | `limits.json` + `src/limits.js`. **Page sizes (20, 100) were hard-coded** | `test/t37-fixes.test.js` | fixed |
| Unique creation time per record | `createdAt`. **Before: records created in the same millisecond, the seed data included, got the same time** | `monotonicClock` in `src/store.js`, `t37-fixes.test.js` | fixed |
| Hidden email | not in lists; filter, search and sort do not reveal it | `test/security.test.js`, `API.md` | done |
| One error format | `{ error: { code, message, details? } }`, one handler in `src/app.js` | `test/api.test.js` | done |
| Styled 404 and 500 | for a JSON API these are the JSON `not_found` and `internal_error`; there are no HTML pages (no UI) | `test/api.test.js` (500 from a real exception), `security.test.js` | done |
| 500 by a real failure, not a button | no button; 500 comes from a real exception, the test injects the failure | `test/api.test.js` "unexpected errors become a 500" | done (owner decision 2 confirms the wording for the report) |
| Request log in a DB table (even variant 26) | **not implemented**: the PZ2 assignment requires an array, the project has no DB dependency | section 3 | awaits decision |
| No secrets, `.env.example`, `.gitignore` | `.env.example` (`PORT`, `RATE_LIMIT_MAX`) | inspection | done |
| README: what is done, how to run, branch | `README.md` (RU and short EN) | inspection | fixed (Postman variable names, `limits.json`) |
| ESLint clean | `eslint.config.js` | `npm run lint`, section 5 | see section 5 |
| Tests green, coverage threshold not lowered | `npm test` = `node --test --experimental-test-coverage` | section 5 | see section 5 |
| Answers to questions n−1, n, n+1 (25, 26, 27 of 30) | report, owned by T38 | — | not in this task |

## 3 Owner decisions that touch this work

**Request log in a DB table.** The teacher's rule "even variant: the logging middleware writes requests to a DB table, a failed write shows a 500 page" belongs to practical 1. The PZ2 assignment explicitly asks for an array ("use a temporary in-memory array for storage"). The API has no request log at all (only unexpected errors go to the console).

| Option | What to do | Effort | Risk |
| --- | --- | --- | --- |
| A. Keep as is (recommended) | State in the report and at the defence: PZ2 uses an array by the assignment, the DB log is done in PZ1 | 0 | The teacher may ask about the log |
| B. Request log in a SQLite table (`node:sqlite`, Node 22+) | A middleware writes method, path, status, time to `request_log`; a failed write gives 500; tests for a DB failure | 3–4 hours, one Node-version dependency (`engines` is `>= 20`) | Goes beyond the assignment, resource data stay in the array (a mix to explain); depends on the SQLite vs PostgreSQL decision |
| C. Log in a PostgreSQL table | Same through `pg`, needs a DB server and Docker | 6–8 hours | Harder from-scratch run, DB structure screenshots owner only |

Not implemented until the owner chooses. After B or C, T38 updates the report (storage section, table screenshot).

## 4 Owner only: screenshots

Server: `npm start` in `part-2/pz-02-rest-api`, then import `postman_collection.json` into Postman (variables `root` and `base` are set). Every frame must show method, URL, status and body.

Postman, at least five different operations (eleven recommended). Figures 2 and 9–12 in the report were recorded by a script, not by Postman, and are captioned so; the owner's real shots go next to them under new names in `part-2/pz-02-rest-api/figures/`, T38 inserts them.

| File | Operation in the Postman collection | What must be visible |
| --- | --- | --- |
| `postman-01-list-users.png` | List users, `GET {{base}}/users` | 200, list without `email`, `meta` |
| `postman-02-user-one.png` | One user, `GET {{base}}/users/1` | 200, `email` present |
| `postman-03-user-404.png` | Missing user, `GET {{base}}/users/999` | 404 `not_found` |
| `postman-04-create-user.png` | Create a user, `POST {{base}}/users` | 201, `Location` in the Headers tab |
| `postman-05-invalid-user.png` | Invalid user, `POST {{base}}/users` | 400 and `details` |
| `postman-06-patch.png` | Partial update with PATCH, `PATCH {{base}}/users/1` | 200 |
| `postman-07-put.png` | Replace with PUT, `PUT {{base}}/users/1` | 200 |
| `postman-08-search.png` | Search, sort and page | sorted list, `meta` |
| `postman-09-publish.png` | Publish a diagram, `POST {{base}}/diagrams/1/publish` | 200, `status: published` |
| `postman-10-delete-409.png` | Delete a user who owns projects, `DELETE {{base}}/users/1` | 409 `conflict` |
| `postman-11-delete-204.png` | Delete a diagram, `DELETE {{base}}/diagrams/1` | 204 no body |

Data live in memory: restart the server before shooting (Ctrl+C, `npm start`), otherwise `POST` and `DELETE` give different numbers. One Runner frame with all checks green (`postman-12-runner.png`) strengthens the report.

API documentation: the Swagger UI shots (figures 15 and 16) come from `node shots/swagger-shot.mjs` (needs network for the CDN, `puppeteer-core` and Chrome). The owner may replace them with own Swagger UI shots (import `http://localhost:3000/api/openapi.json`) named `swagger-01-list.png` and `swagger-02-post.png`.

### One shot per request type (teacher's remark)

Minimal set, one frame per API method, names from the table above: GET (`postman-01-list-users.png`), POST (`postman-04-create-user.png`), PUT (`postman-07-put.png`), PATCH (`postman-06-patch.png`), DELETE (`postman-11-delete-204.png`). The other methods of the API: OPTIONS (`postman-13-options.png`, request Allowed methods with OPTIONS, 204 and the `Allow` header), HEAD (`postman-14-head.png`, 200 without a body). Conditional request: `postman-15-stale-412.png` (Stale PATCH with If-Match, 412 `precondition_failed`). To take it, first run One user and check the `ETag` header; the collection holds a deliberately stale tag.

## 5 Checks, commands and results

See the executor's final report (results of `npm test`, `npm run lint`, the from-scratch run).

## 6 What T38 must update in the report

- Default page size 20 and maximum 100 now come from `limits.json` (`defaultPageSize`, `maxPageSize`); the API behaviour did not change.
- `createdAt` is strictly increasing (`monotonicClock`): example responses show different times, even for the seed data. Replace any example with identical `createdAt`.
- Postman: collection variables `root` and `base` (the README used to say `baseUrl`).
- If option B or C of section 3 is chosen: a new section on the DB request log.
