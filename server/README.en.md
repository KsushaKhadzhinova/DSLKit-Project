# DSLKit editor server: accounts, roles, projects

Русская версия: [README.md](README.md). Role × action matrix: [ROLES.en.md](ROLES.en.md).

Express 5 + Sequelize + JWT. Server-side storage of diagram projects. The editor without a server works as before (the Guest role, local storage).

## Run

```powershell
cd server
npm install
copy .env.example .env   # set JWT_SECRET (at least 32 characters), optionally ADMIN_EMAIL and ADMIN_PASSWORD
npm start
npm test                 # tests and coverage thresholds
npm run lint
```

Tests on PostgreSQL: set `TEST_PG_URL` (an admin connection string, e.g. a `postgres:16` container); every test server gets and drops its own database.

```powershell
$env:TEST_PG_URL = "postgres://postgres:<password>@127.0.0.1:55432/postgres"; npm test
```

`.env` is never committed. All settings: `.env.example`. Limits (lengths, rates, token lifetimes): `limits.json`.

## Database

`DB_DIALECT=sqlite` (development and tests, file `DB_STORAGE`) or `postgres` (production, `DATABASE_URL`). Tables: `users` (role in the `role` column), `projects`, `project_members`, `refresh_tokens` (hashes only), `request_logs` (request log: method, path without query, status, user, IP, duration).

Schema creation: outside production they are created by `sequelize.sync()` (`DB_SYNC` defaults to `true`); in production `DB_SYNC` defaults to `false` and the schema comes from the migration: `npm run migrate` (applies `migrations/*.js` in order, tracked in `schema_migrations`, a second run does nothing). A test checks that the migration yields the same schema as the models (SQLite and PostgreSQL).

Search uses the precomputed `searchText` column (lower case, NFC and "ё = е" computed in code, cut to the column size), so Cyrillic and letter case behave the same on SQLite and PostgreSQL.

## API (prefix `/api`, errors: `{"error":{"code","message","details?"}}`)

| Method and path                            | Access         | Purpose                                                              |
| ------------------------------------------ | -------------- | -------------------------------------------------------------------- |
| `GET /health`                              | anyone         | liveness                                                             |
| `POST /auth/register`                      | anyone         | register (always role `user`)                                        |
| `POST /auth/login`                         | anyone         | sign in, returns access (10 min) and refresh (7 days) tokens         |
| `POST /auth/refresh`                       | anyone         | refresh with rotation                                                |
| `POST /auth/logout`                        | anyone         | revoke a refresh token                                               |
| `GET /me`                                  | signed in      | own profile                                                          |
| `GET /projects`                            | signed in      | list: `page`, `pageSize`, `q`, `sort`, `order`, `mine`, `visibility` |
| `POST /projects`                           | signed in      | create                                                               |
| `GET/PATCH/DELETE /projects/:id`           | per the matrix | read, update, delete                                                 |
| `GET /projects/:id/members`                | owner, admin   | members                                                              |
| `PUT/DELETE /projects/:id/members/:userId` | owner, admin   | grant (`read`/`write`) or revoke access                              |
| `GET /users`                               | admin          | users with emails, paging and search                                 |
| `PATCH /users/:id`                         | admin          | change a role (not one's own)                                        |
| `POST /users/:id/unlock`                   | admin          | clear a login lockout                                                |
| `GET /logs`                                | admin          | request log                                                          |

## Security

- Passwords: bcrypt (cost from `BCRYPT_ROUNDS`, at least 10 in production), 8 characters minimum, a letter and a digit, at most 72 bytes.
- Tokens: access JWT (HS256, `iss`, `aud`, 10 minutes); the refresh token is opaque and stored only as SHA-256; rotation, replaying an old token revokes every session of the user; at most 10 sessions.
- Sign-in: 5 wrong passwords lock the account for 15 minutes. The counter is atomic (parallel requests cannot dodge the lock). A locked account answers like a wrong password (401), so the lock does not reveal that the account exists; an admin can unlock. Remaining risk: someone else's email can be locked by guessing, softened by per-IP limits. Per-IP limits: general traffic, login, registration, refresh.
- Input is validated strictly at the boundary (schema in `src/schema.js`): types, lengths, unknown fields rejected (no mass assignment of role or owner), search escapes `%` and `_`, SQL only through Sequelize parameters.
- Permissions are enforced on the server on every request from the role in the database (a role change applies at once). A foreign private project, a missing one and a malformed id all give the same 404.
- Email is visible only to its owner and to admins. The log never holds bodies, passwords or tokens.
- CORS only from the `CORS_ORIGINS` list (no `*`); tokens travel in the `Authorization` header, not in cookies, so CSRF does not apply. Headers: `nosniff`, `X-Frame-Options`, `no-store`, strict CSP.
- Known trade-offs: duplicate registration returns 409 (reveals a taken email); rate limits live in one process memory; set `TRUST_PROXY` (number of proxies) behind a reverse proxy, otherwise the limit is counted per proxy address.
- HTTPS: the server does not terminate TLS itself, keep it behind a TLS reverse proxy; in production it sends `Strict-Transport-Security`.
- Retention: the request log is kept `logRetentionDays` (30) days, expired refresh tokens are deleted hourly.
- `title` and `description` are stored verbatim, including `<` and `>`: the client must render them with `textContent`, never `innerHTML`.

When the lock triggers, the counter is reset to 0; during a burst of parallel wrong passwords a small remainder (up to the burst size) can be left in the counter at that moment. The lock is already set; the remainder only brings the next lock closer.
