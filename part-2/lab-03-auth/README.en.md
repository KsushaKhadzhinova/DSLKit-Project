# Part 2. Lab 3. Authentication and authorization

The DSLKit project (diagrams as code, SaaS). Assignment: `materials/text/part-2/Модуль 01…/38. Лабораторная работа 3…`. The work continues [lab 2](../lab-02-sequelize): users, registration, login with a JWT, route protection and a role model are added. Reports: [`report.md`](report.md) in Russian, [`report.en.md`](report.en.md) in English (templates `report.tpl.md`, `report.en.tpl.md`; built with `node tools/build.js part-2/lab-03-auth` from the repository root). The Russian version of this file is [`README.md`](README.md).

**Branch for submission: `23`** (by the assignment). It was created from the `lab12` branch, which holds labs 1 and 2.

## 1 What is done

| Method                   | Path                         | Access         | Responses                                                  |
| ------------------------ | ---------------------------- | -------------- | ---------------------------------------------------------- |
| `POST`                   | `/auth/register`             | everyone       | 201 user without the hash, 400 bad data, 409 email taken   |
| `POST`                   | `/auth/login`                | everyone       | 200 `{ token, tokenType, expiresIn }`, 400, 401 wrong pair |
| `GET`                    | `/profile`                   | token          | 200 the current user, 401                                  |
| `GET`                    | `/diagrams`, `/diagrams/:id` | token          | 200, 404                                                   |
| `POST`                   | `/diagrams`                  | token          | 201, the owner is the calling user                         |
| `PUT`, `PATCH`, `DELETE` | `/diagrams/:id`              | owner or admin | 200 or 204, 400, 403 someone else's diagram, 404           |
| `GET`                    | `/users`                     | admin          | 200 list without hashes, 403                               |
| `PATCH`                  | `/users/:id/role`            | admin          | 200, 400 bad role or own role, 404                         |
| `DELETE`                 | `/users/:id`                 | admin          | 204, 400 deleting oneself, 404                             |

**The extra mechanism: a role model (RBAC).** The `role` field (`user` or `admin`), the `requireRole('admin')` middleware, the user management routes and the rule "the owner or an admin may change and delete a diagram". The role at registration is always `user`; the first administrator is created by a seed from environment variables.

## 2 Security: decisions

- A password is stored only as a bcrypt hash (10 rounds), the password length is from 8 characters and at most 72 bytes (bcrypt cuts anything beyond that).
- The token is signed with HS256, its lifetime comes from `JWT_EXPIRES_IN` (1 hour by default). The check accepts only HS256, so tokens with `alg: none` and HS512 are rejected.
- After the signature check the middleware reads the user from the database: a deleted account and a role change take effect at once, and `req.user` holds `{ id, email, role }` from the database.
- Login answers the same to a wrong password and an unknown email and spends the same time (a comparison with a spare hash).
- The email is lowercased, duplicates are caught by a unique index (a 409 answer also under a race of requests).
- The `JWT_SECRET` secret is mandatory (32 characters or more), and without it the server does not start. Only `.env.example` is in the repository.
- Brute-force protection: 20 logins per address in 15 minutes (a 429 answer with `Retry-After`), after 5 failed attempts the email is locked for 15 minutes, unknown emails included. The counters live in process memory. The token lifetime is at most 24 hours, the secret is 32 characters or more, the issuer is `dslkit`, security headers are set and the request log goes to the `RequestLogs` table. Length limits are in `limits.json`.
- Not implemented: logout with token revocation and refresh tokens. The report describes this as a limitation.

## 3 Running

Node.js 22 or newer is required. SQLite is used by default, and PostgreSQL and Neon are connected as in lab 2 (`DATABASE_URL`).

```bash
cd part-2/lab-03-auth
npm install
cp .env.example .env     # then set JWT_SECRET, and ADMIN_EMAIL and ADMIN_PASSWORD if you like
npm run db:migrate
npm run db:seed          # demo diagrams and the administrator (if ADMIN_* are set)
npm run dev
npm test
```

A secret can be generated with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Request examples for the REST Client extension are in [`requests.http`](requests.http). A curl example:

```bash
curl -s -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"correct horse 42"}'
curl -s http://localhost:3000/profile -H "Authorization: Bearer <token>"
```

## 4 Structure (new compared with lab 2)

| Path                                           | Purpose                                                         |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `migrations/…-create-users.js`                 | The `Users` table (unique email, `passwordHash`, `role`)        |
| `seeders/…-admin-user.js`                      | The administrator from `ADMIN_EMAIL` and `ADMIN_PASSWORD`       |
| `src/models/user.js`                           | The model and the safe view `toPublic()`                        |
| `src/middleware/auth.js`                       | `createAuthenticate` (Bearer JWT) and `requireRole`             |
| `src/middleware/validate-auth.js`              | Check of the email, the password and the role                   |
| `src/controllers/auth.controller.js`           | Registration and login                                          |
| `src/controllers/users.controller.js`          | The profile and user management                                 |
| `src/routes/auth.routes.js`, `users.routes.js` | Routes                                                          |
| `tests/`                                       | Tests of HTTP, JWT, roles, diagram owners, migrations and seeds |

The `ownerId` field of a diagram is now set by the server from the token, not by the client.

## 5 Checking

`npm test` runs 120 tests on a temporary SQLite database with the real migrations (bcrypt with 4 rounds for speed) and the check of the reports (`report.test.mjs`). The connection to a real PostgreSQL was not checked. `npm audit` shows remarks in development tools (`nodemon`, `sequelize-cli`).

## 6 PUT and PATCH

`PUT /diagrams/:id` replaces the diagram as a whole: all required fields are needed, and a skipped `priority` gets its default value. `PATCH /diagrams/:id` changes only the sent fields (for example `{"priority":"high"}`), and the rest stay as they were. Every sent field is checked as in `POST`, an empty body or a body without known fields gives 400, and the owner field cannot be sent. The rights are the same as for `PUT`: the owner or an admin may change, and everyone else gets 403. `PUT` is idempotent, while `PATCH` by definition does not have to be.

## 7 How to cause a 500 with a real failure

The 500 answer is caused by a database failure, not by a button.

- SQLite: run `npm start`, and in a second window run `npx sequelize-cli db:migrate:undo:all`. The tables vanish under the running server, the very first request cannot write a row to the `RequestLogs` log and gets 500 with the body `{ "error": "Internal server error" }`, and the details stay only in the server console. To restore work: `npm run db:migrate` and `npm run db:seed`.
- PostgreSQL (Neon, Supabase or local): stop the database service or container, requests give 500, and `GET /health` answers 503.
- A start with an unreachable database ends with exit code 1 and a message, and the server does not come up.
