# Test plan and checklist: API, databases, WebSocket, Docker (specialist 07)

Russian version: [`07-backend-db-docker.md`](07-backend-db-docker.md). Version 1.0, 6 November 2026, branch `docs/test-plans-and-checklists`. Overall strategy: [`../01-test-strategy.en.md`](../01-test-strategy.en.md).

This document was written by reading the code and documents of the repository (`docs/PROJECT-STATE.md`, `docs/ITIVP-AUDIT-2026-10-29.md`, `docs/HANDOVER-SESSION-2026-10-28.md`, `docs/testing-kulikov/30-api-test-run.md`, `31-api-bug-reports.md`, the README and `postman_collection.json` of the working copies). Nothing was run at this step. Anything that cannot be confirmed by reading is marked with the word "verify".

## 1. Role and scope

The specialist checks the HTTP API contract, the integrity and migrations of the databases (PostgreSQL, SQLite, MongoDB), WebSocket events, building and running containers, configuration through environment variables, 500 responses and pages, and the request log in the database (a requirement of the even variant 26).

| Area               | Works and objects                                                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REST API           | Lab 1 (`lab21`), lab 2 (`lab12`), lab 3 (`23`), server of lab 5 (`25`), lab 6 (`26`), practical 2 (`pz22`), course project (`course-app`)                                              |
| Server pages       | Practical 1 (`pz21`, EJS, CSRF, log in SQLite)                                                                                                                                         |
| Real time          | Lab 7 (`27`, Socket.IO, `mongodb` driver)                                                                                                                                              |
| Containers         | Lab 8 (`28`, Nginx, Express, PostgreSQL, pgAdmin and Redis profiles), `course-project/app/docker`                                                                                      |
| Root rendering API | `tools/render-api.js`, `tools/server.js` (`/api/notations`, `/api/grammar`, `/api/engines`, `/api/render`, `/api/validate`, `/api/parse`, `/api/generate`, `/api/external/<language>`) |
| Out of scope       | client logic of labs 4, practicals 3 and 4 and the interface of lab 5 (specialist 01), deep security (03), load (05)                                                                   |

## 2. What the specialist checks

| Priority | What counts as a defect of this level                                                                                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Server crash or hang, loss or corruption of data, login or role bypass, leak of a password, hash, secret or internal error, the stack does not start from scratch, a secret in an image or the repository |
| P1       | Wrong code where the contract is set (500 instead of 4xx, 200 instead of 404 or 409), no CHECK, foreign key or uniqueness, a migration that does not roll back, no request record in the DB               |
| P2       | Error format, headers, paging, sorting, filter or idempotency differ from the documentation, a test is red because of the environment, unstable load tests                                                |
| P3       | Small deviations from RFC 9110 (HEAD, OPTIONS, `Accept` with `q=0`), inexact message texts, outdated ports in documents                                                                                   |

Checked: codes 200, 201, 204, 400, 401, 403, 404, 405, 406, 409, 413, 415, 422, 429, 500, 503, one error format inside a work, value boundaries, paging, sorting, filters, idempotency, `PUT` and `PATCH`, migrations up and down, seeds, `CHECK`, foreign keys, indexes, transactions and rollback, MongoDB indexes, aggregations and nested documents, rooms, presence, `Origin` and reconnection, Docker build from scratch, healthcheck, data after a restart, ports 80 and 5000, secrets, `.env`, 500 pages, the request log, a snapshot of every endpoint.

Facts the plan must take into account:

1. The error format is single inside a work and differs between works: labs 1, 2, 3, 6 and the course project give `{"error":"text","details":[...]}`, practical 2 and the root API give `{"error":{"code","message","details"}}`, lab 7 and practical 1 return HTML pages. This is an observation, not a defect, until the owner decides.
2. The protocol of 29.10 records 3 red configuration tests in labs 2 and 3 when `.env` is filled in.
3. The automated tests of labs 2 and 3 run on SQLite (`SQLITE_STORAGE`), while the work is submitted on PostgreSQL 16, so the key constraints are checked on PostgreSQL too.
4. The protocol `30-api-test-run.md` (716 checks, 661 Pass, 55 Fail, BUG-01 ... BUG-16) is older than the commits `a70e8c0` and `6bcf386` of 30.10, which hardened the root API. The status of every BUG is rechecked, not carried over.
5. The Postman collection of the course project (17 requests) repeats lab 3 without comments and tags, while there are 21 endpoints. The Postman snapshots in the works were made by scripts, there are no Postman windows.
6. Questions to the teacher are open: lab 1 data in an array or in the DB (question 31), SQLite or PostgreSQL, whether a snapshot of every endpoint is needed.

## 3. Plan

### 3.1 Goals

1. Confirm that every documented endpoint answers with the expected code, body and headers, and that undocumented input does not give 500.
2. Confirm that the database protects the data itself: constraints work when the API is bypassed, migrations are reversible, seeds are repeatable.
3. Confirm that the stack starts from scratch following the README, survives a restart with its data and keeps no secrets in images and the repository.
4. Collect the Postman collections and snapshots for every endpoint (a requirement of the teacher) and note the differences from the script snapshots.

### 3.2 Matrix "work × level of checking"

Legend: A automated tests exist in the repository (`npm test`), M manual or scripted run following section 4, A+M both, "-" not applicable, "?" depends on access.

| Work (branch)                    | Contract, codes    | Validation, boundaries | Paging, sorting, filters | DB, migrations, seeds | Roles, token | Resilience, 500, 503 | Request log      | Docker, env | Postman, snapshots |
| -------------------------------- | ------------------ | ---------------------- | ------------------------ | --------------------- | ------------ | -------------------- | ---------------- | ----------- | ------------------ |
| Lab 1 (`lab21`)                  | A+M                | A+M                    | A+M                      | - (array)             | -            | A+M                  | - (question 31)  | M           | M, 16 requests     |
| Lab 2 (`lab12`)                  | A+M                | A+M                    | A+M                      | A+M (SQLite, PG)      | -            | A+M                  | A+M (table)      | M           | M, 22 requests     |
| Lab 3 (`23`)                     | A+M                | A+M                    | A+M                      | A+M (SQLite, PG)      | A+M          | A+M                  | A+M (table)      | M           | M, 17 requests     |
| Lab 4 (`24`)                     | -                  | -                      | -                        | -                     | -            | -                    | -                | -           | -                  |
| Lab 5 (`25`, server)             | A+M (CORS, search) | A+M                    | A+M                      | as lab 3              | as lab 3     | A+M                  | as lab 3         | M           | M                  |
| Lab 6 (`26`)                     | A+M (needs mongod) | A+M                    | A+M                      | M (indexes, TTL)      | -            | A+M                  | A+M (collection) | M           | M, 18 requests     |
| Lab 7 (`27`)                     | A+M                | A+M                    | -                        | ? (history)           | login token  | A+M                  | -                | M           | M (client)         |
| Lab 8 (`28`)                     | A (files) and M    | -                      | -                        | M (volume, `down -v`) | as lab 3     | M                    | as lab 3         | A+M         | M, `docker ps`     |
| Practical 1 (`pz21`)             | A+M                | A+M                    | -                        | M (SQLite)            | `?auth=1`    | A+M (500 page)       | A+M (table)      | M           | M                  |
| Practical 2 (`pz22`)             | A+M                | A+M                    | A+M                      | - (memory)            | -            | A+M                  | -                | M           | M, 19 requests     |
| Practicals 3, 4 (`pz23`, `pz24`) | -                  | -                      | -                        | -                     | -            | -                    | -                | -           | -                  |
| Course project (`course-app`)    | A+M, 21 endpoints  | A+M                    | A+M                      | A+M (6 migrations)    | A+M          | A+M                  | A+M (table)      | A and M     | M, incomplete      |
| Root API                         | A+M                | A+M                    | -                        | -                     | -            | A+M                  | -                | M (Kroki)   | M (scripts)        |

### 3.3 Approach

1. The automated tests of each work run one process at a time (ports and temporary databases are shared), then the manual and scripted run follows section 4.
2. Kulikov techniques, as in `30-api-test-run.md`: boundary values (0, 1, the limit, the limit plus 1), equivalence classes (field type, Content-Type, method), error guessing (`__proto__`, `\u0000`, `%`, `1e309`, invisible characters, deep JSON).
3. The contract is compared with the route table in the README and `report.md` of the work, not with memory. A difference between code and document is P1 (code) or P3 (document).
4. Key database checks are repeated on PostgreSQL 16, because the automated tests run on SQLite.
5. Destructive commands (`docker compose down -v`, `docker system prune`, `docker volume rm`, `db:migrate:undo:all`, `db:reset`) run only on a disposable copy of the stack and after an explicit "yes" from the owner. This plan does not run them.
6. Secrets stay out of protocols: `.env` values, connection strings, tokens and the output of `docker compose config` and `docker inspect` are not pasted.

### 3.4 Environment and ports

| What                                                           | Default                                        | Note                                                                                                    |
| -------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Servers of labs 1, 2, 3, 6, 7, practicals 1, 2, course project | `PORT` or 3000                                 | when run together, per the handover: lab 3 on 3001, lab 2 on 3000                                       |
| PostgreSQL of labs 2 and 3                                     | 127.0.0.1:5432 (`POSTGRES_PORT`)               | when run together: lab 3 on 5433, lab 2 on 5434, Compose projects `dslkit-lab3-db` and `dslkit-lab2-db` |
| Clients of labs 4 and 5                                        | 5175 and 5178                                  | CORS of lab 5 allows one address, by default `http://localhost:5178`                                    |
| Lab 8 client and server                                        | 8080 and 127.0.0.1:3000                        | by the task 80 and 5000: `FRONTEND_PORT=80`, `BACKEND_PORT=5000` (inside the container always 3000)     |
| Lab 8 pgAdmin, Redis, database                                 | 127.0.0.1:5050, not published                  | profiles `tools` and `cache`, network `internal`                                                        |
| Site and root API                                              | 5173 (`npm start`), 5190, 5195                 | `node tools/serve.js site <port>`, 5195 for heavy requests                                              |
| MongoDB                                                        | Atlas M0 or `mongodb://127.0.0.1:27017/dslkit` | the URI only in `.env`, do not write the password down                                                  |
| Environment                                                    | Node.js 22 and newer, Docker Compose v2        | Docker Desktop is slow to start on this computer                                                        |

### 3.5 Entry and exit criteria

Entry: a working copy of the needed branch without foreign edits and `npm install` in the work folder. PostgreSQL 16 is available for labs 2, 3 and the course project (`docker compose up -d db`), MongoDB for lab 6, a running Docker for lab 8. Automated tests run without `.env`, manual runs with `.env`. The machine is free (many timeouts of 29.10 came from parallel load).

Exit: the P0 and P1 items of section 4 are passed, there are no open P0, open P1 have a decision of the owner. Every endpoint has a record "request, code, body, headers" and a snapshot or a reason why there is none. The protocol keeps the date, branch, commit and the versions of Node.js, PostgreSQL and Docker.

Stop: Docker, Atlas or Kroki are unavailable. Resume after the environment is restored and a repeated smoke run (`GET /health`).

### 3.6 Risks

| Risk                                                                        | What to do                                                                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| SQLite in the automated tests hides differences from PostgreSQL             | repeat CHECK, foreign keys, uniqueness, 409 and rollback on PostgreSQL (section 4.13) |
| `spike` tests in labs 1 and 7 are unstable                                  | run them separately on a free machine, write down the machine load                    |
| Lab 6 tests timed out on 29.10, the cause is not established                | verify `MONGOMS_SYSTEM_BINARY` and the `mongod` download, run one file at a time      |
| A volume with an old password: backend in a restart loop (finding of 28.10) | a separate project `docker compose -p <name>` and a fresh volume                      |
| No access to Atlas, Postman Desktop, Docker Hub                             | the items are marked "by the owner by hand"                                           |
| Heavy graph requests block the single Node.js thread                        | run them on port 5195, replace the external Kroki with a stub through `KROKI_URL`     |

## 4. Checklist

### 4.1 General API contract (every server work)

- [ ] The route table in the README and `report.md` matches the real routes
- [ ] Success: `GET` 200, `POST` 201 with `Location`, `PUT` and `PATCH` 200, `DELETE` 204 without a body
- [ ] An unknown path answers 404 in the error format of the work, a wrong method 405 with `Allow`, `OPTIONS` 204 with `Allow`, `HEAD` like `GET` without a body
- [ ] A body of another type (`text/plain`, `application/xml`, `multipart/form-data`) gives 415 (labs 1, 2, 3, course project, practical 2), verify in lab 6, no 415 was found in the code
- [ ] Broken JSON, an empty body, `null`, an array, a number, a string instead of an object give 400 with a clear text
- [ ] A body above `100kb` gives 413 as a JSON error, then `/health` still answers
- [ ] The error format is the same for all codes of the work, `details` holds `field` and `message` pairs
- [ ] 500 does not expose the exception, a path, a table name, SQL or a stack (response and console), 422 is not used in labs 1 ... 6 and practical 2, it exists only in the root API
- [ ] JSON API headers: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Cache-Control: no-store`, `x-powered-by` is off
- [ ] An id in the path `0`, `-1`, `01`, `1e0`, `0x1`, `abc`, `%`, `%00`, a number above `2^53`, a path of 10000 characters give 400, not 500
- [ ] Strings: empty, spaces only, invisible characters only (U+200B, U+200C, U+200D, U+2060, U+FEFF), with NUL, BEL, ESC, length equal to the limit and the limit plus 1 (`limits.json`)
- [ ] Emoji, right-to-left text and the keys `__proto__`, `constructor`, a repeated key do not break a record and do not give 500
- [ ] Idempotency: a repeated `PUT` gives the same state, a repeated `DELETE` gives 404, a repeated `POST` creates a new record
- [ ] `PUT` replaces the whole record, `PATCH` changes only the sent fields, an empty `PATCH` gives 400, `id` and `createdAt` do not change and cannot be set by the client
- [ ] 20 parallel `POST` give 20 records with different `id`, parallel `PATCH` do not break a record

### 4.2 Lab 1 Express, array (`w-lab21`, `part-2/lab-01-node-server`, port 3000)

- [ ] `GET /health` gives `{"status":"ok"}`, `GET /diagrams` gives an array and `X-Total-Count`, without `limit` the whole list comes, with `limit` 1 ... 100 a page
- [ ] `?limit=0`, `?limit=1000`, `?limit=1e9`, `?offset=-1`, `?offset=1000001`, a repeated `sort` or `order` give 400
- [ ] `?sort=` accepts `id`, `title`, `notation`, `priority`, `owner`, `createdAt`, the values `password`, `constructor`, `__proto__` give 400, `?order=desc` and `DESC` work, `?order=up` gives 400
- [ ] `?notation=` accepts `UML`, `BPMN`, `ERD`, `DFD`, `IDEF0`, `Petri` (the case `uml` gives 400), `?q=` searches a part of the title, an empty `q` and one longer than 80 give 400
- [ ] `POST`: `title` 80 and 81, `owner` 60 and 61, `sourceCode` 10000 and 10001, `priority` outside `low`, `normal`, `high`, a foreign `notation`
- [ ] `PUT` without `priority` sets `normal`, `PATCH /diagrams/1` with `{"priority":"high"}` changes one field
- [ ] `DELETE /diagrams/2` gives 204, a repeat 404, then `GET` and `PUT` for this `id` give 404
- [ ] After a restart the two initial records are back, the `id` counter starts at 1 (data in an array)
- [ ] A store failure on `POST` gives 500 `Internal server error` without details, `SIGINT` and `SIGTERM` end the process within 5 seconds
- [ ] Automated tests `control-chars`, `diagrams`, `health`, `negative`, `paging`, `stress` are green, the red `spike: 1000 sockets` is filed as unstable

### 4.3 Lab 2 Sequelize, PostgreSQL (`check-lab12`, `part-2/lab-02-sequelize`)

- [ ] Repeat 4.2 for `/diagrams` with the fields `revision` (integer 0 ... 100000) and `projectId`, sorting includes `revision`
- [ ] `revision` `-1`, `1.5`, `"1"`, `null`, `1e999`, `100001` and huge `projectId` give 400, there is no overflow and no 500
- [ ] `POST /projects` gives 201, the same `name` gives 409 with `details` on the field `name`, an empty name and one longer than 80 give 400
- [ ] `GET /projects`, `GET /projects/:id`, `GET /projects/:id/diagrams` (paging, sorting), `DELETE /projects/:id` gives 204 and the diagrams stay with `projectId = null`
- [ ] `PATCH` with a non-existent `projectId` gives 400, `PUT` without `projectId` resets it to `null`
- [ ] `GET /health` 200, with a stopped database 503, the other routes with a stopped database 503 with a bilingual text, not a bare 500, after the database returns they work without a restart
- [ ] Automated tests `config`, `diagrams`, `health`, `http-extra`, `log-retention`, `migrations`, `negative`, `outage`, `paging`, `projects-patch`, `resilience` are green on a free machine (on 29.10 they did not finish in 170 s)

### 4.4 Lab 3 JWT, roles, lockout (`part2-server-labs-87ed8e`, `part-2/lab-03-auth`, port 3001)

- [ ] `POST /auth/register` gives 201 with `Location: /profile` without `passwordHash`, a repeated e-mail (also in another letter case) gives 409
- [ ] Registration: a wrong e-mail, a password shorter than 8 or longer than 72 bytes, spaces only, an e-mail longer than 254 or with a control character give 400 with `details`
- [ ] `POST /auth/login` gives 200 with `token`, `tokenType`, `expiresIn`, a wrong password and an unknown e-mail give the same 401
- [ ] After 5 failures for the pair "address and e-mail" the login is locked for 15 minutes (`limits.json`), the answer is 429 with `Retry-After`, the right password also gives 429 until the end of the period
- [ ] The limits of 20 logins per 15 minutes and 10 registrations per 60 minutes per address give 429 before the data is checked
- [ ] `GET /profile` without a token, with `Basic`, expired, with a foreign signature, `alg: none`, for a deleted user gives 401
- [ ] The role is taken from the database on every request: a role change works at once, without a new login
- [ ] `/diagrams`: all methods without a token 401, 405 and `OPTIONS` answer without a token, a foreign diagram `PUT`, `PATCH`, `DELETE` gives 403, an admin may, `ownerId` is set by the server
- [ ] `GET /users` for `user` 403, for `admin` 200, `PATCH /users/:id/role` accepts `user` and `admin`, one's own role and deleting oneself give 400, `DELETE /users/:id` with diagrams gives 409, an unknown id 404
- [ ] Starting with a `JWT_SECRET` shorter than 32 characters or a repeating one, and with a `JWT_EXPIRES_IN` outside 1 second ... 24 hours fails with a clear error
- [ ] The responses, the console and the `RequestLogs` table hold no password hash and no token

### 4.5 Lab 5 (server of lab 3 with CORS and search, `lab25/part-2/lab-03-auth`), labs 4, practicals 3 and 4 have no API

- [ ] CORS: one address from `CORS_ORIGIN`, the value `*` or an empty one stops the start, an allowed `Origin` gets `Access-Control-Allow-Origin`, `Vary: Origin`, `Access-Control-Expose-Headers: X-Total-Count`, a foreign one gets no `Access-Control-Allow-*`
- [ ] Preflight (`OPTIONS` with `Access-Control-Request-Method`) gives 204 without a token and lists the methods and the headers `Content-Type`, `Authorization`
- [ ] `GET /diagrams?search=`: an empty and a blank text returns all records, a string longer than 80, a non-string (`search[]=a`) and NUL give 400, `%` and `_` are searched as ordinary characters
- [ ] Automated tests `cors-search`, `contract`, `attack`, `resilience`, then the client with the real server through `src/api.js` (checked by specialist 01)

### 4.6 Lab 6 MongoDB, Mongoose (`part2-mongo-work-6cc76b`, `part-2/lab-06-mongodb`)

- [ ] An empty `MONGODB_URI` (alias `MONGO_URI`) gives the message `MONGODB_URI is not set`, with an unreachable database the process stays alive, requests give 503 and `GET /health` gives 503
- [ ] `GET /diagrams` without `limit` returns at most 100 records (unlike labs 1 ... 3), `limit` 1 ... 100, `skip` 0 ... 100000, other values 400
- [ ] `sort` accepts `title`, `-title`, `priority`, `-priority`, `createdAt`, `-createdAt`, equal keys are ordered by `_id`
- [ ] Filters `owner`, `tag` (the array contains the value), `commentAuthor` (nested array), `q` (`$text` index) and their combinations, `X-Total-Count` equals the number of matches
- [ ] An unknown or repeated parameter, `owner[]=x`, `owner[$ne]=x` give 400, `{"$ne":null}` in a body does not act as a query (`sanitizeFilter`)
- [ ] `GET /diagrams/count` and `GET /diagrams/stats` (the `$group` aggregation by notation: `count`, `avgPriority`, `comments`), an empty collection gives `[]`, the values match a manual recount
- [ ] An id of 24 hexadecimal characters: a valid unknown one 404, `abc` and 23 characters 400, `priority` an integer 0 ... 2, `tags` up to 20 of 30 characters, comments up to 100 of 1000 characters
- [ ] Nested documents: `POST /diagrams/:id/comments` 201 (`$push`), `PUT .../comments/:commentId` (positional `$`), `DELETE .../comments/:commentId` (`$pull`), `PUT /diagrams/:id` keeps the comments, `DELETE /diagrams/:id` removes them together
- [ ] 20 parallel comments into one document are not lost (operations on one document are atomic, there are no transactions)
- [ ] Indexes (`getIndexes()`): `owner`, `tags`, `comments.author`, text `title` and `sourceCode`, the log TTL (`expireAfterSeconds` 2592000), `explain()` for `owner`, `tag`, `comments.author` gives `IXSCAN`
- [ ] The log: a document `method`, `path` (without the query string, up to 200 characters, control characters replaced), `createdAt`, a write failure gives an error response
- [ ] `npm run seed` is repeatable without duplicates (replacement by title), the number of documents matches the report
- [ ] Atlas: cluster M0, a user, Network Access, a URI with an encoded password and the database `dslkit`, snapshots of the dashboard and Compass (by the owner by hand)

### 4.7 Lab 7 WebSocket, Socket.IO (`part2-ws-work-ee9b7b`, `part-2/lab-07-websocket`)

- [ ] HTTP: `GET /health` and `GET /limits.json` 200, `POST /login` with `{"username"}` gives `username` and `token`, a name outside the rules (1 ... 24 characters, letters, digits, dot, dash, underscore) gives 400, `GET /login` and `POST /health` give 405 with `Allow`, the pages `404.html` and `500.html` are in the site style
- [ ] Handshake: the token from `/login` is accepted, an expired, forged or foreign-secret one gives `connect_error`, with `REQUIRE_TOKEN=1` a socket without a token is refused
- [ ] A taken name (case-insensitive) is refused, the 201st user and the 21st connection from one address are refused
- [ ] Rooms: `room:join` returns `ok`, `history`, `users`, a repeated join, the 6th room, the 51st member and a wrong room name are refused
- [ ] Presence: `presence:update` arrives on join, leave, `editing` and a dropped connection, the others see `room:joined`, `room:left`, `user:online`, a disconnect frees the name, the address and the rooms
- [ ] Messages: `chat:message` up to 500 characters, the 6th within 2 seconds gets `Too many messages`, `private:message` reaches only the addressee, not oneself, the common limit is 40 events per 2 seconds, a packet above 10000 bytes drops the connection
- [ ] Origin: a foreign page cannot open the socket, a request without `Origin` (a Node client) passes, an address from `ALLOWED_ORIGINS` passes, without it there are no CORS headers
- [ ] Reconnection: stop and start the server, the client returns and joins the same room, presence converges (`connectionStateRecovery` is off on purpose), a quick return under the same name is to be checked against `This username is already taken`
- [ ] History: up to 50 messages per room and 200 rooms in memory, with `MONGODB_URI` it is written to the collection `messages` and survives a restart, no index on `room` was found in the code (verify with `explain()`), a write failure gives `The message could not be saved` without a broadcast
- [ ] `NODE_ENV=production` without `TOKEN_SECRET` or with one shorter than 32 characters stops the start
- [ ] Automated tests `audit`, `features`, `negative-misuse`, `negative`, `secret`, `slow`, `socket`, `stress` (the red `spike: 400 raw sockets` is unstable)

### 4.8 Lab 8 Docker, Compose (`lab28`, `part-2/lab-08-docker`)

- [ ] `npm test` is green but checks only files (`docker.test.mjs`, `hardening.test.mjs`) and does not prove the containers work
- [ ] Build from scratch `docker compose build --no-cache`, the client image holds Nginx and static files without Node.js, the server image runs as the user `node`
- [ ] `docker compose up --build`: `db`, `backend`, `frontend` become `healthy` in the order `db`, `backend`, `frontend`
- [ ] Healthcheck: `pg_isready`, `GET /health` of the server (200 or 503 by the database), `wget` of the client home page, stopping the database (`docker compose stop db`) gives 503 on the server and recovery after the start
- [ ] `GET http://localhost:8080/api/health` through Nginx and `GET http://127.0.0.1:3000/health` directly give `ok`, registration, login and a diagram through `/api` give 201, 200, 401 without a token, the Nginx limit of 10 requests per second with a burst of 20 is verified by the response code
- [ ] `docker compose down`, then `up`: users and diagrams are in place (volume `pgdata`)
- [ ] `docker compose down -v` removes the volume, after `up` the migrations create an empty schema, the administrator appears from `ADMIN_EMAIL`. Destructive, on a disposable project after the owner's "yes"
- [ ] A volume with an old password gives `password authentication failed` and a restart loop of backend, write the solution `down -v` or a separate project into the report
- [ ] Ports by the task: `FRONTEND_PORT=80`, `BACKEND_PORT=5000`, `docker compose ps` shows `80->8080` and `127.0.0.1:5000->3000`, the page on `http://localhost`, a `docker ps` snapshot, busy ports give a clear error
- [ ] Secrets: without `POSTGRES_PASSWORD` and `JWT_SECRET` compose refuses to start with a clear text, `.env.example` has no secret values, `.env` is in `.gitignore` and in both `Dockerfile.dockerignore`, `docker history` and the `ENV` of the images hold no passwords (do not paste the output)
- [ ] Isolation: `read_only`, `cap_drop: ALL`, `no-new-privileges`, the database only in the `internal` network, the database port is not published, pgAdmin listens on 127.0.0.1
- [ ] Profiles: `--profile tools up -d pgadmin` without `PGADMIN_PASSWORD` does not start, `--profile cache up -d redis` passes `redis-cli ping`
- [ ] Memory and process limits on every service, log rotation `10m` by 3 files, Nginx: `server_tokens off`, headers repeated in `/assets/`, `client_max_body_size 100k`, an unknown path returns `index.html`

### 4.9 Practical 1 Express, EJS, log in SQLite (`w-pz21`, `part-2/pz-01-middleware-ejs`, port 3000)

- [ ] `/item/01`, `/item/abc`, `/item/0x1`, `/item/1e0` and 10 digits give 404, not a second address of a record
- [ ] `POST /add` without a CSRF token or with a wrong one gives 403 as a styled page, with a right one 302 to the home page, a guest on `/add` and `/log` without `?auth=1` goes to `/login`
- [ ] The form: empty, spaces only, longer than the limits (`title` 80, `description` 500, `code` 5000), `revision` outside 0 ... 100000 or fractional, a repeated field, control characters give 400 with the field highlighted
- [ ] A body above 20 KB gives 413, more than 20 fields give 400, another method on `/item/:id` gives 405 with `Allow: GET, HEAD`
- [ ] Edit and delete do not change `id` and the creation time, a repeated delete gives 404, clearing the log is only `POST` with CSRF
- [ ] The limits of 300 requests per minute overall and 20 per minute for `POST` give the 429 page, `/health` is not under the limit
- [ ] The log `request_log` (`id`, `created_at`, `method`, `url`, `status`, `duration_ms`): the row appears before the route, `status` and `duration_ms` are added after the response, `url` has no control characters, the length is up to 500, at most 20000 rows
- [ ] `/log/export` and `/log/download`: every file error has its own styled page
- [ ] The 500 page is caused by a real failure: `DB_FILE=package.json/blocked/log.db npm start`, any request gives a styled 500, the second way is to stop the database while the server runs, a log write failure is not silent
- [ ] Automated tests `app`, `edit-delete`, `i18n`, `log-file`, `log-sabotage`, `negative-misuse`, `negative`, `security`, `stress`, rebuild the report for the two red report-build tests (29.10)

### 4.10 Practical 2 REST API (`check-pz22`, `part-2/pz-02-rest-api`, `http://localhost:3000/api`)

- [ ] `users`, `projects`, `diagrams` have six operations each, plus `GET /users/:id/projects`, `GET /projects/:id/diagrams`, `POST /diagrams/:id/publish`, `POST /diagrams/:id/duplicate`
- [ ] The format `{error:{code,message,details}}` and the codes `validation_failed`, `invalid_query`, `not_found`, `conflict`, `payload_too_large`, `too_many_requests`, `unsupported_media_type`, `not_acceptable`
- [ ] The list `{data, meta:{page,limit,total}}`, `limit` 1 ... 100 (default 20), `?limit=101`, `?page=0`, `?page=1e3` give 400
- [ ] `?sort=-title` descending, sorting by `email` and by a non-existent field has no effect or gives 400 (as in `API.md`), equal keys are ordered by `id`, an unknown query key gives 400 `invalid_query`
- [ ] `email` is hidden in the list, does not work in a filter, search and sort, and is visible only in `GET /api/users/:id`
- [ ] Links: a non-existent `ownerId` and `projectId` give 400, deleting an owner of projects and a project with diagrams give 409, e-mail is unique regardless of case and after NFKC (409), `PUT` does not conflict with itself
- [ ] `publish` is idempotent, `duplicate` creates a draft "... (copy)" of at most 80 characters without cutting a surrogate pair
- [ ] `Accept` with a foreign type 406, a non-UTF-8 `charset` and a foreign `Content-Type` 415, a body on `GET`, `HEAD`, `DELETE` is ignored, the quota of 5000 records gives 409 `quota_exceeded`, the limit of 300 requests per minute gives 429
- [ ] `GET /api/openapi.json` 200, the schema matches the real fields, it opens in Swagger UI (snapshot)
- [ ] Automated tests `api`, `negative-misuse`, `redteam-fixes`, `security`, `stress` (77 of 77 on 29.10)

### 4.11 Course project (`angry-goldberg-bca72d`, `course-project/app/server`, 21 endpoints)

- [ ] Auth: `POST /auth/register`, `POST /auth/login` (checks as in 4.4, including 409, 401, 429)
- [ ] Diagrams: `GET`, `POST /diagrams`, `GET`, `PUT`, `PATCH`, `DELETE /diagrams/:id` (owner and admin rights, 403, 404)
- [ ] Comments: `GET`, `POST /diagrams/:id/comments`, `PATCH`, `DELETE /comments/:id` (up to 1000 characters, edit and delete by the author or an admin, verify in the code)
- [ ] Tags: `GET /tags`, `GET`, `POST /diagrams/:id/tags`, `DELETE /diagrams/:id/tags/:tagId`, `DELETE /tags/:id` admin only (403 for the rest), a lowercase name of up to 30 characters, at most 10 tags per diagram, attaching again is idempotent or 409 (verify)
- [ ] Users: `GET /profile`, `GET /users`, `PATCH /users/:id/role`, `DELETE /users/:id` (409 when diagrams exist, 400 when deleting oneself), `GET /health` checks the database
- [ ] Links: comments `CASCADE` by diagram and author, `DiagramTags` with a composite key and `CASCADE` on both sides, deleting a diagram does not delete a tag and the reverse, the indexes `comments_diagram_id`, `comments_author_id`, `diagram_tags_tag_id`, `diagrams_owner_id` exist
- [ ] Docker of the course project (`course-project/app/docker`): build and run as in 4.8, ports 80 and 5000 through `FRONTEND_PORT` and `BACKEND_PORT`
- [ ] The Postman collection is extended to 21 endpoints (now 17 requests without comments and tags)
- [ ] The 22 files in `tests/` are green one at a time (on 29.10 the suites timed out at 240 s), paste the result into the note

### 4.12 Root rendering API (`tools/render-api.js`, `tools/server.js`)

- [ ] `GET /api/notations` (33 notations, `?lang=en`), `GET /api/grammar`, `GET /api/engines` give 200, foreign methods 405 with `Allow`
- [ ] `POST /api/render`, `/api/validate`, `/api/parse`, `/api/generate`: JSON `{source, lang, format}` and `text/plain`, `Accept: image/svg+xml` returns SVG
- [ ] A source of 100000 and 100001 characters (413), a body up to `6 * 100000 + 1024` bytes, more than 2000 lines gives 422 `too-complex`, an unknown notation 422, wrong `lang` and `format` 400 (commit `6bcf386`)
- [ ] Recheck BUG-05 (`diagram constructor`, `diagram __proto__`, 422 expected) and BUG-11 (text without a header, 422 expected, not 200 with an empty IDEF0)
- [ ] Recheck BUG-01 (Kroki cuts the body, the process stays alive, answer 502 or 504) and BUG-02 (`/api/../index.html`, `/api/%2e%2e/index.html` get an answer)
- [ ] Recheck BUG-03 and BUG-04 (800 vertices and 2000 mindmap nodes, time and thread blocking after the linear analysis)
- [ ] Recheck BUG-06 and BUG-07 (security headers of `/api/*`, SVG cleaning), BUG-08 (`MAX_EXTERNAL` 5 000 000, 100 MB is refused)
- [ ] Recheck BUG-09, BUG-10, BUG-12 ... BUG-16 (substring in `Content-Type`, 415, CR, HEAD, slow client, static server details, MIME of the manifest)
- [ ] `/api/external/<language>` for 33 languages: an unknown one (`__proto__`, `constructor`) 404, 405 with `Allow: POST`, `source` is required, the limit, timeout 504 (10 s), 502 on a service error

### 4.13 Database: migrations, seeds, constraints, transactions (on PostgreSQL 16)

- [ ] `npm run db:migrate` on an empty database creates the tables (lab 2 five migrations, lab 3 four, course project six), a repeat changes nothing
- [ ] `npm run db:migrate:undo` rolls back one migration at a time, after each step the schema equals the state before it, the CHECKs stay. `db:migrate:undo:all` leaves an empty database, then `db:migrate` creates the schema again (destructive, disposable database)
- [ ] `addColumn` for `priority` adds and removes the column (a demonstration for the report of lab 2), the rollback of `revision` and `projectId` does not lose the other CHECKs
- [ ] Seed `npm run db:seed`: lab 2 three diagrams, lab 3 an administrator (`ADMIN_EMAIL`, `ADMIN_PASSWORD`), four demo users (`DEMO_USER_PASSWORD`) and diagrams, the course project also comments and tags
- [ ] The seed is repeatable without duplicates, a deleted demo row is restored, `db:seed:undo` does not touch user rows, empty variables skip the seed, a password shorter than 10 characters or longer than 72 bytes stops it
- [ ] CHECK when the API is bypassed (a direct `INSERT` in psql, pgAdmin or DBeaver): `diagrams_notation_check`, `diagrams_priority_check`, `diagrams_title_not_blank`, `diagrams_title_length`, `diagrams_revision_range`, `projects_name_not_blank`, `users_role_check`, `users_email_lowercase_check`, `users_email_length`, `tags_name_lowercase` (compare the other names with the migrations)
- [ ] Uniqueness of `Users.email`, `Projects.name`, `Tags.name` and the composite key of `DiagramTags`: a database error becomes 409, not 500
- [ ] Foreign keys: `Diagrams.projectId` `SET NULL` (lab 2), `Diagrams.ownerId` `RESTRICT` (lab 3, course project), `Comments` `CASCADE`, a reference to a non-existent row is refused
- [ ] Indexes (`\d "Diagrams"`): `diagrams_project_id`, `diagrams_owner_id`, `request_logs_created_at` and the rest exist, `EXPLAIN` of the list uses an index
- [ ] Transactions and rollback: parallel `PATCH` leave a whole record, a failure in the middle of a scenario leaves no partial data (describe where the code has a transaction, record where it has none)

### 4.14 Environment, 500 responses, request log in the DB (even variant 26)

- [ ] `npm test` of labs 2, 3 and the course project is green in a clean copy without `.env` (`git worktree add`), the result is compared with a copy with a filled `.env`
- [ ] The red settings tests with a filled `.env` are recorded as a test isolation defect (cause by reading: `config/config.js` calls `process.loadEnvFile()` and restores the variables the test removed, confirm by a run)
- [ ] Empty required variables give a clear error: `DATABASE_URL`, `JWT_SECRET`, `MONGODB_URI`, `POSTGRES_PASSWORD`, `TOKEN_SECRET` in production
- [ ] `NODE_ENV=production` requires `DATABASE_SSL=true`, turning off certificate checks is forbidden
- [ ] `.env.example` of each work holds all variables without secret values, `.env` is not tracked (`git check-ignore`)
- [ ] No error message prints a connection string, a password or a token (check the console with wrong data)
- [ ] Labs 2, 3 and the course project write a row to `RequestLogs`, lab 6 to a collection, practical 1 to `request_log`, lab 1 by the owner's decision (question 31), lab 7 not applicable
- [ ] The record appears before the route handler, `/health` is not written to the log, the query string, `Authorization`, the body, the password and the token are not written, the path is cleaned and length-limited
- [ ] Retention is limited: lab 2 deletes rows older than 30 days at start and every hour, lab 6 deletes by TTL, practical 1 keeps at most 20000 rows
- [ ] A log write failure is not silent: an error response or a styled page, not success
- [ ] 500 is caused by a real failure (a stopped DB, an unavailable file), not by a button, JSON works answer `Internal server error` without details, and an unavailable database gives 503 (lab 2, lab 6, course project)

### 4.15 Postman and a snapshot of every endpoint (a requirement of the teacher)

- [ ] The collections of labs 1, 2, 3, 6, practical 2 and the course project import without errors, `base` is set, in lab 3 the token is saved after `POST /auth/login`
- [ ] The collection is built from `requests.http` (`node tools/make-postman.js part-2/lab-01-node-server "DSLKit lab 1"`), the files do not differ, in practical 2 the health request uses an absolute address, bring it to `{{base}}`
- [ ] Snapshots of Postman windows (request, code, time, body) are taken by hand for labs 1 ... 3, lab 6, practical 2 (at least five operations) and the course project (21 endpoints), the address is visible, there is a snapshot of the successful (200, 201, 204) and the error (400, 401, 403, 404, 409, 429) codes where they are possible
- [ ] The snapshots in `figures/` and `figures-pg/` made by scripts (`shots/`) are marked as replaceable by Postman windows
- [ ] Lab 7 two client windows, lab 8 `docker ps` and the page on ports 80 and 5000, the DB structure (pgAdmin, DBeaver, Compass) without a password and a full connection string

## 5. How to run

Automated tests of the works, one at a time (every working copy has its own `node_modules`):

```bash
W=/e/DSLKit-Project/.claude/worktrees
for d in w-lab21/part-2/lab-01-node-server check-lab12/part-2/lab-02-sequelize part2-server-labs-87ed8e/part-2/lab-03-auth lab25/part-2/lab-03-auth part2-mongo-work-6cc76b/part-2/lab-06-mongodb part2-ws-work-ee9b7b/part-2/lab-07-websocket lab28/part-2/lab-08-docker w-pz21/part-2/pz-01-middleware-ejs check-pz22/part-2/pz-02-rest-api angry-goldberg-bca72d/course-project/app/server
do (cd $W/$d && npm test)
done
cd /e/DSLKit-Project && node --test tools/render-api.test.js tools/server.test.js
```

Manual run: `npm start` in the work folder, then `curl -i http://localhost:3000/health` or the `requests.http` files in REST Client. PostgreSQL and migrations (labs 2, 3, course project, values in `.env`): `docker compose up -d db`, `npm run db:migrate`, `npm run db:seed`, rolling back one migration `npm run db:migrate:undo`. The commands `db:seed:undo`, `db:reset` and `npx sequelize-cli db:migrate:undo:all` delete data, run them only on a disposable database. MongoDB (lab 6): `npm run seed`, then `npm run dev`, look at the indexes in Compass or mongosh.

Docker (lab 8, a separate project so as not to touch the working volumes):

```bash
cd $W/lab28/part-2/lab-08-docker
docker compose -p dslkit-check build --no-cache
docker compose -p dslkit-check up -d
docker compose -p dslkit-check ps
docker compose -p dslkit-check down
docker compose -p dslkit-check up -d
```

The command `docker compose -p dslkit-check down -v` deletes the volume and the data, run it only on this disposable project and after the owner's "yes". Do not use `docker system prune` and `docker volume rm`.

Root API and the Kulikov protocol (results are written to `docs/testing-kulikov/scripts/results.json`, do not commit without a decision):

```bash
node tools/serve.js site 5195
PORT=5195 node docs/testing-kulikov/scripts/run-all.mjs
node docs/testing-kulikov/scripts/make-report.mjs
```

## 6. Artifacts

| Artifact                                                                                                 | Where to keep it                                                     |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| The filled checklist of section 4 with the date, branch, commit, Node.js, PostgreSQL and Docker versions | a copy of this file in the run protocol                              |
| The table "BUG-01 ... BUG-16: status before 30.10 and now" of the root API                               | `docs/testing-kulikov/31-api-bug-reports.md` after the owner decides |
| New bug reports in the Kulikov format                                                                    | `docs/testing-kulikov/` next to `31-api-bug-reports.md`              |
| Snapshots of Postman, `docker ps`, pgAdmin or DBeaver, Compass, two WebSocket windows                    | `figures/` of the works with captions per the report rules           |
| Summary "by the owner by hand": Postman, Atlas, Docker Hub, ports 80 and 5000                            | `docs/test-plans/00-project-checklist.md`                            |
