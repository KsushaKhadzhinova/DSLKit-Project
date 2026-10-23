# Project state and how to continue

Russian version: [`PROJECT-STATE.md`](PROJECT-STATE.md). This document is written for anyone who continues the work: the owner, a colleague or a helper. It gathers everything needed to start without questions: the goal, the rules, the branch map, the state of every work, commands, environment traps, decisions taken, open questions and the plan. Detailed study guides for each work are in [`study/`](study/).

State as of 23 October 2026.

## 1 Goal and context

- A BSUIR student, the course "Internet technologies and web programming" (ITiVP), **variant 26 (even)**. All works use one theme, DSLKit: a web editor of "diagrams as code" (IDEF0, DFD, ERD, BPMN, UML, Petri nets and others, 27 notations in all).
- Part 1: eight labs (network, environment, semantic HTML, responsive CSS, JavaScript and DOM, API and storage, React components, tests). Result: the site in `site/`.
- Part 2: eight labs (Node.js, Sequelize, authentication, React state, React and a server, MongoDB, WebSocket, Docker), four practicals (middleware and EJS, REST API design, routing, Context and reducer) and a course project.
- At the defence the teacher asks questions about the code and asks to write code live. So every work has a study guide in [`study/`](study/): what the work does, how it is built, likely questions, "write it live" exercises.
- The assignments are in [`../materials`](../materials/README.md) (text copies next to the PDFs).

## 2 The owner's rules (mandatory)

1. Commits only under the owner's name, messages in English, **no foreign signatures or tool marks** (not in a commit text, not in signatures, not in branch or file names, not in documents).
2. Nothing is merged into `main` without the owner's decision. The order the owner approved: first every work branch is published on its own, then the branches are merged into `main`.
3. Secrets (passwords, keys, connection strings) only in `.env` on the owner's machine, never in chat and never in the repository. Only `.env.example` files are committed.
4. Reports and READMEs only in Markdown, **Russian and English versions at the same time**.
5. The design of Part 2 is identical to Part 1 (one CSS package, one set of tokens `site/css/variables.css`). The owner rejected new style variants.
6. Every work is covered by tests. For Part 1 `npm test` enforces 100% of lines, branches and functions. For Part 2 every work has its own `npm test` together with a report check.
7. Reports are checked by the strict linter `tools/lint-report.js`: headings, captions "Рисунок N – …" and "Таблица N – …", no semicolons, no filler words, no code blocks outside appendices. After a code change the report must be rebuilt, otherwise the report test fails.
8. Explain questions to the owner in plain language with an example. Answers come as numbers.

## 3 Repository map

| What | Where |
| --- | --- |
| Part 1 site (RU in the root, EN in `site/en/`) | `site/` |
| Part 1 labs | `labs/01-network` … `labs/08-frontend-testing` |
| React app of Part 1 labs 7 and 8 | `react-app/` |
| Shared tools (report build, report linter, a server for screenshots) | `tools/` |
| Part 2 works | `part-2/<folder>/`, each in its own branch |
| Editor mockups (432 frames), Part 2 screens, contact sheets | `docs/design-contest/` |
| Study guides | `docs/study/` |
| Notes, teacher requirements, forecast of extras | `docs/notes/` |
| Project archive (overview, design tokens, A/B results) | `docs/project/` |
| Assignments | `materials/` |

### Branches

| Work | Branch | Folder inside `part-2/` | Tests |
| --- | --- | --- | --- |
| Part 1 (site, labs 1–8) | `work/part1-finish` | not applicable | 526 |
| Lab 1 Express, array | `lab21` | `lab-01-node-server` | 67 |
| Lab 2 Sequelize | `lab12` | `lab-02-sequelize` | 101 |
| Lab 3 Authentication | `23` | `lab-03-auth` | 125 |
| Lab 4 React state | `24` | `lab-04-react-state` | 87 |
| Lab 5 React and a server | `25` | `lab-05-react-api` (+ the server `lab-03-auth` with CORS and search) | 100 client, 135 server |
| Lab 6 MongoDB | `26` | `lab-06-mongodb` | 136 |
| Lab 7 WebSocket | `27` | `lab-07-websocket` | 90 |
| Lab 8 Docker | `28` | `lab-08-docker` (+ copies of labs 1–5 from branch 25) | 11 |
| P1 Middleware and EJS | `pz21` | `pz-01-middleware-ejs` | 103 |
| P2 REST API | `pz22` | `pz-02-rest-api` | 69 |
| P3 Routing | `pz23` | `pz-03-routing` | 91 |
| P4 Context and reducer | `pz24` | `pz-04-context-reducer` | 65 |
| Course project | `course-project` | `course-project/` (note and diagrams) | not applicable |

Part 2 branches carry overlapping copies of earlier works (for example `25` holds labs 1–5 and `28` the same plus lab 8). The state of the "oldest" branch counts as current, and where lab 3 differs the version from branch `25` is taken (it has CORS and the `?search=` parameter).

## 4 What is done in each work

Details are in the guides [`study/10`–`study/21`](study/), overviews in [`study/30`](study/30-PART1-ITIVP-OVERVIEW.en.md) (Part 1), [`study/31`](study/31-PART2-ITIVP-OVERVIEW.en.md) (Part 2) and [`study/32`](study/32-COURSE-PROJECT.en.md) (course project).

- **Part 1.** 27 notations, 4 rendering engines (Graphviz, Mermaid, PlantUML through the Kroki service, and an own engine in the browser), light and dark themes, Russian and English, an offline cache. On a service error the old drawing is hidden. The diagram field is blurred while drawing. Three large render functions are split into small ones. Security: a strict CSP, cleaning of foreign SVG, output through `textContent`.
- **Labs 1–3.** A REST API of diagrams on Express: layers, input checked at the edges, one error format, `PATCH`, a `createdAt` field, a `?notation=` filter and `?q=` search, paging and sorting, graceful stop, ESLint. Lab 2 adds a database, migrations, a one-to-many link and 409. Lab 3 adds bcrypt, JWT, roles and a login lock (limits in `limits.json`). The reports have an architecture paragraph.
- **Lab 4.** `useState`, `useEffect`, `localStorage`: a damaged record is dropped on its own, a notation filter, `memo`, `maxLength`.
- **Lab 5.** An axios client: optimistic updates with rollback, cancelling outdated requests, debounced search, "Load more", notation editing, automatic retry of the list read. `App.jsx` is split into the `useSession` hook, a screen and small components.
- **Lab 6.** Mongoose: embedded documents, indexes, aggregation, `PATCH`, sorting, a counter, text search, a log to a collection. The copies of labs 1 and 2 in the branch are replaced with the current ones.
- **Lab 7.** Socket.IO: rooms, presence, chat, private messages, a login token, an `Origin` check, history in memory or MongoDB.
- **Lab 8.** Three containers (Nginx with React, Express, PostgreSQL), healthchecks, a closed internal network, memory and process limits, log rotation, optional pgAdmin and Redis through Compose profiles.
- **P1.** Express and EJS: middleware order, CSRF, a request log in a SQLite table, form validation, 404 and 500 pages, `/health`, edit, delete and clear-log buttons.
- **P2.** Three linked resources, a schema as the single source of rules, filters, search, sorting, paging, nested routes, limits in `limits.json`, the email hidden in the general list, an OpenAPI description at `/api/openapi.json`.
- **P3.** React Router 7: protected routes and roles, a catalogue filter in the address, lazy loading, breadcrumbs, `basename` and a `HashRouter` mode chosen at build time.
- **P4.** Context and `useReducer`: two contexts (data and `dispatch`), quantity in favorites, undo and redo, a "prop drilling" block with the problem and the solution.
- **Course project.** The note and diagrams in the `course-project` branch; test counts and checks in the text match the code.

## 5 Decisions taken

- On a rendering service error the canvas hides the old drawing and keeps a message and a retry button.
- Lab 4: if one stored record is damaged, only it is dropped.
- P2: the email is hidden in the general user list and cannot be used to filter or search.
- P1: control characters in a title are refused, and other methods on a record address give 405.
- The mockups (51 MB) stay in Git.
- For the even variant the request log is written to a database table or collection (labs 2, 3, 6, P1).
- `connectionStateRecovery` is not enabled in lab 7: a recovered socket would return to its rooms, while the server's own state (who is in which room, who is online) is kept separately and would diverge. Enabling it needs a rewrite of the server state. The answer to the reconnection question is prepared in the lab 7 guide.

## 6 How to work

```bash
npm install
npm test                         # Part 1: all tests with the 100% coverage threshold
npm run lab3:report              # rebuild the report of lab N of Part 1
node tools/build.js part-2/lab-05-react-api   # rebuild the report of a Part 2 work
cd part-2/lab-03-auth && npm install && npm test
cd part-2/lab-08-docker && docker compose up --build
```

To work with several branches at once, separate working folders are handy: `git worktree add ../dslkit-lab25 25`. Every Part 2 work has its own dependencies, so `npm install` is needed in its folder.

## 7 Environment traps

- Windows 11, Git Bash and PowerShell. Large heredocs with Cyrillic, backslashes and apostrophes break in Bash: create files with such strings in an editor, not by a shell command.
- In edits through the shell and some editors, sequences like `​` turn into real characters. For such strings build the backslash in code.
- Python on Windows writes files with CRLF. `.gitattributes` sets LF in the project.
- A report with inserted code fails its test until it is rebuilt (`node tools/build.js …`).
- Client tests (Vitest) can fail on a timeout while the computer is busy (for example while Docker Desktop starts). Run them again.
- The Kroki service sometimes answers with errors and timeouts. Mermaid frames are re-shot with `node docs/design-contest/shoot-mockups.mjs docs/design-contest/mockups "" mermaid`, then `node docs/design-contest/contact-sheets.mjs` (they need `puppeteer-core` from the lab 7 folder and Chrome).
- Docker Desktop on this computer starts slowly (up to several minutes), and `docker desktop stop` can hang.

## 7.1 Screenshots

The shooting scripts take `puppeteer-core` from `part-2/lab-07-websocket` and Chrome from its default path. The path to `puppeteer-core` is set by the variable `LAB7_DIR`, by default `part-2/lab-07-websocket` next to the repository. The site for shooting is started with `node tools/serve.js site 5173`.

## 8 What is left

### Owner only
- Postman screenshots (labs 1–3, P2, at least five operations) and the database structure (pgAdmin or DBeaver).
- PostgreSQL for labs 2 and 3, Atlas for lab 6.
- Docker Hub (lab 8). The build and start of the stack from scratch were checked on 23 October on this computer: three containers became healthy, `/api/health` answers `ok` through Nginx and directly, registration, login and creating a diagram through the proxy work (201, 200, and 401 without a token), data stays after `down` and `up`, and `down -v` removes the volume. Repeat the check on your machine and take a `docker ps` screenshot.
- Checking lab 5 against the real lab 3 server.
- Part 1: Firefox and Edge, screenshots (`notes/12-owner-screenshots.md`), the Rich Results Test, signing in to Figma to upload the mockups.
- Course project: the title page, assignment and contents in Word, agreeing the topic, cloud deployment, current screenshots, access dates of the sources.
- Questions for the teacher: lab 1 data in a database or an array, React Router 6 or 7 in P3, showing the 500 page in client-only works, SQLite or PostgreSQL, whether screenshots of every endpoint are needed.
- The decision to merge the branches into `main`.

### Can continue without the owner
- Re-shooting the frames if the look of the editor changes (commands in section 7). The Mermaid frames were re-shot on 23 October: labels are now plain SVG text and the colours come from the application.
- Refactoring round 3 and new extras from [`study/33-QUESTIONS.en.md`](study/33-QUESTIONS.en.md).

## 9 Where to read further

| File | Why |
| --- | --- |
| [`study/README.md`](study/README.md) | index of the study guides |
| [`notes/06-teacher-requirements.md`](notes/06-teacher-requirements.md) | teacher requirements for reports and code |
| [`notes/07-possible-teacher-extras.md`](notes/07-possible-teacher-extras.md) | forecast of the teacher's extras |
| [`notes/10-consilium-2026-10-17.md`](notes/10-consilium-2026-10-17.md) | tables of extras per work |
| [`notes/17-plan-2026-10-22.en.md`](notes/17-plan-2026-10-22.en.md) | plan and statistics |
| [`notes/18-scope-vs-state.en.md`](notes/18-scope-vs-state.en.md) | the project scope from the original document and how much of it is done |
| [`study/00-RUN-GUIDE.md`](study/00-RUN-GUIDE.md) | how to run each work |
| [`study/01-DATA-NEEDED.md`](study/01-DATA-NEEDED.md) | which data and accesses are needed from the owner |
| [`study/02-SECURITY-AUDIT.md`](study/02-SECURITY-AUDIT.md) | security audit |
| [`study/03-CLEAN-CODE-REVIEW.md`](study/03-CLEAN-CODE-REVIEW.md) | clean code review |
