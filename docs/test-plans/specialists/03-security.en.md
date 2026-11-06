# DSLKit security test plan and checklist (application security specialist)

Date: 2026-11-06. Branch `testing-course-full` (Part 1) and the Part 2 working copies in `.claude/worktrees/`. Russian version: `03-security.md`. Basis: OWASP ASVS 4.0, OWASP Top 10:2021 and OWASP WSTG (the content is paraphrased, chapter numbers are given as references).

## 1. Role and scope

The application security specialist checks that DSLKit does not run foreign code in the browser, does not expose user data, does not accept harmful input and does not fall over under a heavy request. The specialist does not fix code. The specialist prepares the checks, runs them on the own application and records the result so that the owner can decide.

- Part 1: the site `site/`, accounts and projects in `localStorage`, `site/sw.js`, file import, SVG cleaning, the HTTP API `tools/render-api.js`, the servers `tools/server.js` and `tools/serve.js`, the code generation endpoint `tools/ai-api.js`, the external Kroki service.
- Part 2: Express and JWT (`lab-03-auth`), React (`lab-04`, `lab-05`), MongoDB (`lab-06-mongodb`), Socket.IO (`lab-07-websocket`), Docker with PostgreSQL (`lab-08-docker`), practicals `pz-01` to `pz-04`. Branches: `lab21`, `lab12`, `23` to `28`, `pz21` to `pz24`, `course-app`.
- Cross-cutting: npm dependencies, secrets, containers, privacy of data in the browser.

## 2. What is checked (priorities)

| Priority | Meaning                                                                                        | Examples                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| P0       | Foreign code runs, a secret leaks, login or roles are bypassed on a server. Blocks the release | XSS through a title, DSL, import or SVG. A secret in the repository. SQL and NoSQL injection. A database port exposed     |
| P1       | A protection is bypassed or service is denied without special conditions                       | CSP and headers, login lockout, CSRF, CORS, Origin in sockets, IDOR, a hang from one request (F-03, B-02), Docker as root |
| P2       | A protection is weakened or data is lost                                                       | PBKDF2 (F-04), tab races (F-05), worker cache (F-06), `unsafe-inline` (F-09), body limits                                 |
| P3       | Hygiene and wording                                                                            | HSTS, version disclosure, logs without a retention period, description of limits                                          |

## 3. Plan

### 3.1 Goals

1. Confirm that the protections from `61-security-code-review.md` and `02-SECURITY-AUDIT.md` still work after the latest changes (the code has changed: the worker is `dslkit-v5`, the API has `MAX_LINES`, the body size is computed differently, `tools/ai-api.js` has appeared).
2. Cover the areas that earlier reports did not: headers in the browser, the worker and its cache, roles in the client, the generation endpoint, Docker on a running stand, WebSocket.
3. Make sure that every known finding (F-01 to F-13, B-01 to B-18, the audit rows LR1 to PZ4) is fixed or honestly recorded as a limit.
4. Fix the trust boundary: what is protection and what is convenience (risk R-05: accounts in the browser do not replace server authentication).

### 3.2 In scope and out of scope

- In scope: everything in section 1 on localhost, code reading, repository tests, scenarios in Chromium, `curl` requests.
- Out of scope: other hosts and `kroki.io` itself (a forged answer is simulated with a local stub), load testing beyond one heavy request, social engineering, the university network, real server authentication in Part 1 (there is none by design), fixing what is found.

### 3.3 Approach

- Static review by OWASP category: search for `innerHTML`, `eval`, dynamic queries, secret reads.
- Dynamic checks: `npm test`, `testing-course/full/*`, manual scenarios, `curl`.
- A set of dirty data: markup, quotes, control characters, U+2028, very long strings, `__proto__`, operators such as `{"$ne":null}`, SQL quotes.
- Result of an item: passed, failed, not applicable, not checked. A reason is required for everything except passed.

### 3.4 Environment

- Windows 11, Node.js 20 or newer, Chromium through Playwright, `curl`, Docker Desktop.
- Part 1: `npm start` on `http://localhost:5173`, for comparison the build `npm run build` and `npm run start:prod`.
- Part 2: each work in its own working copy, databases only local, `.env` with test values created on this machine. Do not set a key of an outside service: the generation endpoint must answer with a clear refusal.
- Accounts: user, developer, admin and a second ordinary user (for IDOR). All fictional.

### 3.5 Entry and exit criteria

- Entry: the application starts, `npm ci` is done, the commit hash is recorded, the red tests are known (B-16), a clean browser profile is taken.
- Exit: all P0 and P1 items are done with a link to an artifact. No open P0. Open P1 and P2 items are in the risk register with the owner's decision. `npm audit --omit=dev` shows no high or critical findings in all checked packages. The RU and EN reports are updated together.

### 3.6 Ethics

- Only the own application on localhost or in a local container. Other sites, shared servers and accounts of other people are not tested.
- Secrets are not printed to the console, the chat or reports, only the fact and the path are recorded. Secret search lists file names only.
- Docker commands that remove volumes or images (`down -v`, `prune`) run only after the owner's explicit decision.
- Denial of service check: one request, a timeout, a server restart, a separate port and not while others work on the same machine (in the previous run it disturbed others, see F-03).
- A vulnerability is reported to the owner as `SECURITY.md` describes, details are not published before the fix.
- Risks of the testing itself:
  - A hung server: `curl -m 10`, a separate port, restart the process.
  - A stale worker cache gives false results: before the run unregister the worker and clear Cache Storage.
  - Old line numbers in reports: compare with the current code.
  - Windows specifics (path case, `::$DATA`, B-18): record the platform.

### 3.7 Mapping to what is already found

The findings are not duplicated, the checklist asks to recheck the state.

| ID                                 | Topic                                                                               | Items                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| F-01, B-01, B-03                   | Slow parsing, exception on U+2028                                                   | FILE-03, FILE-04, API-02                                            |
| F-02, R-05, B-07, B-12             | Client-only login, logout in another tab, not all pages guarded                     | AUTH-01, AUTH-02, PRIV-01, LIM-01                                   |
| F-03, B-02, F-07                   | Synchronous API, body limit                                                         | API-01, API-02, API-03                                              |
| F-04, B-15                         | PBKDF2, no lockout, a button that hangs                                             | AUTH-04, AUTH-05, BRUTE-05                                          |
| F-05, B-04, B-05, B-06, B-08       | Races, limit of 200, silent write failure                                           | PRIV-03 to PRIV-05                                                  |
| F-06                               | Worker and API cache                                                                | SW-01 to SW-05                                                      |
| F-08, F-09, F-10, F-11, F-12, F-13 | SVG links, `unsafe-inline`, interfaces, Kroki, quota, dev dependencies              | XSS-06, HDR-02, HDR-07, PRIV-06, LIM-01, DEP-02                     |
| B-10, B-18                         | File read before the size check, `::$DATA` paths                                    | FILE-02, HDR-08                                                     |
| Audit 02: LR3, LR5, LR7, LR8       | Lockout by e-mail, JWT in `localStorage`, default secret, nginx and `sequelize-cli` | BRUTE-02, AUTH-11, AUTH-12, KEY-05, WS-05, DOCK-05, DEP-04, CORS-02 |
| Audit 02: PZ1, PZ2                 | `auth=1` in the log, e-mail in a list, role change                                  | AUTHZ-04, AUTHZ-05, PRIV-08                                         |

## 4. Checklist

Line: `ID (priority) what to check. Where: file or category. OWASP: reference.` The result and the artifact go into the run report, not into this file.

### 4.1 XSS: project titles, DSL, import, SVG

- [ ] XSS-01 (P0) A project title with `<img onerror>` and `<script>` does not run on the dashboard, in the file list, in the tab title or in the exported file name. Where: `site/js/components/dashboard.js`, `editor-projects.js`. OWASP: A03, WSTG-INPV-02, ASVS V5.
- [ ] XSS-02 (P0) Labels, titles and block identifiers in DSL with special characters are escaped in all notations, `data-id` allows no attribute injection. Where: `site/js/notations/common.js` (`escapeXml`). OWASP: A03, WSTG-CLNT-01, ASVS V5.3.
- [ ] XSS-03 (P0) Import of Mermaid, PlantUML and DOT with harmful captions goes through drawing and saving without running a script. Where: `site/js/utils/import-diagram.js`. OWASP: A03, WSTG-CLNT-01.
- [ ] XSS-04 (P0) Engine SVG with `script`, `onload`, `javascript:` (case, a tab inside the scheme), `foreignObject`, `use`, `image`, DOCTYPE entities and `url()` in `style` is cleaned. Where: `site/js/utils/dataParser.js` (`sanitizeSvg`). OWASP: A03, ASVS V5.3.
- [ ] XSS-05 (P0) An `/api/external/*` answer with `<script`, `on...=` or `javascript:` is rejected with code 502. Where: `tools/render-api.js` (`UNSAFE_SVG`). OWASP: A03, ASVS V13.
- [ ] XSS-06 (P2) An outside link `<a href="https://...">` around the whole canvas and heavy filters: repeat F-08 and record the decision. Where: `dataParser.js` (`SAFE_LINK`). OWASP: A04, ASVS V5.
- [ ] XSS-07 (P1) Name and e-mail in forms, search, toasts, the problems panel, the documentation and the expert panel show user text through `textContent`. Where: `validation.js`, `app-search.js`, `toast.js`, `problems-panel.js`, `docs.js`. OWASP: A03, WSTG-INPV-02.
- [ ] XSS-08 (P1) `git grep -nE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function" -- site/js` finds only uses with constants. Where: `site/js`. OWASP: A03, ASVS V5.3.
- [ ] XSS-09 (P1) Address parameters and the hash do not reach the page without encoding and do not create an open redirect. Where: `editor-projects.js`, `welcome.js`, `auth-gate.js`. OWASP: A03, A01, WSTG-CLNT-04.
- [ ] XSS-10 (P1) Planted `localStorage` content (markup in a title, `settings`, `diagram_cache`) does not lead to code execution. Where: `site/js/utils/storage.js`, `site/js/storage/*.js`. OWASP: A03, A08, WSTG-CLNT-12.
- [ ] XSS-11 (P1) Part 2 React has no `dangerouslySetInnerHTML`, EJS in `pz-01` uses only escaping output, the `lab-07` chat uses `textContent`. Where: `lab-04`, `lab-05`, `pz-04`, `pz-01/views`, `lab-07/public`. OWASP: A03, WSTG-CLNT-10.

### 4.2 CSP and headers

- [ ] HDR-01 (P0) CSP on every response type (HTML, JS, JSON, error pages) contains `script-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`. Where: `tools/server.js` (`SECURITY_HEADERS`). OWASP: A05, WSTG-CONF-12, ASVS V14.4.
- [ ] HDR-02 (P2) `style-src 'unsafe-inline'` is kept because of SVG: it is recorded as an accepted limit or as a plan to drop it (F-09). Where: `tools/server.js`. OWASP: A05.
- [ ] HDR-03 (P1) A walk over all pages shows no CSP violations in the console, and an inline script planted through the console is blocked. Where: all pages of `site/`. OWASP: A05, WSTG-CONF-12.
- [ ] HDR-04 (P1) `connect-src` allows only the own server and `https://kroki.io`, a request to any other host is blocked. Where: `tools/server.js`. OWASP: A05, A10.
- [ ] HDR-05 (P1) `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP and a correct `Content-Type` are present on static files, the API and 4xx and 5xx answers. Where: `server.js`, `render-api.js`. OWASP: A05, WSTG-CONF-06, ASVS V14.4.
- [ ] HDR-06 (P1) The page cannot be put into a frame of a foreign port (checked with a test page). Where: `frame-ancestors`. OWASP: A05, WSTG-CLNT-09.
- [ ] HDR-07 (P3) The production host over HTTPS sends HSTS, the development server listens only on `127.0.0.1` (now all interfaces, F-10). Where: `tools/serve.js`, hosting settings. OWASP: A05, WSTG-CONF-07.
- [ ] HDR-08 (P2) Paths `..%2f`, `%2e%2e`, `..%5c`, `%00`, `/js/../../package.json`, `index.html::$DATA`, another letter case and a long address do not serve files outside `site/` (B-18). Where: `tools/server.js` (`serve`). OWASP: A05, WSTG-ATHZ-01.
- [ ] HDR-09 (P2) Methods other than GET and HEAD give 405 with `Allow`, a malformed header gives the 400 or 431 page without a stack. Where: `tools/server.js` (`clientError`). OWASP: A05, WSTG-CONF-06, ASVS V7.
- [ ] HDR-10 (P2) Part 2: security headers in the API and in nginx (CSP, `server_tokens off`), `X-Powered-By` is off. Where: `lab-03-auth/src/app.js`, `lab-08-docker/frontend/nginx.conf`. OWASP: A05, WSTG-CONF-06.

### 4.3 Secret storage

- [ ] KEY-01 (P0) The working tree and the history hold no keys or passwords, the search lists file names only, each hit is checked to be a test value. Where: the repository and the Part 2 branches. OWASP: A02, A05, ASVS V2.10.
- [ ] KEY-02 (P0) `.env` is not tracked by git, is listed in `.gitignore` and `.dockerignore`, and a value-free `.env.example` exists. Where: the root and each work. OWASP: A05, ASVS V14.1.
- [ ] KEY-03 (P0) The key of the generation service is read only from the server environment and does not reach an answer, a log, an exception or a page. Where: `tools/ai-api.js`. OWASP: A02, ASVS V8.
- [ ] KEY-04 (P1) The client code and `dist` contain no server keys or environment variables. Where: `site/js`, `dist`. OWASP: A02, WSTG-CONF-04.
- [ ] KEY-05 (P0) A Part 2 server does not start without a `JWT_SECRET` of enough length and variety, and no default secret exists in code. Where: `lab-03-auth/src/settings.js`, `lab-07-websocket/src/token.js`. OWASP: A02, A07, ASVS V6.4.
- [ ] KEY-06 (P1) Passwords and keys are not visible in `docker history`, `docker inspect`, build `ARG` values and container logs. Where: `lab-08-docker/backend/Dockerfile`, `docker-compose.yml`. OWASP: A05, ASVS V14.
- [ ] KEY-07 (P1) The hashes of the developer and admin role codes in a client file are described as a limit and not as protection, and the codes themselves are written nowhere. Where: `site/js/config/roles.js`. OWASP: A04, A02, R-05.
- [ ] KEY-08 (P2) Server and test logs hold no passwords, tokens, connection strings or login request bodies, and the seed administrator password comes from the environment. Where: `request-log.js`, `lab-03-auth/seeders`. OWASP: A09, ASVS V7.1.

### 4.4 Authentication and sessions

- [ ] AUTH-01 (P1) Part 1: the dashboard without a session leads to login, and a planted session with a copy of the account opens it. Record it as the limit R-05, not as a defect (F-02). Where: `site/js/components/auth-gate.js`. OWASP: A07, WSTG-ATHN-04, ASVS V3.
- [ ] AUTH-02 (P2) After logout in another tab the protected page and saving in the editor recheck the session, and the guard rule for `app/*` is uniform (B-07, B-12). Where: `auth-gate.js`, `editor-projects.js`, `site/app/*.html`. OWASP: A07, WSTG-SESS-06.
- [ ] AUTH-03 (P2) An account record holds the salt, the hash and the iteration count, and the password never appears in plain text. Where: `site/js/storage/accounts.js`. OWASP: A02, A07, ASVS V2.4.
- [ ] AUTH-04 (P2) The PBKDF2 iteration count (now 100,000, the OWASP recommendation is higher) is recorded as a decision, and old records are checked with their own count (F-04). Where: `accounts.js` (`ITERATIONS`). OWASP: A02, ASVS V2.4.
- [ ] AUTH-05 (P2) A `crypto.subtle` failure does not leave the submit button disabled and shows an error (B-15). Where: `site/js/components/auth.js`. OWASP: A07, ASVS V7.
- [ ] AUTH-06 (P2) The answer and the time for a wrong e-mail and for a wrong password are comparable (dummy salt, comparison without early exit). Where: `accounts.js` (`DUMMY_SALT`, `same`). OWASP: A07, WSTG-IDNT-04, ASVS V2.2.
- [ ] AUTH-07 (P2) The password policy (8 to 128 characters, weak passwords are not checked) is recorded, and an e-mail in another case or with spaces does not create a duplicate. Where: `validation.js`, `accounts.js` (`normalizeEmail`). OWASP: A07, WSTG-ATHN-07, WSTG-IDNT-02.
- [ ] AUTH-08 (P1) Part 2: tokens with `alg: none`, a foreign secret, an expired time, another issuer and a truncated signature are rejected with 401, the algorithm and the issuer are pinned. Where: `lab-03-auth/src/middleware/auth.js`. OWASP: A07, WSTG-SESS-10, ASVS V3.5.
- [ ] AUTH-09 (P1) The token lifetime is at most 24 hours, and the role is read from the database on every request. Where: `lab-03-auth/src/settings.js`, `auth.js`. OWASP: A01, A07, ASVS V3.
- [ ] AUTH-10 (P1) The password is stored as bcrypt, its length is limited to 72 bytes, and the hash does not reach API answers. Where: `lab-03-auth/limits.json`, `users.controller.js`. OWASP: A02, ASVS V2.4.
- [ ] AUTH-11 (P2) There is no token revocation or server logout, and registration reveals a taken e-mail with code 409 (LR3): the state is confirmed and the decision recorded. Where: `lab-03-auth/src/controllers/auth.controller.js`. OWASP: A07, WSTG-SESS-06, WSTG-IDNT-04.
- [ ] AUTH-12 (P2) The client token sits in `localStorage` (LR5) or in page memory (LR7): the choice is recorded and the risk under XSS assessed. Where: `lab-05-react-api/src/api.js`, `lab-07-websocket/public`. OWASP: A07, WSTG-CLNT-12.

### 4.5 Authorization, IDOR, roles

- [ ] AUTHZ-01 (P0) User A cannot read, change or delete the diagram of user B by identifier (GET, PUT, PATCH, DELETE). Where: `lab-03-auth/src/controllers/diagrams.controller.js`. OWASP: A01, WSTG-ATHZ-04, ASVS V4.2.
- [ ] AUTHZ-02 (P0) Only the owner or an administrator can change a foreign record, and a role in the request body is ignored. Where: `diagrams.controller.js`, `users.controller.js`. OWASP: A01, WSTG-ATHZ-03.
- [ ] AUTHZ-03 (P0) The fields `role`, `id`, `ownerId`, `passwordHash` in registration and update bodies are not accepted (mass assignment). Where: `src/middleware/validate.js`, `validate-auth.js`. OWASP: A01, A04, ASVS V5.1.
- [ ] AUTHZ-04 (P1) `pz-02`: changing the `owner` role without rights and e-mails in the public list (audit 02): the state is confirmed. Where: `pz-02-rest-api/src/app.js`, `resource.js`. OWASP: A01, WSTG-ATHZ-02.
- [ ] AUTHZ-05 (P2) `pz-01`: the `?auth=1` flag is a simulation by design and is not written to the request log. Where: `pz-01-middleware-ejs/src/middleware/fakeAuth.js`, `requestLogger.js`. OWASP: A01, A09.
- [ ] AUTHZ-06 (P1) Part 1: a forged role in `localStorage` affects only the limit of new diagrams and documentation editing, not other people's data. Where: `accounts.js`, `site/js/config/roles.js`. OWASP: A01, A04, R-05.
- [ ] AUTHZ-07 (P1) Part 1: projects of one account are not visible under another account or a guest in the same profile, and the key `projects.<id>` is tied to the owner. Where: `site/js/storage/projects.js`. OWASP: A01, WSTG-ATHZ-04.
- [ ] AUTHZ-08 (P1) Administrator routes and the user list are closed on the server (401 for anonymous, 403 for an ordinary role), including those hidden in the client. Where: `lab-03-auth/src/routes/users.routes.js`, `RoleRoute.jsx`. OWASP: A01, WSTG-ATHZ-02, ASVS V4.1.

### 4.6 Brute force

- [ ] BRUTE-01 (P1) Part 2: after 5 failed logins login is locked for 15 minutes even with the right password, and the 429 answer carries the wait time. Where: `lab-03-auth/limits.json`, `middleware/rate-limit.js`. OWASP: A07, WSTG-ATHN-03, ASVS V2.2.1.
- [ ] BRUTE-02 (P1) Lockout by the pair of address and e-mail does not let someone lock a foreign e-mail from another address, and the counter for an unknown e-mail works the same way (LR3). Where: `rate-limit.js` (`createLoginGuard`). OWASP: A07, A04.
- [ ] BRUTE-03 (P1) The rate limit on `/auth/login` and `/auth/register` fires before the data is validated. Where: `src/routes/auth.routes.js`. OWASP: A07, ASVS V11.
- [ ] BRUTE-04 (P2) Counters live in process memory: the reset after a restart is recorded as a limit, the table is bounded in size, and `X-Forwarded-For` does not bypass the counter without a trusted proxy. Where: `rate-limit.js`, `src/app.js`. OWASP: A04, A05.
- [ ] BRUTE-05 (P2) Part 1: there is no attempt limit (F-04), the limit is described, and guessing is slowed by the PBKDF2 cost. Where: `accounts.js`. OWASP: A07, WSTG-ATHN-03, R-05.
- [ ] BRUTE-06 (P2) The limit of the generation endpoint (6 per minute per address, a daily cap) gives 429 and is not bypassed with headers. Where: `tools/ai-api.js`. OWASP: A04, ASVS V11.

### 4.7 CSRF

- [ ] CSRF-01 (P1) `pz-01`: a POST without a token and with a foreign token is rejected, and the `SameSite=Strict` cookie token matches the form field. Where: `pz-01-middleware-ejs/src/middleware/security.js` (`csrf`). OWASP: A01, WSTG-SESS-05, ASVS V4.2.2.
- [ ] CSRF-02 (P1) A request with a foreign `Origin` is rejected even with a correct token. Where: `security.js`. OWASP: A01, WSTG-SESS-05.
- [ ] CSRF-03 (P1) The JWT API does not accept a token from a cookie, JSON routes do not accept `application/x-www-form-urlencoded`, state changes are not available through GET, and `POST /api/*` of Part 1 changes nothing on the server. Where: `lab-03-auth/src/middleware/http.js`, `routes/*.js`, `tools/render-api.js`. OWASP: A01, WSTG-SESS-05, ASVS V4.

### 4.8 CORS

- [ ] CORS-01 (P1) For a foreign `Origin`, `null` and a look-alike subdomain there is no `Access-Control-Allow-Origin`. Where: `lab-03-auth/src/middleware/cors.js`. OWASP: A05, WSTG-CLNT-07, ASVS V14.5.
- [ ] CORS-02 (P1) There is no combination of `*` and `Allow-Credentials: true`, `Origin` is not reflected without a list, `OPTIONS` allows only the needed methods and headers, and `CORS_ORIGIN` in compose is read by code or removed. Where: `cors.js`, `src/app.js` (`corsOrigin`), `lab-08-docker/docker-compose.yml`. OWASP: A05, WSTG-CLNT-07.
- [ ] CORS-03 (P2) Part 1: the API answers only its own origin (no CORS headers), and a page from another port cannot read `/api/render`. Where: `tools/render-api.js`. OWASP: A05, WSTG-CLNT-07.

### 4.9 Injection

- [ ] INJ-01 (P0) PostgreSQL: a quote, `' OR 1=1 --`, Unicode quotes in e-mail, title and list parameters do not change the query, and all access goes through Sequelize with parameters. Where: `lab-03-auth/src/models`, `controllers`. OWASP: A03, WSTG-INPV-05, ASVS V5.3.4.
- [ ] INJ-02 (P0) `git grep -nE "sequelize\.query|literal\(|\.raw"` in Part 2 finds only queries with `replacements`. Where: `part-2/lab-0*/src`. OWASP: A03, ASVS V5.3.4.
- [ ] INJ-03 (P0) The fields `sort`, `order`, `fields` are accepted only from an allow list. Where: `lab-03-auth/src/middleware/list-query.js`. OWASP: A03, WSTG-INPV-05.
- [ ] INJ-04 (P0) MongoDB: `{"$ne":null}`, `{"$gt":""}`, `$where`, `$regex` in the body and the query do not become an operator (`sanitizeFilter`, `strictQuery`). Where: `lab-06-mongodb/src/middleware`, `controllers`. OWASP: A03, WSTG-INPV-05, ASVS V5.3.
- [ ] INJ-05 (P0) A document identifier is checked as a strict ObjectId, otherwise 400. Where: `lab-06-mongodb/src`. OWASP: A03, ASVS V5.1.
- [ ] INJ-06 (P1) `__proto__`, `constructor`, `prototype` in JSON do not change objects (PZ2 is protected, check the other works). Where: `pz-02-rest-api/src`, `lab-0*/src/middleware/validate.js`. OWASP: A08, A03, ASVS V5.1.
- [ ] INJ-07 (P1) The server builds no commands from input (`git grep -nE "child_process|exec\(|spawn\("` over `tools` and `part-2`), and EJS has no `<%-` with user data. Where: `tools`, `pz-01/views`. OWASP: A03, WSTG-INPV-12, WSTG-INPV-18.
- [ ] INJ-08 (P2) The request log cannot be forged by line (a newline in a parameter), and a database error gives 500 without the query text, table names or a stack. Where: `request-log.js`, `requestLogger.js`, `src/middleware/error-handler.js`. OWASP: A09, A05, ASVS V7.4.

### 4.10 File upload and import

- [ ] FILE-01 (P1) Import accepts only expected extensions and text, binary files and files disguised by extension do not break the page, and Part 2 uploads (if any) sit outside the served root. Where: `site/js/components/import-menu.js`, `part-2`. OWASP: A04, WSTG-BUSL-08, ASVS V12.
- [ ] FILE-02 (P1) The size is checked with `file.size` before reading, and pasting from the clipboard obeys the same limit (B-10). Where: `import-menu.js`, `import-diagram.js` (`MAX_TEXT`). OWASP: A04, WSTG-BUSL-09, ASVS V12.1.
- [ ] FILE-03 (P1) A file of one long line, with a BOM, a mix of `\r\n` and U+2028 is parsed without a hang or an unhandled exception (B-03). Where: `import-menu.js`, `site/js/components/code-lines.js`. OWASP: A04, WSTG-INPV.
- [ ] FILE-04 (P1) A whitespace string and a repeated string of 40,000 characters are parsed within the 200 ms threshold (F-01). Where: `site/js/utils/import-diagram.js`. OWASP: A04, ASVS V5 (ReDoS as denial of service).
- [ ] FILE-05 (P2) Export: the file name made from a title survives special characters and length (B-11), and SVG and PNG hold no outside links. Where: `export-menu.js`, `site/js/utils/exporters.js`. OWASP: A03, A08.
- [ ] FILE-06 (P2) A picture for generation is checked by its first bytes and type, and an oversize picture gives 413. Where: `tools/ai-api.js` (`SIGNATURES`). OWASP: A04, ASVS V12.2.

### 4.11 Dependencies

- [ ] DEP-01 (P0) `npm audit --omit=dev --audit-level=high` finds nothing in the root and in each Part 2 work. Where: `package-lock.json`. OWASP: A06, ASVS V14.2.
- [ ] DEP-02 (P2) Full `npm audit`: the dev chain (F-13, `undici`, `fast-uri`) is reviewed and the decision recorded. Where: root. OWASP: A06.
- [ ] DEP-03 (P1) Every work has a lock file (LR8 had none), and installation uses `npm ci`. Where: `package-lock.json`, `Dockerfile`. OWASP: A08, A06.
- [ ] DEP-04 (P2) What is needed at container start (`sequelize-cli`) is in `dependencies` and not pulled with `npx`, and versions and image tags (`postgres:16-alpine`) are not `latest`. Where: `lab-08-docker/backend/Dockerfile`, `package.json`, `docker-compose.yml`. OWASP: A08, A06.
- [ ] DEP-05 (P2) Scripts and fonts are not loaded from foreign hosts and no CDN is used. Where: `site/*.html`. OWASP: A08, ASVS V14.2.3.

### 4.12 Docker and containers

- [ ] DOCK-01 (P1) The backend does not run as root: `docker compose exec backend id`. Where: `lab-08-docker/backend/Dockerfile` (`USER node`). OWASP: A05, ASVS V14.
- [ ] DOCK-02 (P1) The file system is read-only, `cap_drop: [ALL]` and `no-new-privileges` are set, and memory and process limits are set. Where: `docker-compose.yml`. OWASP: A05.
- [ ] DOCK-03 (P0) The database port is not published to the host, and the database is only in the closed `internal` network: `docker compose port db 5432` is empty. Where: `docker-compose.yml`. OWASP: A05, WSTG-CONF-02.
- [ ] DOCK-04 (P1) Mandatory passwords are set through `${VAR:?}`, and secrets have no default values. Where: `docker-compose.yml`. OWASP: A05, A07.
- [ ] DOCK-05 (P2) nginx has CSP, `server_tokens off`, `client_max_body_size`, `limit_req`, and no directory listing. Where: `lab-08-docker/frontend/nginx.conf`. OWASP: A05, WSTG-CONF-04.
- [ ] DOCK-06 (P1) The build is multi-stage, and the final image has no `.env`, `.git`, tests or keys: `docker run --rm --entrypoint sh <image> -c "ls -la"`. Where: `Dockerfile`, `.dockerignore`. OWASP: A05, A08.
- [ ] DOCK-07 (P2) `HEALTHCHECK` prints no secrets, logs rotate (`max-size`, `max-file`), and the TLS connection to the database (if enabled) verifies the certificate. Where: `Dockerfile`, `docker-compose.yml`. OWASP: A09, A02.
- [ ] DOCK-08 (P2) Recreating containers does not reset volume data without the owner's decision, and commands that remove volumes are marked in the README. Where: `lab-08-docker/package.json`, README. OWASP: A05.

### 4.13 WebSocket

- [ ] WS-01 (P0) A handshake with a foreign `Origin` and without one is rejected, and the allowed list comes from a setting. Where: `lab-07-websocket/src/origin.js`. OWASP: A01, WSTG-CLNT-10, ASVS V13.5.
- [ ] WS-02 (P1) With `REQUIRE_TOKEN` a connection without a token and with a forged one is not accepted, and signatures are compared in constant time. Where: `src/token.js`, `src/socket.js`. OWASP: A07, ASVS V13.5.
- [ ] WS-03 (P1) The sender name comes from the connection and not from the message body. Where: `src/socket.js`. OWASP: A01, A04.
- [ ] WS-04 (P1) An oversize message, a non-JSON message, a message of the wrong type and a field with control or bidi characters are dropped without crashing the server. Where: `src/validate.js`. OWASP: A03, A04, WSTG-CLNT-10.
- [ ] WS-05 (P1) The event rate limit is not reset by reconnecting, there is a limit of connections per address (audit 02, LR7), and the `/login` that issues a token is rate limited. Where: `src/rate-limit.js`, `socket.js`, `src/app.js`. OWASP: A04, A07, ASVS V13.5.
- [ ] WS-06 (P2) A slow client does not build an unbounded queue, and the history is limited by count and age. Where: `src/slow-clients.js`, `src/history.js`. OWASP: A04, A09.

### 4.14 Service worker and cache

- [ ] SW-01 (P1) The worker caches only files of its own origin, and requests to `kroki.io` go to the network. Where: `site/sw.js`. OWASP: A05, A08.
- [ ] SW-02 (P1) `/api/*` is not cached and is not served stale despite `no-store` (F-06). Where: `sw.js`. OWASP: A05.
- [ ] SW-03 (P2) After a release (a file and `VERSION` change) the user gets the new JS no later than the second visit, there is no mix of versions, and old caches are deleted. Where: `sw.js` (`activate`). OWASP: A08, A06.
- [ ] SW-04 (P2) The offline copy of pages with `data-requires-auth` shows no data, and the guard stays in JavaScript (R-05). Where: `sw.js`, `auth-gate.js`. OWASP: A01.
- [ ] SW-05 (P2) Cache Storage holds no personal data, API answers or tokens. Where: DevTools, Application. OWASP: A02, WSTG-CLNT-12.

### 4.15 Privacy of data in localStorage

- [ ] PRIV-01 (P1) The list of `dslkit.*` keys is described (accounts with hashes, session, projects in plain text, settings, cache), and no passwords or tokens of outside services are stored. Where: `site/js/utils/storage.js`, `site/js/storage/*`. OWASP: A02, WSTG-CLNT-12, ASVS V8.
- [ ] PRIV-02 (P2) Logout clears the session, a guest does not see the former user's projects without logging in, and the decision about keeping data after logout is recorded. Where: `accounts.js` (`logout`), `projects.js`. OWASP: A01, A04, ASVS V8.3.
- [ ] PRIV-03 (P2) A full quota shows a write error and not "Saved", and does not erase the other keys (B-06). Where: `source-autosave.js`, `projects.js`. OWASP: A04, ASVS V7.
- [ ] PRIV-04 (P2) Two tabs do not lose records and do not revive a project from the trash (F-05, B-04), and the limit of 200 does not delete silently (B-05). Where: `site/js/storage/projects.js`. OWASP: A04, A08.
- [ ] PRIV-05 (P2) A ban on site data gives a warning and not a "successful" registration (B-08). Where: `site/js/utils/storage.js` (`getStorage`). OWASP: A04, ASVS V7.
- [ ] PRIV-06 (P1) The user sees that the diagram code goes to `kroki.io` with the external engine, the built-in engine sends nothing, and the network shows no other outside hosts (F-11). Where: `site/js/api/config.js`, `privacy.html`. OWASP: A02, A10, ASVS V8.
- [ ] PRIV-07 (P2) There is no analytics or third-party counter, the waitlist form sends data only to its own address, and the policy is current. Where: `waitlist-form.js`, `privacy.html`. OWASP: A02, ASVS V8.
- [ ] PRIV-08 (P2) Public answers of Part 2 do not expose e-mails and hashes (user list, `?q=`). Where: `pz-02-rest-api/src/resource.js`, `users.controller.js`. OWASP: A01, A02, ASVS V8.
- [ ] PRIV-09 (P3) Part 2 request logs do not keep the full IP and the query string without a retention period (TTL, rotation). Where: `src/models/request-log.js`, `tests/log-retention.test.js`. OWASP: A09, ASVS V8.

### 4.16 HTTP API and resource limits

- [ ] API-01 (P1) One heavy request (500 or more blocks or 100,000 characters) does not block static files longer than the threshold, or limits are introduced (F-03, B-02). Where: `tools/render-api.js`, `server.js`. OWASP: A04, WSTG-BUSL-05, ASVS V13.
- [ ] API-02 (P1) The limits on lines (`MAX_LINES`), source size and vertex count fire with codes 422 and 413 before parsing. Where: `render-api.js`. OWASP: A04, ASVS V13.
- [ ] API-03 (P2) The body limit is computed apart from the character limit, and reading stops when it is exceeded (F-07). Where: `render-api.js` (`MAX_BODY`). OWASP: A04.
- [ ] API-04 (P1) A non-JSON body, `null`, a number, an array, a wrong content type and a wrong method give 400, 415 and 405 and not 500. Where: `render-api.js`. OWASP: A05, ASVS V13.2.
- [ ] API-05 (P1) The address of the outside service comes only from `KROKI_URL`, the language is checked against an allow list, and the user does not set the address (SSRF). Where: `render-api.js` (`krokiUrl`, `EXTERNAL_TYPES`). OWASP: A10, WSTG-INPV-19.
- [ ] API-06 (P2) The outside service answer: a 10 s timeout, a cap of 5,000,000 characters, and a wrong format or an error give 502 and 504 without details (local stub). Where: `render-api.js` (`external`). OWASP: A10, A04.
- [ ] API-07 (P2) The catalogs `/api/notations` and `/api/grammar` and the Part 2 errors do not reveal paths, versions or a stack. Where: `render-api.js`, `error-handler.js`. OWASP: A05, WSTG-INFO-02, ASVS V7.4.
- [ ] API-08 (P1) The generation endpoint: an empty key gives a refusal without calling the service, a text over 20,000 characters gives 413, at most two retries, and the result passes `parseDiagram` and is shown as text. Where: `tools/ai-api.js`, `site/js/components/automation.js`. OWASP: A04, A03.

### 4.17 Limits and wording (R-05)

- [ ] LIM-01 (P1) Documents and the interface of Part 1 call accounts and the quota "five diagrams a day" a convenience and not server protection (R-05, F-02, F-12, B-13). Where: README, `privacy.html`, `projects.js`, `quota.js`. OWASP: A04, ASVS V1.
- [ ] LIM-02 (P3) The absence of authentication in LR1, LR2, LR6, PZ2 and the simulated login in PZ1, PZ3 are called a condition of the work in the reports, and the limits of the measures (counters in memory, no token revocation) are listed in `AUDIT.md`. Where: the reports and `part-2/*/AUDIT.md`. OWASP: A01, A04.

## 5. How to run

All commands run on the own machine, paths are for Windows, the shell is Bash or PowerShell.

```
cd E:\DSLKit-Project\.claude\worktrees\test-plans
npm ci
npm test
npm audit --omit=dev --audit-level=high
npm audit
node --test tools/server.test.js tools/render-api.test.js tools/ai-api.test.js
node testing-course/full/static-sec-perf.js
python testing-course/full/auth-e2e.py
```

Server and headers (Part 1):

```
npm start
curl -sI http://localhost:5173/
curl -s -o /dev/null -w "%{http_code}\n" --path-as-is "http://localhost:5173/..%2f..%2fpackage.json"
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5173/index.html
curl -s -m 10 -X POST http://localhost:5173/api/validate -H "Content-Type: application/json" -d "null"
curl -s -m 10 -X PUT http://localhost:5173/api/render
```

Search for dangerous patterns and secrets (do not print values):

```
git grep -nE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function" -- site/js
git grep -lIE "(api[_-]?key|secret|passw)" -- . ":!package-lock.json"
git ls-files | grep -E "(^|/)\.env$"
```

Part 2 (example `lab-03-auth`, the other works in their own copies):

```
cd E:\DSLKit-Project\.claude\worktrees\lab28\part-2\lab-03-auth
npm ci
npm test
npm audit --omit=dev --audit-level=high
seq 1 6 | xargs -I{} curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d "{\"email\":\"user@example.test\",\"password\":\"wrong-{}\"}"
curl -s -i -X OPTIONS http://localhost:3000/diagrams -H "Origin: http://evil.test" -H "Access-Control-Request-Method: POST"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/diagrams -H "Authorization: Bearer not-a-token"
```

Expected: 401 five times, then 429. Docker (`lab-08-docker`, `.env` with test values):

```
cd E:\DSLKit-Project\.claude\worktrees\lab28\part-2\lab-08-docker
docker compose config --quiet
docker compose up --build -d
docker compose exec backend id
docker compose exec backend sh -c "touch /probe"
docker compose port db 5432
docker compose down
```

Do not run `docker compose down -v` or `prune` without the owner's decision. Browser (Chromium, DevTools): Console for CSP violations, Network for outside hosts, Application for Local Storage, Cache Storage and Service Workers, and Clear site data before a run. Parse time: a Node script calls `importDiagram` with a string of 40,000 spaces and measures the time (threshold 200 ms).

## 6. Artifacts

| Artifact                     | Where                                                   | Content                                                     |
| ---------------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| Run report (RU and EN)       | `docs/test-plans/`                                      | Date, commit hash, platform, result for each item           |
| Findings register            | in the report, IDs as in `80-break-report.md`           | ID, area, severity, steps, fact, expectation, file and line |
| `npm audit` output           | attachment, without secrets                             | Packages and levels for each work                           |
| Screenshots and console logs | `docs/testing-kulikov/screens-*`                        | CSP violations, headers, Cache Storage                      |
| Reproduction scripts         | `testing-course/full/`, `docs/testing-kulikov/scripts/` | Playwright and `curl` scenarios                             |
| Risk register                | `docs/testing-kulikov/10-test-plan.md`                  | Open P1 and P2 items with the decision owner                |
