# Audit, practical 2 (REST API)

| Problem | Risk | Done |
| --- | --- | --- |
| A broken percent escape in the URL (`/api/users/%E0%A4%A`) answered 500 and was logged as a server failure | Wrong code, noisy log, any client can trigger it | Fixed: 400 `bad_request`, test in `test/security.test.js` |
| An unknown `Content-Encoding` answered 500 | Wrong code (must be 415) | Fixed: 415 `unsupported_media_type`, tested |
| No security headers, `X-Powered-By: Express` was sent | Framework disclosure, content sniffing, framing | Fixed: `src/security.js`, headers on every answer, tested |
| No rate limit | One client can flood the in-memory API | Fixed: 300 requests per minute per address (`RATE_LIMIT_MAX`), 429 with `Retry-After`, tested |
| The log line wrote the raw request URL | Line breaks could forge log lines | Fixed: method and URL are written as quoted JSON strings and cut, tested |
| `API.md` listed no 409 for POST, PUT and PATCH of users and no 405, 415, 429 | Docs differ from the code | Fixed in `API.md` |
| README had no branch name, no `.env.example`, no `.gitignore` | Teacher checklist | Fixed: `pz22`, `.env.example`, `.gitignore` added |
| No CORS headers | Browser pages of other origins cannot call the API | Not changed: the task has no browser client, noted in `API.md` |
| String fields are trimmed, so the leading indent of `code` is lost | Small data change | Not changed: trimming is documented behaviour and covered by tests |
| Rate limit uses the socket address, behind a proxy all clients look the same | Wrong limit behind a proxy | Not changed: no proxy in this practical, needs `trust proxy` when deployed |
| No authentication | Anyone can change data | Not changed: the task says none |
