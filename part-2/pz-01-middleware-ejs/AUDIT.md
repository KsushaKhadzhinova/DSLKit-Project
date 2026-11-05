# Audit, practical 1 (EJS application)

| Problem | Risk | Done |
| --- | --- | --- |
| The form had no CSRF protection | A foreign site could post diagrams for a signed-in owner | Fixed: double-submit token cookie plus hidden field plus `Origin` check, tested |
| No security headers, `X-Powered-By` sent | Framework disclosure, framing, content sniffing | Fixed: CSP without inline code, nosniff, DENY framing, Referrer-Policy, tested |
| Referrer-Policy `no-referrer` made browsers send `Origin: null`, so the site's own form was refused with 403 | Broken form in a real browser | Fixed: `same-origin`, found in a real browser run |
| No rate limit | Flood fills the log table and memory | Fixed: general and stricter POST limits in `limits.json`, styled 429 page, tested |
| The request URL went raw into the log table and console | Forged log lines, huge rows | Fixed: control characters escaped, length cut (`logUrlMax`), tested |
| `/item/0x1` and `/item/1e0` opened item 1 (`Number()` parsing) | Wrong page for a bad address | Fixed: digits only, tested |
| `/log` was open to guests and shows other requests' URLs | Information leak | Fixed: needs `?auth=1`, tested |
| Body size was limited but the number of fields was not | Memory use | Fixed: `parameterLimit` in `limits.json`, 413 page, tested |
| 403, 413 and 429 showed the heading "Bad request" | Misleading page | Fixed: own headings per status |
| README was out of date (said the log is in memory), no branch name, no way to load `.env` | Teacher checklist | Fixed: README rewritten, branch `pz21`, `.env.example` explained |
| Old stylesheet differed from Part 1 | Two looks in one project | Fixed: Part 1 styles bundled in `public/dslkit.css`, shared header, footer, theme switch |
| Task text says "no database", teacher text says even variants keep the first work's data in a table | Conflict of requirements | Not changed: only the request log is in SQLite, diagrams stay in an array. Ask the teacher |
| `request_log` grows without limit | Disk use over time | Not changed: demo scale, a cleanup job would be the next step |
| Rate limit uses the socket address | Behind a proxy all clients look the same | Not changed: no proxy here, `trust proxy` is needed when deployed |
| `limits.json` is not checked for missing keys | A broken file stops the server at start | Not changed: failing early with a stack trace is acceptable |
| Authorization is `?auth=1` | Anyone can sign in | Not changed: simulation is the task |
