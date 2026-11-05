# Notes, practical 2

- Added `src/security.js`: security headers, rate limit (429), safe log text.
- The error handler keeps 4xx statuses of the framework (400 bad URL, 415 unknown encoding) instead of 500.
- `API.md`, `README.md` fixed, `.env.example` and `.gitignore` added, branch `pz22` named.
- Tests: 30 pass (node:test), coverage 100 percent lines and functions, 99.5 percent branches.
- Found problems and the open ones are in `AUDIT.md`.
- Left: report templates do not yet describe the security additions, Postman screenshots are still to be taken.

## Red-team follow-up (redteam-pz2.md, redteam2-pz2.md)

Fixed, each with a test that failed before and passes after (see `test/redteam-fixes.test.js`, plus one updated
test and a few new ones in `test/api.test.js`, `test/negative-misuse.test.js` and `test/security.test.js`):

- **F3** email uniqueness bypass and a weak pattern: the email is now Unicode-normalized (NFKC), stripped of
  invisible formatting characters and lower-cased before it is checked or stored, and the pattern is stricter
  (ASCII local part and domain, no leading/trailing/doubled dot) without the quadratic backtracking risk
  (**F16**) of the old one.
- **F4 / F6** invisible, control and unpaired-surrogate characters in `name`/`title` (and other single-line
  fields) are now rejected; `description` and `code` stay multiline and still allow a newline; an emoji built
  from a zero-width joiner is still accepted.
- **F5** `/diagrams/:id/duplicate` now cuts the copied title by code point, never in the middle of a surrogate
  pair.
- **F7** `PUT` without an optional field (`role`, `status`, ...) now keeps the record's current value for it
  instead of silently resetting it to the schema default; sending the field explicitly still changes it. This
  is a narrower fix than full optimistic-concurrency control (`If-Match`/ETag) for lost updates between two
  concurrent `PUT`s, which this practical does not implement.
- **F8** rate limiter: an IPv4-mapped IPv6 address (`::ffff:a.b.c.d`) now shares its bucket with the plain
  IPv4 address; cleanup is amortized (a bounded batch per request) instead of an occasional full-map scan; the
  map is capped (`rateMaxClients` in `limits.json`), evicting the oldest tracked client once full. Grouping a
  whole IPv6 /64 into one bucket was not done, to avoid punishing unrelated users behind the same prefix.
- **F9** each collection (`users`, `projects`, `diagrams`) now refuses to grow past `maxRecordsPerCollection`
  (`limits.json`, 5000) with 409 `quota_exceeded`, covering both direct creation and `/duplicate`.
- **F10** added 406 for an `Accept` that cannot match `application/json`; `GET`/`HEAD`/`DELETE` no longer 415
  over an unrelated body/Content-Type; a declared `charset` other than `utf-8` is 415 instead of a confusing
  400 `invalid_json`. The remaining inconsistency (a raw `Content-Encoding: br`/broken-gzip error sometimes
  reaching the client as Node's own plain-text 400 instead of the JSON error shape) happens in Node's HTTP
  parser before Express ever sees the request, and is left as a lower-level limitation.
- **F11** an unknown query key, or a filter value that does not fit its field (`?role=admin`, `?ownerId=abc`),
  now answers 400 `invalid_query` instead of being silently ignored or returning an empty list; a repeated key
  is 400 too. Filtering by the hidden `email` field is unchanged (still a silent no-op, by design, so it stays
  unusable as an oracle).
- **F12** the `page`/`id` error message now states the real ceiling (999999999999999, 15 digits) instead of
  `Number.MAX_SAFE_INTEGER`, which was never actually reachable.
- **F13** `sort` now compares strings with `localeCompare` and breaks ties by `id`, so an equal key keeps a
  fixed, repeatable order.
- **F14** `GET /api/openapi.json` now matches the real behavior: the list response schema drops the hidden
  `email` field (and does not require it), 409 is only declared where the code can really answer it, 406/429
  and an unexpected-error `default` are on every operation, `POST /openapi.json` is 405 (not 404), and the
  `id`/`page` parameters declare the real 15-digit maximum.
- **F17** `shots/lib.mjs` no longer hard-codes one machine's absolute worktree path as its `puppeteer-core`
  fallback; it tries `PUPPETEER_DIR` and then a few ancestor directories' `node_modules`.
- **redteam2-pz2.md, finding #2 (slowloris)**: `src/server.js` now sets `headersTimeout` (10 s) and
  `requestTimeout` (30 s) explicitly, below Node's own defaults (60 s / 5 min), so a client that trickles a
  body in slowly cannot hold a socket open for minutes.

## Not fixed, by design (documented in `API.md`, "Known limitations")

- **F1** no authentication or authorization at all. Out of scope for this practical; every field (including
  `role` and `ownerId`) is writable by anyone, and there is no ownership check on any mutation.
- **F2** the hidden `email` can still be read via `GET /api/users/:id` and confirmed one address at a time via
  the 409 on `POST /api/users`. Both need real authentication/authorization to close properly, which this
  practical does not implement; a generic 409 message only hides the wording, not the fact that a match was
  found.

## Deliberately out of scope for F7/F8

- Optimistic concurrency control (`If-Match`/ETag validated on write) for the lost-update half of F7.
- Grouping a whole IPv6 /64 prefix into one rate-limit bucket (only the IPv4-mapped-IPv6 case is unified).
