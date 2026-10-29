# DSLKit architecture review (short)

Russian original with full detail: [`ARCHITECTURE-REVIEW.md`](ARCHITECTURE-REVIEW.md). Snapshot date: 29 October 2026. No code was changed or committed. Secret values were not read: only variable names, file presence and ignore rules were checked.

Effort: S under an hour, M half a day, L more than a day.

## Verdict

- Part 1 (no-build ES modules, localStorage, in-browser accounts, no shared backend) fits the aim of the course and the 100% coverage rule. It is not a product architecture: browser accounts and the client-side `developer` role are convenience, not access control.
- Part 2 (Express, Sequelize and PostgreSQL, JWT, React and axios, Mongoose, Socket.IO, Compose) matches the labs, is layered, validates the token settings at start and has a hardened Compose file.
- Conformity with the course conditions: no gaps found in the study overviews.

## Environment

- No `.env` file is tracked on any local branch or present in history; only `.env.example` files. Five real `.env` files sit on disk inside worktrees and are ignored (root `.gitignore`; for `.claude/worktrees/` only through `.git/info/exclude`).
- Duplicate: `DEMO_USER_PASSWORD` appears twice in `course-project/app/docker/.env.example` (branch `course-app`).
- Drift: lab 2 has an SQLite variant (branch `23`, `SQLITE_STORAGE`) and a PostgreSQL variant (branches `25`, `28`, `lab12`); `CORS_ORIGIN` and `TRUST_PROXY` are read by `lab-03-auth/server.js` but missing from its `.env.example`; the default `http://localhost:5178` is hard-coded in three places.
- Ports: 3000 everywhere (conflict when labs run together), 5173 site, 5178 lab 5 client, 8080 Nginx, 5050 pgAdmin, 5432 default Postgres. Ports 5433, 5434 and 3001 appear nowhere in the code or configs.
- Validation: token settings are checked at start, Compose requires the password and the secret; there is no general env schema (`Number(PORT) || 3000`), no `.env.test`.

## Dependencies

- `engines.node >=20` is out of support; CI uses 24. Suggest `>=22` and `.nvmrc`.
- `npm audit --omit=dev` at the root: 0. `react-app`: 5 low (jest chain, tooling only). Part 2 worktrees were not audited.

## Top 5 problems

1. Client-side `developer` role and browser accounts presented as authorization (`site/js/config/roles.js`, `site/js/storage/accounts.js`).
2. PBKDF2 uses 100 000 iterations (OWASP: 600 000) in `accounts.js`.
3. Same work in many branches and 23 worktrees, three versions of lab 2: risk of defending the wrong one.
4. Real `.env` files inside the repository tree with ignore only in `.git/info/exclude`; untracked 241 MB `DSLKit-Project/` copy in the root.
5. No env schema or port table: `PORT=3000` everywhere, 5433/5434/3001 undocumented, duplicate `DEMO_USER_PASSWORD`, undocumented `CORS_ORIGIN`.

## Top 5 recommendations

1. Rename the client role to "developer mode"; use a server JWT role only in the course project (S).
2. Raise PBKDF2 to 600 000 with rehash on sign-in (S).
3. Add `docs/WORK-MAP.md` and `final/labN` tags; branch `25` is the reference for labs 1 to 5 (S).
4. Ignore `.claude/` and `DSLKit-Project/` in the root `.gitignore`, add a pre-commit file-name check (S).
5. Add `src/env.js` validation (port range, URL, production requirements), one port table in `docs/`, fix the duplicate, set Node `>=22` (M).

## Summary table

| What | Where | Now | Proposal | Why | Effort |
| --- | --- | --- | --- | --- | --- |
| Developer role | `site/js/config/roles.js`, `accounts.js` | SHA-256 check in browser | Call it developer mode; server role in course project | Client is not an access boundary | S |
| PBKDF2 | `site/js/storage/accounts.js` | 100 000 iterations | 600 000 with rehash | OWASP; `iterations` field exists | S |
| Work versions | branches `23` to `28`, `course-app`, 23 worktrees | Copies in several branches | `WORK-MAP.md`, tags | Defend the right version | S |
| Real `.env` | `.claude/worktrees/*`, `DSLKit-Project/` | Ignored locally only | Root `.gitignore`, pre-commit check | Accidental commit | S |
| Duplicate variable | `course-app: app/docker/.env.example` | `DEMO_USER_PASSWORD` twice | Keep one | Last silently wins | S |
| Env schema | `lab-03-auth/server.js`, course project | No format checks | `src/env.js` | Fail fast | M |
| CORS and proxy vars | `lab-03-auth/.env.example` | Missing, hard-coded | Document, one constant | Example matches code | S |
| Ports | all `.env.example` | 3000 everywhere | Port table, port 0 in tests | Parallel runs | S |
| Node | `package.json` | `>=20` | `>=22`, `.nvmrc` | Node 20 unsupported | S |
| Lab 2 variants | `23` vs `25`/`28`/`lab12` | SQLite vs PostgreSQL | One PostgreSQL example | One lab, one config | M |
| CSP and Kroki | `tools/server.js`, `config.js` | Fixed `connect-src` | Build CSP from `KROKI_URL` | Consistency | S |
| Part 2 audit | worktrees | Not run | Loop `npm audit --omit=dev` | No data | M |
