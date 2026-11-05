# Notes, practical 1

- Interface rebuilt on Part 1: `public/dslkit.css` (bundled by `bundle-css.mjs`), `public/pz.css` (a few rules), logo, theme switch, new EJS views.
- Added `src/middleware/security.js`: CSRF token, security headers, rate limit, log escaping.
- Fixed: `/item/0x1`, open `/log`, field count limit, headings of 403/413/429 pages.
- Found in a real browser: `Referrer-Policy: no-referrer` made the form fail with 403, now `same-origin`.
- Figures in `figures/` (6 screenshots, Chrome, 1280 px, light theme), added to both report templates (3.7, 3.8), appendix I.
- Tests: 39 pass, coverage 100 percent. Reports built, lint is clean.
- Left: ask the teacher about "data in a table for even variants"; mobile and dark shots were checked, not added to the report.

## Red-team fixes (after the audit in redteam-pz1.md)

- **F1** parallel exports to the same file no longer race on the shared `.part` temporary name: `logFile.js`
  now serializes exports per destination file (one at a time, each waits its turn instead of colliding).
- **F2 (accepted risk, not changed)**: `?auth=1` stays a public constant. The practical's own task is to
  simulate a sign-in with a query flag, not to build a real session; replacing it with a real secret would
  be a different exercise. Anyone who knows the address can read, clear or export the log — this is by
  design for the lab and is not meant to be deployed as it stands.
- **F3** `hideAuth` now masks the decoded parameter name (`/log?%61uth=1` is masked the same as
  `/log?auth=1`), not the raw characters of the address.
- **F4** `data/*.txt` and `data/*.part` added to `.gitignore` next to the existing `data/*.db*` rules.
- **F5** `errorHandlers.js` writes one line with no error object for a 4xx; a 5xx still carries it, since
  that one is worth investigating from the console.
- **F6 (mitigated, not fully fixed — documented limit)**: a file-backed request log now opens with
  `PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL`, which shortens the write on every request (readers
  and the writer no longer take turns, the fsync is lighter). `node:sqlite`'s `DatabaseSync` is synchronous
  by design, though, so the insert still blocks the event loop for as long as the write itself takes; a
  fully asynchronous log (a worker thread, or a different database driver) is a larger change than this
  practical's scope.
- **F7** the `request_log` table trims itself back to 20 000 rows every 500 inserts (`requestLog.js`), the
  in-memory diagram store keeps at most 5 000 records (oldest dropped first, `diagrams.js`), and the export
  now streams the rows one at a time through `log.iterate` instead of `log.recent(100000)`, so even a full
  table is never held in memory as one array.
- **F8** the control-character check that already applied to the title now applies to the description and
  the code too (code keeps its line breaks and tabs, since it is written on more than one line).
- **F9** `/item/000000001` (a leading zero) answers 404; only the canonical digits (no leading zero, except
  "0" itself) resolve to a record.
- **F10** `TRUST_PROXY` (see `.env.example`) turns on Express's `trust proxy`, so `req.secure` — and with it
  the cookie's `Secure` flag and the new `Strict-Transport-Security` header — follow a reverse proxy's
  `X-Forwarded-*` headers instead of only the raw socket, which is never TLS once a proxy terminates it.
- **F11** every page behind `requireAuth` (the log, the add/edit forms) now answers with
  `Cache-Control: no-store`, matching what `/log/download` already had.
- **F12** body-parser's "too many parameters" answers with 400 now, not 413: the actual problem is a
  malformed request, not a body that is too large (a genuinely oversized body still answers 413, that part
  did not change). One existing test asserted the old 413 for this exact case
  (`test/security.test.js`, the "many" fields case in "huge and hostile values give 400 or 413…") and was
  updated to expect 400, since the whole point of the fix is that this status changes.
- **CSRF / cookie fixation**: the double-submit token is now signed with a server secret
  (`CSRF_SECRET`, generated once per process in `security.js`) — the cookie holds a random nonce plus an
  HMAC tag of that nonce, both 48 hex characters together, the same shape as before. A value a visitor can
  only set (not compute, for lack of the secret) — for example through cookie fixation on a sibling
  subdomain — is rejected even if it is replayed as both the cookie and the form field, because its tag
  will not match. Existing tests and views needed no change: the cookie format, length and the `_csrf`
  hidden field stayed the same shape, only "known" now also requires a valid signature.
- Tests: 150 pass (the 134 from before, minus the one updated F12 assertion, plus the new regression tests
  for F1, F3–F12 and the CSRF fix), coverage stays effectively 100 percent (one pre-existing branch in
  `/log`'s own catch block, unrelated to this pass, is still uncovered). Reports rebuilt with
  `node tools/build.js part-2/pz-01-middleware-ejs`, lint is clean.
