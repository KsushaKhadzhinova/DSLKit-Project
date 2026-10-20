# Explanatory Note to the Course Project

> English parallel version of `note.md`. The title page, the assignment and the table of contents are placeholders: they are produced in Word by the university standard. Every `[TODO: ...]` marker must be closed by the owner, the list is in `README.md`. The Russian text is the primary one.

## Title Page

[TODO: title page by the university standard (2024 edition): university, department, topic "Development of the DSLKit web application: a diagrams-as-code editor", discipline "Internet Technologies and Web Programming", student name, group, variant 26, supervisor, Minsk 2026]

## Assignment

[TODO: assignment by the department template: topic, input data, list of questions, deadlines, signatures]

## Table of Contents

[TODO: generated in Word from the headings of this file. For an appendix the table of contents names the section that refers to it, for example "to subsection 3.2"]

## List of Symbols, Abbreviations and Terms

API – Application Programming Interface.

CORS – Cross-Origin Resource Sharing.

CRUD – Create, Read, Update, Delete, the basic operations on records.

DSL – Domain-Specific Language.

ER – Entity-Relationship model.

JWT – JSON Web Token, a token for authentication.

ORM – Object-Relational Mapping.

RBAC – Role-Based Access Control.

REST – Representational State Transfer, an architecture style of web services.

SPA – Single Page Application.

CI/CD – Continuous Integration / Continuous Deployment.

## Introduction

**Relevance.** Diagrams of processes, data and architecture are needed in every development team, but ordinary graphical editors suit teamwork badly. A file with a picture cannot be compared line by line in a version control system, it is hard to check automatically and hard to change in bulk. The diagrams-as-code approach removes the problem: a diagram is described as text in a special language, the text lives in the repository next to the source code, and the picture is drawn automatically. Services of this class are in demand among developers, architects and teachers because they lower the cost of keeping diagrams up to date.

The DSLKit project is conceived as a SaaS editor of diagrams as code for six notations: UML, BPMN, ERD, DFD, IDEF0 and Petri nets. The course project implements the server and client core of such a system: diagram storage, user registration and login, access control and deployment in containers. The visual editor with a preview was built separately in the first part of the discipline as a static site. In the course project it serves as the subject area and as the source of interface requirements.

**Purpose.** To develop the full-featured web application "DSLKit" on a modern stack: a React client, a Node.js and Express server, a PostgreSQL relational database, JWT authentication and a Docker Compose launch.

**Tasks:**

1. Analyze the subject area and formulate functional and non-functional requirements.
2. Design the architecture, the data structure and the REST API, and choose the technology stack.
3. Implement the server side: REST API, database, authentication and authorization.
4. Develop the client side: a React SPA with a responsive interface.
5. Integrate the parts, test them and deploy the application in containers.

**Object and subject of the study.** The object is the process of developing web applications. The subject is the methods and technologies of building SPAs with React, Node.js and PostgreSQL.

**Practical value.** The application can serve as the basis of a diagram storage service for a student group or a small team: each user has a personal set of diagrams, the administrator manages accounts and can fix a record of another user. The server works as a standalone API to which any client can connect, including the editor from the first part of the discipline.

**Structure.** The explanatory note consists of an introduction, three chapters, a conclusion, a list of sources and appendices. Chapter 1 contains the analysis and design of the system. Chapter 2 describes the implementation of the server and client, integration and deployment. Chapter 3 contains the user guide and the test results.

## Chapter 1 Analysis and Design of the System

### 1.1 Subject Area Analysis and Requirements

**The problem.** A developer who keeps diagrams as code faces three groups of tasks. The source text of a diagram has to be stored together with its title and notation, the data of different people has to be separated, and access has to be managed safely. Free online editors usually store data without an account or tie it to a third-party service, so the user does not control who sees the diagrams. In such services, according to the competitor review in the first part of the work, one meets unclear pricing and disabled buttons without an explanation. DSLKit avoids these defects: the account is its own, the rights are explicit, and the input limits are visible to the user and kept in one configuration file.

The subject area is described by three concepts. A user is a person with an email address and a role. A diagram is a record with a title, a notation, DSL source code and a priority, and it has an owner. A request is a unit of the log from which the administrator can reconstruct what happened on the server.

**Functional requirements.** The requirements are written as user stories and collected in Table 1.

Table 1 – Functional requirements (FR)

| No.  | User story                                                                          | Module         |
| ---- | ----------------------------------------------------------------------------------- | -------------- |
| FR1  | A guest can register with an email address and a password                           | Authentication |
| FR2  | A registered user can log in and receive a token                                    | Authentication |
| FR3  | A user can view their profile                                                       | Authentication |
| FR4  | A user can view the list of diagrams and search it by title                         | Diagrams       |
| FR5  | A user can sort the list and get it page by page                                    | Diagrams       |
| FR6  | A user can create a diagram: title, notation, source code, priority                 | Diagrams       |
| FR7  | A user can edit and delete their own diagram                                        | Diagrams       |
| FR8  | A user can see a clear message on a network or server error and retry               | Diagrams       |
| FR9  | An administrator can edit or delete any diagram                                     | Administration |
| FR10 | An administrator can view the list of users                                         | Administration |
| FR11 | An administrator can change the role of another user                                | Administration |
| FR12 | An administrator can delete a user who has no diagrams                              | Administration |

The three functional modules required by the course project condition are named in the last column of Table 1: authentication, diagrams and administration.

**Non-functional requirements.** The key non-functional requirements (NFR) are listed in Table 2.

Table 2 – Non-functional requirements (NFR)

| No.  | Category        | Requirement                                                                                                  |
| ---- | --------------- | ------------------------------------------------------------------------------------------------------------ |
| NFR1 | Security        | A password is stored only as a bcrypt hash, the token is signed with HS256, the secret is at least 32 characters |
| NFR2 | Security        | Login and registration are rate limited, after five failed attempts the email is locked for 15 minutes       |
| NFR3 | Security        | The server does not expose internal errors: the client gets a 500 answer without a stack trace               |
| NFR4 | Reliability     | Input limits (title, code, email, password length) live in `limits.json` and match on the client and server  |
| NFR5 | Reliability     | Huge input does not crash the server: the request body is limited to 100 KB, numbers in requests are checked |
| NFR6 | Performance     | The diagram list is served in pages of at most 100 items, the answer takes under a second on typical data [TODO: measure] |
| NFR7 | Responsiveness  | The interface works from 375 to 1280 pixels wide, touch targets are at least 44 pixels, text is at least 14 pixels |
| NFR8 | Accessibility   | Visible field labels, skip navigation, a theme switch without JavaScript, contrast by WCAG 2.2 AA           |
| NFR9 | Maintainability | Automated tests for the server and client, the whole stack starts with one command                          |

Requirements NFR1 to NFR5 are confirmed by the automated server tests, requirements NFR7 and NFR8 are fixed by the interface rules of the first part of the discipline. The measurement for NFR6 has not been done yet.

### 1.2 Application Architecture Design

**Logical architecture.** The actors of the system are shown in Figure 1. A guest can only register and log in. A user works with their own diagrams and profile. An administrator inherits the rights of a user and additionally manages records and accounts of other people. The source text of the diagram is given in appendix E.

![Use case diagram](diagrams/usecase.svg)

Figure 1 – Use case diagram of DSLKit for a guest, a user and an administrator

**Physical architecture.** The system is described with the C4 model at two levels. The system context is shown in Figure 2: two kinds of people work with one system, and a cloud PostgreSQL database can be connected on request instead of the container.

![System context](diagrams/c4-context.svg)

Figure 2 – C4 level 1 diagram: the context of the DSLKit system

The internal structure is shown in Figure 3. The browser talks to a single address, to Nginx on port 8080. Nginx serves the built React files and forwards requests with the `/api/` prefix to the Express server. Only the server talks to the PostgreSQL database. The database sits in an internal Docker network with no access from outside.

![System containers](diagrams/c4-containers.svg)

Figure 3 – C4 level 2 diagram: containers of DSLKit and the protocols between them

A single entry point through Nginx has two consequences. First, for the browser the client and the server share one origin, so CORS is not needed in the container mode. Second, the server address is not baked into the built client: the build gets the value `/api`.

**REST API design.** The API resources are `auth` (registration and login), `profile`, `diagrams` and `users`. The main endpoints are collected in Table 3. All answers are JSON, errors have the form `{ "error": "...", "details": [...] }`, where `details` lists the fields with a description of the problem.

Table 3 – Main REST API endpoints

| Method | URL                  | Access              | Description and example                                                                                         |
| ------ | -------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`     | everyone            | Registration. Body `{"email","password"}`, answer 201 `{id,email,role,createdAt}`, 400, 409 (email taken)       |
| POST   | `/auth/login`        | everyone            | Login. Body `{"email","password"}`, answer 200 `{token,tokenType,expiresIn}`, 400, 401, 429                      |
| GET    | `/profile`           | token               | Current user, 200 or 401                                                                                        |
| GET    | `/diagrams`          | token               | List. Parameters `search`, `limit` (1–100), `offset`, `sort`, `order`. Header `X-Total-Count`, the answer is an array |
| GET    | `/diagrams/:id`      | token               | One diagram, 200, 400 (bad id), 404                                                                             |
| POST   | `/diagrams`          | token               | Create. Body `{"title","notation","sourceCode","priority"}`, answer 201 and the `Location` header                |
| PUT    | `/diagrams/:id`      | owner or admin      | Full replacement, 200, 400, 403, 404                                                                            |
| DELETE | `/diagrams/:id`      | owner or admin      | Deletion, 204, 403, 404                                                                                         |
| GET    | `/users`             | admin               | List of users without hashes, 200, 403                                                                          |
| PATCH  | `/users/:id/role`    | admin               | Role change. Body `{"role":"admin"}`, 200, 400 (own role or bad value), 404                                     |
| DELETE | `/users/:id`         | admin               | User deletion, 204, 400 (self), 404, 409 (has diagrams) [TODO: check the code against users.test.js]            |
| GET    | `/health`            | everyone            | Server and database check for Docker, 200 `{"status":"ok"}` or 503                                              |

An example request body for creating a diagram is `{"title":"Order","notation":"BPMN","sourceCode":"start -> pay -> ship","priority":"normal"}`. The allowed notations are UML, BPMN, ERD, DFD, IDEF0 and Petri. The allowed priorities are low, normal and high.

### 1.3 Data Structure Design

The database has three tables. The ER diagram is shown in Figure 4, its source text is in appendix E.

![ER diagram](diagrams/er.svg)

Figure 4 – ER diagram of the database: users, diagrams and the request log

The `Users` table stores accounts: a unique lowercase email address, a password hash and the role `user` or `admin`. The `Diagrams` table stores diagrams: a title of up to 80 characters, a notation from a fixed list, source code of up to 10000 characters, a priority and the foreign key `ownerId` to `Users`. The relation is one to many: a user has many diagrams. The foreign key uses the `RESTRICT` rule, so a user cannot be deleted while diagrams belong to them. The `RequestLogs` table stores the request log: method, path, client address and the response status, which is written when the response ends. A log in a table instead of a file is required by the condition of variant 26.

The integrity rules are duplicated in the database itself: a check of the allowed notation, a ban on an empty title or code made of spaces, and a limit on the title length. The table stays correct even if something writes to it bypassing the API. The tables are created by Sequelize migrations, not by `sync()`, so the schema can be rolled back and reproduced.

The course project condition recommends four to six entities. The current schema has three. [TODO: decide with the supervisor or add a fourth entity "Comment" with a `Comments` table and foreign keys to the diagram and the author. The schema variant is in `course-project/diagrams/er-planned.mmd`. Comments on diagrams are already implemented in lab 6 on MongoDB as nested documents but are not included in the main stack.]

## Chapter 2 Implementation of the Web Application

### 2.1 Choice and Justification of the Technology Stack

The comparison of technologies is given in Table 4. The choice follows the course project condition and the experience from the labs of the second part.

Table 4 – Technology choice and justification

| Layer             | Chosen                          | Alternative            | Justification                                                                                        |
| ----------------- | ------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Client            | React 19, Vite, axios           | Vue, Angular           | Component approach, hooks, a large ecosystem, fast Vite build, testing with Vitest                   |
| Server            | Node.js 22, Express 5           | NestJS, Fastify        | One language on the client and the server, a simple middleware chain, Express 5 passes a rejected promise to the error handler |
| Database          | PostgreSQL 16                   | MongoDB                | Transactions, foreign keys and integrity constraints, needed for the user to diagrams relation       |
| ORM               | Sequelize 6 with migrations     | Prisma, TypeORM        | Mature support of PostgreSQL and SQLite, migrations and seeds, used in lab 2                         |
| Authentication    | bcrypt and JWT (HS256)          | Sessions, OAuth        | No session store needed, fits SPA and mobile clients, studied in lab 3                               |
| Containers        | Docker and Docker Compose       | Manual launch          | One launch of the whole stack, reproducibility, network isolation                                    |
| Web server        | Nginx                           | Express serves static files | Static caching, reverse proxy, non-root run in the nginx-unprivileged image                     |
| Tools             | Git, Postman and REST Client, VS Code | –                | Version control, manual API checks, code editor                                                      |

For local development and tests SQLite is used instead of PostgreSQL because it needs no installation. The connection to PostgreSQL is set through the `DATABASE_URL` variable. The check against a real PostgreSQL was done in the container stack of lab 8 [TODO: confirm by a repeated run before the defense].

### 2.2 Server Side Implementation

#### 2.2.1 Project Structure and Setup

The server side lives in the `part-2/lab-03-auth` folder of the repository and is split into layers, as Table 5 shows.

Table 5 – Structure of the server side

| Path                 | Purpose                                                                          |
| -------------------- | -------------------------------------------------------------------------------- |
| `server.js`          | Entry point: reads settings from the environment, checks the database, starts listening |
| `src/app.js`         | Builds the Express application: middleware order and routes                      |
| `src/models/`        | Sequelize models `User`, `Diagram`, `RequestLog` and constants                    |
| `src/routes/`        | Routes `auth`, `diagrams`, `users`                                                |
| `src/controllers/`   | Handlers: all the request logic                                                  |
| `src/middleware/`    | Token and role checks, input validation, rate limiting, CORS, log, error handling |
| `migrations/`, `seeders/` | Database schema and initial data (the administrator from environment variables) |
| `limits.json`        | All input limits in one file                                                     |
| `tests/`             | Automated tests on a temporary database                                          |

The `package.json` file lists dependencies (`express` 5, `sequelize` 6, `bcrypt`, `jsonwebtoken`, `pg`, `sqlite3`) and the scripts `start`, `dev`, `test`, `db:migrate`, `db:seed`. The `engines` field fixes Node.js 22 or newer. Settings are read from `.env`, the sample `.env.example` is in the repository and the `.env` itself is not.

The middleware order in `src/app.js` matters: first CORS and security headers, then the `/health` route (before the log, so Docker probes do not fill the table), then the request log, JSON parsing with a size limit, the content type check, the routes, the unknown route handler and the common error handler. Thanks to this, any error, including a failed write to the log, becomes a well-formed JSON answer.

#### 2.2.2 Data Models and Database Work

The diagram model describes fields and checks. A model example with comments is given in appendix A. String lengths come from `limits.json`, so a limit is changed in one place. The user model hides the password hash: the `toJSON` method returns only public fields, so even an accidental serialization of the object (an answer `res.json(user)`, a log) does not reveal the hash.

#### 2.2.3 REST API Implementation

The diagram controller (a fragment in appendix A) performs the CRUD operations. The list supports a substring search by title (the value is passed as a query parameter, so SQL injection is impossible), sorting only by fields from a whitelist and paging. The total number of records is returned in the `X-Total-Count` header while the body stays an array, so the clients of the earlier labs do not change. Creation takes the owner from the token, not from the request body, so the owner cannot be forged.

Input validation runs before the controller (appendix A): the title and the code are required, blank values are rejected, the length is measured after trimming, the notation and the priority are matched against a list, unknown fields are dropped. The identifier in the address is checked with a strict regular expression, because `Number()` would accept the values `0x1` and `1e0`, and numbers above the `INTEGER` range would cause a PostgreSQL error and a 500 answer. The validation error answer lists the fields with an explanation.

#### 2.2.4 Authentication and Authorization

The JWT scheme has four steps. The client sends the email and the password to `/auth/login`. The server compares the password with the bcrypt hash and signs a token with HS256, the issuer `dslkit`, a lifetime of 1 hour by default (at most 24 hours) and the user identifier. The client stores the token and adds the header `Authorization: Bearer <token>` to every request. On each request the server verifies the signature, the expiry and the issuer, and then reads the user from the database.

The last step is important: the role in the token is only a hint and the decision is made from the database. So deleting an account and changing a role take effect at once, not when the token expires. The check accepts only HS256, so tokens with the algorithm `none` and HS512 are rejected. The code of the token middleware and of `requireRole` is in appendix A.

Authorization follows the RBAC model with two roles. The owner of a diagram or an administrator can change and delete it, user management is open to the administrator only. The role at registration is always `user`, and the first administrator is created by a seed from the `ADMIN_EMAIL` and `ADMIN_PASSWORD` variables. An administrator cannot change the role of or delete themselves, so the system never stays without an administrator.

#### 2.2.5 Error Handling and Security

The security measures are summarized in Table 6.

Table 6 – Security measures of the server side

| Threat                           | Measure                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Password theft from the database | bcrypt hash with 10 rounds, password length from 8 characters and at most 72 bytes                       |
| Discovery of existing emails     | The same answer and the same time for a wrong password and an unknown email (comparison with a fallback hash) |
| Password guessing                | At most 20 logins per address in 15 minutes (answer 429, header `Retry-After`), email lock after 5 failures |
| Registration flooding            | At most 10 registrations per address per hour                                                            |
| Token forgery                    | HS256 only, issuer check, secret of 32 characters or more, the server does not start without a secret    |
| SQL injection                    | Parameterized Sequelize queries, a whitelist of sort fields                                              |
| Foreign request origin           | CORS with a single allowed address, the value `*` is forbidden, the `Vary: Origin` header                |
| Leak of internal data            | Common error handler: on status 500 the client gets only "Internal server error"                         |
| Huge request bodies              | A limit of 100 KB, a length check of every field                                                         |
| Common headers                   | `x-powered-by` is disabled, security headers are added                                                   |

The `helmet` package is not used: the set of security headers is assembled by hand in `src/middleware/http.js` [TODO: check against the code, rephrase for item 2.2.5 of the condition or add `helmet`]. Passwords are written neither to the log nor to answers.

### 2.3 Client Side Implementation

#### 2.3.1 React Application Structure

The client is in the `part-2/lab-05-react-api` folder. `src/components` holds the components `Header`, `Footer`, `AuthForm`, `DiagramForm`, `DiagramItem` and `ErrorBoundary`. `src/hooks` holds the hooks `useDiagrams` (list state) and `useDebouncedValue` (a delayed value for search). `src/utils` holds form validation, and the input limits live in `src/limits.json` and match the server ones. The API service and the interceptors are in `src/api.js`.

#### 2.3.2 Routing

The client of lab 5 is a single page whose content depends on the state: while there is no token, the login and registration form is shown, after login the workspace is shown. There is no separate routing library. Separate public and protected routes with React Router are used in the practical classes of the second part [TODO: decide whether to bring React Router into the course project. If so, describe here the routes `/login`, `/register` and the protected `/diagrams`, then add tests. Item 2.3.2 of the condition requires an example of protected and public routes].

On the Nginx side the SPA falls back to `index.html` for unknown paths, so a direct visit by address and a page reload work.

#### 2.3.3 Key Components and State

The diagram list state is moved to the `useDiagrams` hook. The hook keeps the array of records, the loading and error flags, performs optimistic changes and rolls them back when the server refuses. The helper hook `useDebouncedValue` delays the search request by 400 milliseconds, so the server does not get a request for every key press. The global login state is defined by the presence of the token and by the `auth:logout` event fired on a 401 answer. Client fragments are given in appendix B.

The optimistic update works as follows. When a record is added, the client shows it at once with a temporary identifier `temp-N` and sends the request. If the server succeeds, the temporary record is replaced with the answer. If the server refuses, the record disappears and the user sees a message. A record with a temporary identifier cannot be deleted or changed, and while a request about a record is in progress a repeated action on it is ignored. This removes races on fast clicks.

#### 2.3.4 Server Communication

Communication uses axios with a shared instance: the base address comes from `VITE_API_URL`, the timeout is 8 seconds. The request interceptor adds the token. The response interceptor on a 401 code removes the token and tells the application to show the login form. The list has three states: loading (an indicator), error (a text and the "Retry" button) and data. Search sends a request to the server and cancels the previous one with `AbortController`. The service code is in appendix B.

The token is stored in `localStorage`, as the lab condition requires. The risk is that a script injected into the page can read the token. So the client does not insert markup from data: record texts and server messages are rendered by React as plain text and `dangerouslySetInnerHTML` is not used. The token lifetime is one hour.

#### 2.3.5 Responsive Interface

The look of the client continues the first part of the discipline: the site styles are connected unchanged and the own rules are few. The interface uses Flexbox and Grid layouts, record cards in a grid, a fixed header with a logo and a light and dark theme switch. Sizes are set in `rem` from a fluid root size. The breakpoints are 576, 768 and 1024 pixels. Touch targets are at least 44 pixels, there is one main button per screen and one font, Inter. The layout proportions follow the golden ratio 1 : 1.618.

### 2.4 Integration, Build and Deployment

#### 2.4.1 Client and Server Integration

In development mode the client runs on port 5178 and calls the server on port 3000 directly. For this the server enables CORS with a single allowed origin from the `CORS_ORIGIN` variable. The answer to the preflight request is returned without a token and with code 204. In the container mode the browser talks to one address and CORS is not used: Nginx forwards `/api/` to the server.

#### 2.4.2 Containerization with Docker

The stack is described in the `part-2/lab-08-docker` folder and has three services: `db` (PostgreSQL 16), `backend` (the server) and `frontend` (Nginx with the built client). The full files are in appendix C. The main decisions:

- The server Dockerfile has two stages: the first installs only runtime dependencies with `npm ci --omit=dev`, the second copies them into a clean image. The server runs as the `node` user, not as root.
- The client Dockerfile is multi-stage: the `builder` stage builds the Vite static files, the final image contains only Nginx without Node.js and sources. The `nginx-unprivileged` image is used, it listens on port 8080.
- Every service has a health check. The database is checked with `pg_isready`, the server with the `/health` route, the client with a request to the main page.
- The `depends_on` condition with `service_healthy` sets the start order: the server waits for the database, the client waits for the server. At start the server applies migrations and the administrator seed.
- The `internal` network is marked as internal, it holds the database and the server, so the database is not reachable from outside. The `public` network connects the server and the client. The database port is not published to the host, and the server port is bound to `127.0.0.1`.
- The server runs with `read_only`, `cap_drop: ALL` and `no-new-privileges`.
- Secrets are read from the `.env` file, which is not in the repository. The sample `.env.example` has no values, and empty required values stop the launch.
- If Docker Hub is unavailable, the `REGISTRY` variable substitutes the address of an image mirror.

The result of a launch is shown in Figure 5: all three containers have the healthy status.

![Containers in docker ps](screenshots/05-docker-ps.png)

Figure 5 – Output of the `docker ps` command with the healthy status of the database, server and client containers

#### 2.4.3 Deployment

The main way to run the system is Docker Compose on one machine, described above and in section 3.1. For publishing on the network, following the department recommendation, one can use the free services listed in appendix F: the client on Netlify or GitHub Pages, the server on Render, the database on Neon or Supabase. In this case the `db` service of Compose is not needed, and the connection string and `DATABASE_SSL=true` are set in the environment variables of the platform.

[TODO: choose and perform the cloud deployment (if required), record the application address and the check date. There is no public address now, a placeholder is left in the conclusion.]

#### 2.4.4 Testing

Automated tests are written for both parts. The server is tested with the built-in `node --test` runner on a temporary SQLite database with real migrations, bcrypt runs with four rounds for speed. According to the README of branch 28, the server suite has 92 tests, including checks of `/health`, paging, token security and rate limiting. The client is tested with Vitest and React Testing Library, the suite has 42 tests, among them a test that markup from a server answer is rendered as text. The Docker configuration is checked by six file checks without starting the daemon. [TODO: before the defense run `npm test` in `part-2/lab-03-auth`, `part-2/lab-05-react-api` and `part-2/lab-08-docker` and record the actual numbers and coverage. The numbers above are taken from the branch READMEs and have not been rechecked since this draft was prepared.]

Manual scenarios and control examples are given in subsection 3.2. For manual API checks there is a `requests.http` file for the REST Client extension and the Postman collection `postman_collection.json`.

## Chapter 3 User Guide and Testing

### 3.1 User Guide

**Environment requirements.** The application needs a modern browser: Chrome, Edge or Firefox of current versions [TODO: state the versions it was checked in]. A developer needs Git, Node.js 22 or newer and Docker with Compose v2.

**Starting the application.** Commands for a developer:

1. Clone the repository: `git clone https://github.com/KsushaKhadzhinova/DSLKit-Project`, then switch to branch `28`.
2. Go to `part-2/lab-08-docker` and copy `.env.example` to `.env`.
3. Put into `.env` a database password of letters and digits and a `JWT_SECRET` of at least 32 random characters. The secret is generated with the command given in `.env.example`. Values are never written to the repository.
4. Run `docker compose up --build`. After the start the application is available at `http://localhost:8080` and the server check at `http://localhost:8080/api/health`.
5. Stop the stack with `docker compose down`. The `-v` key removes the database data too.

To run without Docker, start the server in `part-2/lab-03-auth` with `npm install`, `npm run db:migrate`, `npm run dev`, and the client in `part-2/lab-05-react-api` with `npm install`, `npm run dev` (address `http://localhost:5178`).

**Scenario 1. Registration and login.** The user opens the application, sees the login form and goes to registration. They enter an email and a password of at least 8 characters and submit the form. On an error an explanation appears under the field: an empty value, a too long email, a too short password. After registration the user logs in, the token is saved and the workspace opens. The login form is shown in Figure 6.

![Login form](screenshots/01-login.png)

Figure 6 – The login and registration form before the start of work

**Scenario 2. Creating a diagram.** In the workspace the user fills in the form: title, notation, source code and priority, then presses the main button. The record appears in the list at once and gets a permanent identifier after the server answer. The state of the list with several records is shown in Figure 7.

![Diagram list](screenshots/02-list.png)

Figure 7 – The workspace with the list of the user diagrams

The moment of adding a new record is shown in Figure 8.

![Adding a diagram](screenshots/03-add.png)

Figure 8 – Optimistic addition: the new record is shown before the server answer

**Scenario 3. Search, edit and delete.** The search field filters the list by title with a delay of 400 milliseconds. A record title is edited in place: Enter saves, Escape cancels. Deletion removes the record at once and brings it back if the server refuses. If the server is unavailable, a message and the "Retry" button are shown instead of the list, as in Figure 9.

![Load error](screenshots/04-error.png)

Figure 9 – The error message for an unavailable server and the retry button

**Scenario 4. Administration.** The current client has no administrator screen. The administrator works with the `/users` endpoints through Postman or REST Client: gets the list, changes roles and deletes users. [TODO: decide whether an administrator screen in the client is needed in the course project. A mockup "Users admin" exists in `docs/design-contest/part2-screens/`. If the screen is added, complete this scenario with a screenshot.]

### 3.2 Control Examples and Testing

The control examples cover the three modules. The input data for them is collected in appendix D. The column "Actual result" is filled by the owner during a manual run, the expected results are taken from the documentation and the automated tests of the server side.

Table 7 – Control examples

| No. | Input data                                                    | User actions                                        | Expected result                                                  | Actual result                            |
| --- | ------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------- |
| 1   | Email `alice@example.com`, a password of 8 or more characters | Submit the registration form                        | Answer 201, the user has the role `user`, no hash in the answer  | [TODO: Passed / Failed]                  |
| 2   | The same email in another case, `ALICE@example.com`           | Register again                                      | Answer 409, message "A user with this email already exists"      | [TODO: Passed / Failed]                  |
| 3   | A password of 7 characters                                    | Submit the registration form                        | Answer 400, `details` names the field `password`                 | [TODO: Passed / Failed]                  |
| 4   | Correct email and password                                    | Log in                                              | Answer 200, the body has `token`, `tokenType: Bearer`, `expiresIn: 1h` | [TODO: Passed / Failed]            |
| 5   | Correct email, wrong password                                 | Log in                                              | Answer 401 "Invalid email or password", the same as for an unknown email | [TODO: Passed / Failed]          |
| 6   | Six wrong passwords in a row for one email                    | Repeat the login                                    | After the fifth failure the answer is 429 with `Retry-After`     | [TODO: Passed / Failed]                  |
| 7   | A request without the `Authorization` header                  | `GET /diagrams`                                     | Answer 401 "Missing Bearer token"                                | [TODO: Passed / Failed]                  |
| 8   | User token, title "Order", notation BPMN, code                | Create a diagram                                    | Answer 201, `Location` header, the owner is the user             | [TODO: Passed / Failed]                  |
| 9   | A title made of spaces                                        | Create a diagram                                    | Answer 400, field `title`: a non-empty string                    | [TODO: Passed / Failed]                  |
| 10  | A title longer than 80 characters                             | Create a diagram                                    | Answer 400, field `title`: at most 80 characters                 | [TODO: Passed / Failed]                  |
| 11  | Two diagrams, one has the word "Order" in the title           | `GET /diagrams?search=Order`                        | One record in the answer, `X-Total-Count` equals 1               | [TODO: Passed / Failed]                  |
| 12  | The parameter `limit=1000`                                    | `GET /diagrams?limit=1000`                          | Answer 400, field `limit`: from 1 to 100                         | [TODO: Passed / Failed]                  |
| 13  | Token of the second user, diagram of the first                | `DELETE /diagrams/:id`                              | Answer 403, the diagram stays                                    | [TODO: Passed / Failed]                  |
| 14  | Administrator token, the same diagram                         | `DELETE /diagrams/:id`                              | Answer 204                                                       | [TODO: Passed / Failed]                  |
| 15  | Token of an ordinary user                                     | `GET /users`                                        | Answer 403 "Requires the admin role"                             | [TODO: Passed / Failed]                  |
| 16  | Administrator token, the administrator own identifier         | `PATCH /users/:id/role` with the value `user`       | Answer 400, changing the own role is forbidden                   | [TODO: Passed / Failed]                  |
| 17  | A stopped database                                            | `GET /health`                                       | Answer 503 `{"status":"unavailable"}`                            | [TODO: Passed / Failed]                  |
| 18  | A stopped server, the workspace is open                       | Refresh the list in the client                      | An error message and the "Retry" button, Figure 9                | [TODO: Passed / Failed]                  |

A screenshot of the test run and the `npm test` output are placed in appendix G or in the main text after the run [TODO: attach the test output with the number of passed tests and the coverage].

**Conclusion on compliance with the requirements.** The functional requirements FR1 to FR12 are implemented at the API level and covered by the automated tests of the server side. Requirements FR1 to FR8 are available in the client interface too, requirements FR9 to FR12 only through a REST client. Full screenshots of all screens are collected in appendix G. The non-functional requirements on security and input limits are met and checked by tests. NFR6 (performance) and a part of NFR8 (accessibility) are not confirmed by measurement: they need measurements. [TODO: after filling in Table 7 update the conclusion with the actual results.]

## Conclusion

In the course of the work all tasks have been solved: the subject area has been analyzed and 12 functional and 9 non-functional requirements have been formulated, the architecture by the C4 model, a REST API of 12 endpoints and a data schema of three tables have been designed, and the server side with JWT authentication and a role model, a React client and a container launch of the whole stack with one command have been implemented.

The purpose of the work, the development of the web application "DSLKit", has been achieved. The result is a working web application that starts with `docker compose up --build` and is available locally at `http://localhost:8080` [TODO: if a cloud deployment is made, give the public address]. The application implements registration and login, diagram storage with search, sorting and paging, separation of the rights of the owner and the administrator, a request log in the database and a service health check.

Limitations of the work: there is no logout with token revocation and no refresh tokens, the rate limit counters are kept in the memory of one server instance, so scaling to several instances is not supported, and the administrator has no screen in the client.

In the future one can add a diagram preview in the client through the Kroki service, comments on diagrams (a MongoDB prototype exists in lab 6), real-time collaborative editing (a WebSocket prototype exists in lab 7), an administrator screen, token revocation, integration with the editor from the first part of the discipline and graphical support of all six notations.

## List of Sources

1. Express. Documentation [Electronic resource]. – URL: https://expressjs.com. – Accessed: [TODO: date].
2. Node.js Documentation [Electronic resource]. – URL: https://nodejs.org/docs/latest/api/. – Accessed: [TODO: date].
3. React. Learn React [Electronic resource]. – URL: https://react.dev/learn. – Accessed: [TODO: date].
4. Vite. Guide [Electronic resource]. – URL: https://vite.dev/guide/. – Accessed: [TODO: date].
5. Sequelize. Documentation, version 6 [Electronic resource]. – URL: https://sequelize.org/docs/v6/. – Accessed: [TODO: date].
6. PostgreSQL 16 Documentation [Electronic resource]. – URL: https://www.postgresql.org/docs/16/. – Accessed: [TODO: date].
7. Axios. Documentation [Electronic resource]. – URL: https://axios-http.com/docs/intro. – Accessed: [TODO: date].
8. Docker. Docker Compose documentation [Electronic resource]. – URL: https://docs.docker.com/compose/. – Accessed: [TODO: date].
9. Nginx. Documentation [Electronic resource]. – URL: https://nginx.org/en/docs/. – Accessed: [TODO: date].
10. RFC 7519. JSON Web Token (JWT). – IETF, 2015 [Electronic resource]. – URL: https://www.rfc-editor.org/rfc/rfc7519. – Accessed: [TODO: date].
11. RFC 9110. HTTP Semantics. – IETF, 2022 [Electronic resource]. – URL: https://www.rfc-editor.org/rfc/rfc9110. – Accessed: [TODO: date].
12. OWASP Cheat Sheet Series [Electronic resource]. – URL: https://cheatsheetseries.owasp.org. – Accessed: [TODO: date].
13. OWASP Application Security Verification Standard 4.0 [Electronic resource]. – URL: https://owasp.org/www-project-application-security-verification-standard/. – Accessed: [TODO: date].
14. Brown, S. The C4 model for visualising software architecture [Electronic resource]. – URL: https://c4model.com. – Accessed: [TODO: date].
15. Mermaid. Diagram syntax [Electronic resource]. – URL: https://mermaid.js.org. – Accessed: [TODO: date].
16. W3C. Web Content Accessibility Guidelines (WCAG) 2.2 [Electronic resource]. – URL: https://www.w3.org/TR/WCAG22/. – Accessed: [TODO: date].
17. MDN Web Docs. Cross-Origin Resource Sharing (CORS) [Electronic resource]. – URL: https://developer.mozilla.org/docs/Web/HTTP/CORS. – Accessed: [TODO: date].
18. Vitest. Guide [Electronic resource]. – URL: https://vitest.dev/guide/. – Accessed: [TODO: date].
19. DSLKit project repository [Electronic resource]. – URL: https://github.com/KsushaKhadzhinova/DSLKit-Project. – Accessed: [TODO: date].
20. [TODO: add one or two books not older than 5 years from the curriculum list and 1–2 recent articles (2022–2026). Format by the state standard or the university standard, 2024 edition.]

## Appendix A (mandatory) Server Side Code Fragments

The appendix contains key fragments of the server side from `part-2/lab-03-auth` (repository branch `23`, carried over to branches `25` and `28`). It is referred to in subsections 2.2.2, 2.2.3 and 2.2.4.

The diagram model `src/models/diagram.js`:

```js
const { DataTypes } = require('sequelize');
const { NOTATIONS, PRIORITIES, DEFAULT_PRIORITY, LIMITS } = require('./diagram.constants');

// The table is created by migrations, never by sequelize.sync().
const defineDiagram = (sequelize) =>
  sequelize.define('Diagram', {
    title: { type: DataTypes.STRING(LIMITS.title), allowNull: false, validate: { len: [1, LIMITS.title] } },
    notation: { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [NOTATIONS] } },
    sourceCode: { type: DataTypes.TEXT, allowNull: false, validate: { len: [1, LIMITS.sourceCode] } },
    priority: { type: DataTypes.STRING(10), allowNull: false, defaultValue: DEFAULT_PRIORITY, validate: { isIn: [PRIORITIES] } },
    ownerId: { type: DataTypes.INTEGER, allowNull: false },
  });

module.exports = { defineDiagram };
```

Input validation `src/middleware/validate.js` (fragment):

```js
// Text is checked after trimming, so the stored value is what was measured.
const text = (name) => (v) => {
  if (typeof v !== 'string' || v.trim() === '') return 'must be a non-empty string';
  return v.trim().length <= LIMITS[name] || `must be at most ${LIMITS[name]} characters`;
};

const checks = {
  title: text('title'),
  notation: (v) => NOTATIONS.includes(v) || `must be one of ${NOTATIONS.join(', ')}`,
  sourceCode: text('sourceCode'),
  priority: (v) => PRIORITIES.includes(v) || `must be one of ${PRIORITIES.join(', ')}`,
};

// The raw text is checked first because Number() would accept '0x1', '1e0' and ' 1'.
const parseId =
  (key = 'diagramId', label = 'Diagram') =>
  (req, _res, next) => {
    const id = Number(req.params.id);
    if (!/^[1-9]\d*$/.test(req.params.id) || id > MAX_ID) return next(badRequest(`${label} id must be a positive integer up to ${MAX_ID}`));
    req[key] = id;
    return next();
  };
```

The diagram controller `src/controllers/diagrams.controller.js` (fragment):

```js
// Only the owner or an admin may change or delete a diagram.
const mayChange = (user, diagram) => user.role === 'admin' || diagram.ownerId === user.id;

const createDiagramsController = ({ Diagram }) => ({
  list: async (req, res, next) => {
    const { search } = req.query;
    if (search !== undefined && (typeof search !== 'string' || search.trim().length > LIMITS.title)) {
      return next(badRequest(`search must be a string of at most ${LIMITS.title} characters`));
    }
    const term = (search ?? '').trim();
    const where = term ? { title: { [Op.like]: `%${term}%` } } : undefined;
    const { limit, offset, sort, order } = parseListQuery(req.query, SORTABLE);
    const { count, rows } = await Diagram.findAndCountAll({ where, order: [[sort, order.toUpperCase()], ['id', 'ASC']], limit, offset });
    res.set('X-Total-Count', String(count));
    return res.json(rows);
  },

  create: async (req, res) => {
    const diagram = await Diagram.create({ ...req.diagramFields, ownerId: req.user.id });
    res.status(201).location(`/diagrams/${diagram.id}`).json(diagram);
  },

  remove: async (req, res, next) => {
    const diagram = await Diagram.findByPk(req.diagramId);
    if (!diagram) return next(missing(req.diagramId));
    if (!mayChange(req.user, diagram)) return next(forbidden('Only the owner or an admin can delete this diagram'));
    await diagram.destroy();
    return res.status(204).end();
  },
});
```

Token and role check `src/middleware/auth.js`:

```js
// Verifies the Bearer token, then loads the user so a deleted account or a changed role takes effect at once.
const createAuthenticate =
  ({ User }, { jwtSecret }) =>
  async (req, _res, next) => {
    const token = bearerToken(req);
    if (!token) return next(unauthorized('Missing Bearer token'));
    let payload;
    try {
      payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'], issuer: ISSUER });
    } catch (error) {
      return next(unauthorized(error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'));
    }
    const user = await User.findByPk(payload.id);
    if (!user) return next(unauthorized('User no longer exists'));
    req.user = { id: user.id, email: user.email, role: user.role };
    return next();
  };

const requireRole = (role) => (req, _res, next) => (req.user.role === role ? next() : next(forbidden(`Requires the ${role} role`)));
```

Protected routes `src/routes/diagrams.routes.js`:

```js
router.route('/').get(authenticate, controller.list).post(authenticate, validateDiagram, controller.create).all(allowMethods(['GET', 'POST']));
router
  .route('/:id')
  .get(authenticate, parseId(), controller.get)
  .put(authenticate, parseId(), validateDiagram, controller.replace)
  .delete(authenticate, parseId(), controller.remove)
  .all(allowMethods(['GET', 'PUT', 'DELETE']));
```

## Appendix B (mandatory) Client Side Code Fragments

The appendix contains client fragments from `part-2/lab-05-react-api` (branch `25`). It is referred to in subsections 2.3.3 and 2.3.4.

The API service `src/api.js` (fragment):

```js
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000', timeout: 8000 });

// Every request carries the JWT saved after login.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired or rejected token ends the session: the token is removed and the app is told to show the login form.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      clearToken();
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  },
);

export const register = (email, password) => api.post('/auth/register', { email, password });
export const login = (email, password) => api.post('/auth/login', { email, password });
```

[TODO: add a fragment of the `useDiagrams.js` hook (optimistic add with rollback) from `part-2/lab-05-react-api/src/hooks/useDiagrams.js` and one component with `useState` and `useEffect`, if the supervisor requires a component example in the appendix.]

## Appendix C (mandatory) Docker Configuration

The appendix contains the launch files from `part-2/lab-08-docker` (branch `28`). It is referred to in subsection 2.4.2.

The `docker-compose.yml` file:

```yaml
name: dslkit

services:
  db:
    image: ${REGISTRY:-}library/postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-dslkit}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in .env}
      POSTGRES_DB: ${POSTGRES_DB:-dslkit}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks: [internal]
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}']
      interval: 5s
      timeout: 3s
      retries: 10

  backend:
    build:
      context: ../lab-03-auth
      dockerfile: ../lab-08-docker/backend/Dockerfile
    restart: unless-stopped
    environment:
      PORT: 3000
      DATABASE_URL: postgres://${POSTGRES_USER:-dslkit}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-dslkit}
      JWT_SECRET: ${JWT_SECRET:?set JWT_SECRET in .env, at least 32 random characters}
      CORS_ORIGIN: http://localhost:${FRONTEND_PORT:-8080}
      TRUST_PROXY: '1'
    depends_on:
      db:
        condition: service_healthy
    ports:
      - '127.0.0.1:${BACKEND_PORT:-3000}:3000'
    read_only: true
    tmpfs: [/tmp]
    cap_drop: [ALL]
    security_opt: ['no-new-privileges:true']
    networks: [internal, public]

  frontend:
    build:
      context: ../lab-05-react-api
      dockerfile: ../lab-08-docker/frontend/Dockerfile
      additional_contexts:
        deploy: ./frontend
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - '${FRONTEND_PORT:-8080}:8080'
    networks: [public]

networks:
  internal:
    internal: true
  public:

volumes:
  pgdata:
```

The `backend/Dockerfile` file:

```dockerfile
ARG REGISTRY=

FROM ${REGISTRY}library/node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM ${REGISTRY}library/node:22-alpine
WORKDIR /app
ENV PORT=3000
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["sh", "-c", "npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all && exec node server.js"]
```

The `frontend/Dockerfile` file:

```dockerfile
ARG REGISTRY=

FROM ${REGISTRY}library/node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM ${REGISTRY}nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=deploy nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

The `frontend/nginx.conf` file:

```nginx
server {
  listen 8080;
  root /usr/share/nginx/html;
  index index.html;

  location /api/ {
    proxy_pass http://backend:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 15s;
  }

  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  location / {
    try_files $uri /index.html;
  }
}
```

## Appendix D (mandatory) Test Input Data

The appendix contains the data for the control examples of Table 7. It is referred to in subsection 3.2. The passwords below are conditional and have nothing to do with real accounts.

Table 8 – Input data for the control examples

| Purpose                     | Data                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| User 1                      | email `alice@example.com`, password `correct horse 42`                                     |
| User 2                      | email `bob@example.com`, password `battery staple 77`                                      |
| Administrator               | created by the seed from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, the owner enters the values |
| Diagram to create           | `{"title":"Order","notation":"BPMN","sourceCode":"start -> pay -> ship","priority":"normal"}` |
| Title of spaces             | `"   "`                                                                                    |
| Title of 81 characters      | a string of 81 letters `a`                                                                 |
| Wrong password              | `wrong password 1`                                                                         |
| Short password              | `1234567`                                                                                  |

## Appendix E (mandatory) Mermaid Source Text of the Diagrams

The appendix contains the source text of the diagrams of Figures 1 to 4. It is referred to in subsections 1.2 and 1.3. The files are in `course-project/diagrams/`, the pictures are built with `npx @mermaid-js/mermaid-cli -i file.mmd -o file.svg`.

The use case diagram:

```mermaid
flowchart LR
  guest(["Guest"])
  user(["User"])
  admin(["Administrator"])
  subgraph sys ["DSLKit: managing diagrams as code"]
    uc1("Register")
    uc2("Log in and get a token")
    uc3("View the profile")
    uc4("View the diagram list: search, sort, pages")
    uc5("Open a diagram")
    uc6("Create a diagram")
    uc7("Edit an own diagram")
    uc8("Delete an own diagram")
    uc9("Edit or delete a diagram of another user")
    uc10("View the list of users")
    uc11("Change the role of a user")
    uc12("Delete a user")
  end
  guest --- uc1
  guest --- uc2
  user --- uc3
  user --- uc4
  user --- uc5
  user --- uc6
  user --- uc7
  user --- uc8
  admin --- uc9
  admin --- uc10
  admin --- uc11
  admin --- uc12
  admin -. "inherits rights" .-> user
```

The C4 diagram, system context:

```mermaid
C4Context
  title DSLKit system context (level 1)
  Person(user, "User", "Stores diagrams as code and manages them in the browser")
  Person(admin, "Administrator", "Manages users and diagrams of other people")
  System(dslkit, "DSLKit", "Web application: diagram storage, registration, JWT login, roles")
  System_Ext(cloud_db, "Cloud PostgreSQL", "Neon or Supabase, optional: instead of the database container")
  Rel(user, dslkit, "Works with diagrams", "HTTPS, browser")
  Rel(admin, dslkit, "Manages users", "HTTPS, browser or REST client")
  Rel(dslkit, cloud_db, "Reads and writes data", "PostgreSQL, TLS")
```

The C4 diagram, containers:

```mermaid
C4Container
  title DSLKit containers (level 2)
  Person(user, "User", "Browser")
  Person(admin, "Administrator", "Browser or REST client")
  System_Boundary(dslkit, "DSLKit, docker compose") {
    Container(spa, "SPA", "React 19, Vite, axios", "Login and registration forms, diagram list, optimistic changes")
    Container(proxy, "Web server and proxy", "Nginx unprivileged, port 8080", "Serves static files, forwards /api/ to the server")
    Container(api, "REST API", "Node.js 22, Express 5, Sequelize 6, port 3000", "bcrypt and JWT authentication, roles, diagram CRUD, request log, /health")
    ContainerDb(db, "Database", "PostgreSQL 16, volume pgdata", "Tables Users, Diagrams, RequestLogs")
  }
  Rel(user, proxy, "Opens the site", "HTTP 8080")
  Rel(admin, proxy, "Calls /api/users", "HTTP 8080")
  Rel(proxy, spa, "Serves built files", "static")
  Rel(spa, proxy, "Requests /api/*", "JSON, Bearer JWT")
  Rel(proxy, api, "Forwards requests", "HTTP, public network")
  Rel(api, db, "SQL via Sequelize", "TCP 5432, internal network")
```

The ER diagram:

```mermaid
erDiagram
  USERS ||--o{ DIAGRAMS : "owns (ownerId, RESTRICT)"
  USERS {
    int id PK
    string email UK "up to 254 characters, lowercase"
    string passwordHash "bcrypt, 60 characters"
    string role "user or admin"
    datetime createdAt
    datetime updatedAt
  }
  DIAGRAMS {
    int id PK
    string title "1..80 characters"
    string notation "UML, BPMN, ERD, DFD, IDEF0, Petri"
    text sourceCode "1..10000 characters"
    string priority "low, normal, high"
    int ownerId FK
    datetime createdAt
    datetime updatedAt
  }
  REQUEST_LOGS {
    int id PK
    string method
    string path "up to 200 characters"
    string ip
    int status "may be empty"
    datetime createdAt
    datetime updatedAt
  }
```

## Appendix F (mandatory) Recommendations on Free Services

The appendix repeats the department recommendations for students from Belarus. It is referred to in subsection 2.4.3.

Client hosting: Netlify or GitHub Pages. Server and database hosting: Render or Supabase. Databases: PostgreSQL on Supabase, Neon or Render, MongoDB on Atlas. Continuous integration: GitHub Actions. Error tracking: GlitchTip. Web analytics: Yandex Metrica, Plausible or Rybbit. [TODO: keep only what the project really uses.]

## Appendix G (mandatory) Screenshots and Test Output

It is referred to in subsections 3.1 and 3.2.

[TODO: full screenshots of all screens, the `npm test` output of the server and the client, the `docker compose up` output and the `/api/health` page. The screenshots before the final interface look, that is Figures 5 to 9 in the text, are prepared from labs 5 and 8 and are to be replaced after the client is brought to the look of the first part of the discipline.]
