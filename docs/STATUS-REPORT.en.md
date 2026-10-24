# DSLKit project and coursework status report

Russian version: [`STATUS-REPORT.md`](STATUS-REPORT.md).

Snapshot date: 24 October 2026. Compiled from `HANDOVER.md`, `PROJECT-STATE.md`, `notes/18-scope-vs-state.md`, `study/33-QUESTIONS.md`, the session log, the MBP handover, the owner's decisions of 24 October and the reports of the working sessions. Test counts come from those documents and from the Part 1 `npm test` run on the snapshot day (643 tests, 0 failed, 100% coverage). Part 2 works were not re-run on the snapshot day; their numbers are from the documents of 23 October.

Legend: **done** (built and checked), **works with a caveat**, **in progress** (running right now), **waiting for the owner**, **planned**, **not planned**.

## 1 In short

| Area | State |
| --- | --- |
| ITWP Part 1 (site, labs 1–8) | done, `npm test` green, editor work continues |
| ITWP Part 2 (labs 1–8, practicals 1–4) | code and reports done, some paperwork waits for the owner |
| Course project | note done, app being extended, Word formatting is the owner's |
| Mockups and Figma | 432 frames uploaded, 28 new frames not uploaded |
| Logo and brand | decided: old blue `</>` mark, cat mascot, Kubik fonts |
| MBP (business processes) | labs 1 and 2 done, lab 3 onward not received |
| Other subjects | see section 9, status not checked |
| Diploma (June 2027) | no code yet |

## 2 Goal, context, rules

The owner is a BSUIR student, discipline "Internet technologies and web programming" (ITWP), variant 26 (even). All works use one topic: DSLKit, a web editor for diagrams as code. A diploma idea on the same product runs in parallel, defence planned for June 2027.

Owner's rules:

1. Commits only as the owner, in English, no AI marks and no `Co-Authored-By`.
2. Each work in its own branch; nothing goes into `main` without an explicit yes. A history rewrite by force push also needs a separate yes.
3. Secrets only in `.env` on the owner's machine.
4. Reports and READMEs in Markdown only, Russian and English versions together.
5. Part 2 design equals Part 1 (shared tokens in `site/css/variables.css`).
6. Every work is covered by tests. Part 1 threshold is 100% of lines, branches and functions.
7. Reports are checked by the strict linter `tools/lint-report.js`; after a code change rebuild with `node tools/build.js <folder>`.
8. Any action on GitHub or in Figma only with the owner's permission.

## 3 ITWP Part 1: site and labs 1–8

### 3.1 Done

- Site in `site/`, plain HTML, CSS and JavaScript without a build; Russian at the root, English in `site/en/`.
- Editor: 33 notations (27 from the original mockups plus six added later: mind map, org chart, C4, network, decision tree, eEPC) and a Gantt chart (added 24 October: bars on a time axis, dependencies, milestones, progress, critical path).
- Four rendering engines: Graphviz, Mermaid, PlantUML through the Kroki service, and an own in-browser engine.
- Light and dark themes, Russian and English, offline cache, PWA (manifest, icons, service worker).
- Autosave of the code after one second with a "Saved" mark and restore on open.
- Export to SVG, PNG, JPEG, `.drawio`, self-contained `.html`, and PlantUML (`.puml`) and Mermaid (`.mmd`) code for flowcharts, sequence and state diagrams.
- Import of Mermaid and PlantUML from a file or the clipboard.
- A five-step tour shown once and later from the menu.
- Dragging blocks by mouse, finger and arrow keys; the position is written into the code as `pos=XxY`.
- Editor buttons wired on 24 October: undo, redo, save, check, format, share, auto layout, theme, zoom, explorer (commit `40494d3`).
- The React app (`react-app/`) got working buttons with state: beta signup, open project, notation filter, plan choice (commit `34edec0`).
- Security: strict CSP, sanitising of foreign SVG, output through `textContent`. Audit in `study/02-SECURITY-AUDIT.md`.
- When the rendering service fails, the old picture is hidden and a message with a retry button remains. The service worker does not cache foreign addresses.
- Checks: W3C Nu and CSS validators without errors, link check (300 links, none broken), validator.schema.org without errors.

### 3.2 What works

`npm test` on branch `work/part1-finish`: 643 tests, 0 failed, 100% line, branch and function coverage.

### 3.3 What was broken and fixed today

Five lab 7 tests failed. Cause: by the assignment lab 7 is stateless (`useState` and `useEffect` forbidden, handlers log to the console), while on 24 October the shared `react-app/` got working buttons with state. The lab 7 tests and report read `react-app/`.

Fix (commit `52386d6`): the stub version of lab 7 (from branch `lab7-stubs`) is kept as a frozen copy in `labs/07-react-components/react-app/`. The lab 7 tests, the rule check in lab 8 and the report listings now read that copy. The working app in `react-app/` keeps its state; the lab 7 and lab 8 reports are rebuilt. Side effect: the copy duplicates about 30 files, so lab 7 edits must go to the copy.

### 3.4 What is left

Owner only:

- Firefox and Edge, screenshots (`notes/12-owner-screenshots.md`), Rich Results Test.
- PWA install in a real Chrome (the app pane cannot register the service worker).
- React DevTools screenshot and a lab 7 check in Firefox and Edge.

In progress: session "Editor: properties panel, code export, Gantt" (block properties panel).

Planned without the owner: properties panel, more diagram kinds with their own drawing beside the Gantt chart, a full keyboard audit of the canvas (WCAG).

Waiting for the owner: own fonts (now Inter, JetBrains Mono and Kubik), final palette and radii.

Not planned in the coursework: AI panel and "Fix with AI", collaboration, Git and versions, Image → DSL, public API, SDK and plugins, autocomplete and two-way code ↔ canvas highlighting. These belong to the diploma.

## 4 ITWP Part 2: labs 1–8, practicals 1–4

Each work lives in its own branch, with RU and EN reports, negative tests and a defence write-up in `docs/study/`. Assignments are in `materials/`.

| Work | Branch | Tests | Contents |
| --- | --- | --- | --- |
| Lab 1 Express | `lab21` | 67 | diagram REST API, data in an array, layers, input validation, one error format, `PATCH`, `?notation=` filter, `?q=` search, pages and sorting, graceful shutdown, ESLint |
| Lab 2 Sequelize | `lab12` | 102 | PostgreSQL by default (SQLite for tests only), migrations, one-to-many, 409 |
| Lab 3 Authentication | `23` | 126 | bcrypt, JWT, roles, login lockout (limits in `limits.json`) |
| Lab 4 React state | `24` | 87 | `useState`, `useEffect`, `localStorage`, notation filter, `memo` |
| Lab 5 React and server | `25` | 100 client, 136 server | axios, optimistic updates with rollback, request cancelling, debounced search, "Load more", `useSession` hook |
| Lab 6 MongoDB | `26` | 136 | Mongoose, nested documents, indexes, aggregations, log into a collection |
| Lab 7 WebSocket | `27` | 93 | Socket.IO: rooms, presence, chat, private messages, token, `Origin` check |
| Lab 8 Docker | `28` | 11 | Nginx with React, Express, PostgreSQL, healthchecks, closed network, limits, pgAdmin and Redis profiles |
| Practical 1 Middleware and EJS | `pz21` | 103 | middleware order, CSRF, request log in SQLite, 404 and 500 pages, `/health` |
| Practical 2 REST API | `pz22` | 69 | three linked resources, schema as the single source of rules, OpenAPI at `/api/openapi.json` |
| Practical 3 Routing | `pz23` | 91 | protected routes and roles, lazy loading, `HashRouter`, two router variants |
| Practical 4 Context and reducer | `pz24` | 65 | two contexts, `useReducer`, undo and redo, "prop drilling" block |

Part 2 branches contain overlapping copies of earlier works. For lab 3 the version from branch `25` is current (it has CORS and `?search=`).

### 4.1 Owner's decisions of 24 October

- Practical 3: hand in the React Router v6 variant (`pz-03-routing-v6`), because the assignment says v6. The v7 variant stays as a spare. Both variants are in branch `pz23` (commit `79f3745`).
- Lab 1: data stays in an array, not a database.
- Database: PostgreSQL, SQLite for tests only.
- Screenshots of every endpoint are needed.
- Error pages: show the 500 page in client works and build separate detailed pages for every other error (what it is, why it happened, how to fix it).
- Order: labs, practicals and the course project first; logo, UI/UX and visuals later.

### 4.2 State of the error pages

`pz23` has commit `fe27e69` with such pages for 401, 403, 404, 500 and network errors, and an axe-core accessibility check (`cb934b2`). The other client works (labs 4, 5, practical 4) and the server pages were not part of it. This is **planned**.

### 4.3 What is left

In progress: session "Rebuild LR3 reports in branches 25 and 28" rebuilds the lab 3 reports (they say "SQLite by default", now PostgreSQL).

Owner only:

- Postman screenshots (labs 1–3, practical 2, at least five operations; per the documents every endpoint needs a shot) and DB structure from pgAdmin or DBeaver.
- PostgreSQL for labs 2 and 3, Atlas for lab 6.
- Docker Hub and a `docker ps` screenshot for lab 8. The stack was checked on 23 October on this computer: three containers healthy, signup, login and diagram creation through the proxy work, data survives `down` and `up`. Repeat on the owner's machine.
- Checking lab 5 against the real lab 3 server.

Planned: refactoring round 3 and new extras from `study/33-QUESTIONS.md`.

Not planned: `connectionStateRecovery` in lab 7 (server state is stored apart and would diverge from a restored socket; the answer is prepared in the write-up), a `lint` script in server works unless the teacher asks.

## 5 Course project

Branch `course-project`, folder `course-project/` (note and diagrams); the app is being extended in branch `course-app`.

Done:

- Note RU and EN: PostgreSQL as the main database, test counts 136 and 100, source access dates, hook fragment, demo data.
- Diagrams rendered to SVG (`usecase`, `c4-context`, `c4-containers`, `er`), links in the note are not broken.
- Defence cards and a five-sheet cheat sheet.
- "Tag" entity on the server: migration, models, endpoints, diagram filter, seed, tests.
- Screenshots of the new screens from the running Docker stack.
- "Comment" entity, admin screen.

In progress: session "Course project: add more entities" extends the app.

**Urgent decision: router version in the course project.** The owner's decision for practical 3 was version 6, and the note (section 2.3.2 and appendix B) describes 6.30.6. In the course project's working folder someone (per the "Курсовой" session, not that session) replaced `react-router-dom` 6.30.6 with `react-router` 7.18.4 and rewrote the imports, with nothing committed. At the same time another session was instructed to upgrade the router to 7. One version must be chosen, the code and the note aligned to it, and the client tests run.

Owner only:

- Title page, assignment and table of contents in Word.
- Topic approval, cloud deploy.
- Final screen screenshots.
- One or two books and articles in the sources list.
- Course project decisions: fourth and fifth entity (the assignment asks for 4–6, now User, Diagram, Comment, Tag), router version, fate of the admin screen.

## 6 Mockups, Figma, logo and brand

- 432 mockup frames (27 notations, 4 engines, RU and EN) and the Part 2 screens are in `docs/design-contest/`. The Figma file "DSLKit editor mockups" holds all 432 frames. Mermaid frames were re-shot on 23 October.
- **Not uploaded to Figma**: 24 PNGs of the six new notations (RU and EN, with and without a tooltip) and 4 PNGs of editor features. The upload session stopped: the file with 432 images does not finish loading in Chrome. What to do: close the Figma tabs, open the file once and wait for the canvas, optionally create a page "New notations + features", then continue the upload (Ctrl+Shift+K, Place all, Shift+A, grid with 4 columns, gap 40). The files can also be uploaded by hand.
- Brand decisions: the site logo, favicon and editor logo stay the old blue `</>` mark (commits `758ee55`, `c1d4c9b`). The pinwheel (indigo with amber) was rejected. The cat mascot stays on error pages and in the empty project list. The loader is a blue ring. Kubik fonts stay in the mockups.
- Logo variant sets (`final-v2` … `final-v7`, `survey`, `test-round-2` … `test-round-5`) and `AB-TEST-PLAN.md` are in `docs/design-contest/logos/` and not committed yet.
- Also uncommitted: `docs/ANALOGS-AND-INSPIRATION.md` and the edits to `HANDOVER` and `PROJECT-STATE`.
- A/B testing: results and protocol in `docs/project/ab-results/`, contradictions in the owner's answers remain open. A separate session "A/B тестирование: протокол и методология" discussed the method; the plan for checking the mark on analytics is in `AB-TEST-PLAN.md`.

## 7 Diploma idea (June 2027)

No code yet. There are project boundaries (`docs/project/PROJECT-OVERVIEW.md`), mockups and requirements.

Planned, after the topic and scope are approved with the supervisor:

- New stack: React 19, TypeScript, Vite, Monaco, elkjs, a C++ core in WASM.
- A real backend with sign-in (Email, guest, external providers) and plans.
- Collaboration, Git and versions, integrations, code or repository upload with an automatic diagram, Image → DSL, public API, SDK, plugins.
- Documents and legal: SRS, ADR, licence, terms of use, name and domain check, a usability test with 3–5 people, CI.
- One DSL grammar written down as a document (the code has a single parser, the document does not exist).

## 8 MBP: business process modelling

The subject area of all labs is DSLKit (the first version about an online shop was rejected). Teacher: Rusak T.V.; reports are built with the `report-gen` tool (`E:\report-gen`, commands `init`, `build`, `lint`).

| Work | Topic | State |
| --- | --- | --- |
| Lab 1 | Org structure and IDEF0 (A-0, A0, A2, node tree, org structure) | done: `E:\ИИТ\МБП_ЛР1\Отчет_ЛР1_МБП.docx` and `.pdf`, branch `docs/mbp-lr1` |
| Lab 2 | BPMN, process "Writing and checking DSL code" | done: `E:\ИИТ\МБП_ЛР2\Отчет_ЛР2_МБП.docx` and `.pdf`, branch `docs/mbp-lr2` |
| Lab 3 onward | not received | wait for new assignments on Google Drive |

Waiting for the owner: permission to push the branches (in `origin` branch `docs/mbp-lr1` holds the old shop version), the group number on the title page, confirmation of the invented org structure, removal of downloaded copies from `E:\Downloads` (the environment protection blocks deleting them). Lectures 1–4 and the end of lecture 5 were not read.

## 9 Other subjects

Status for these subjects was not checked on the snapshot day; below is what the folders and session titles show.

- **E-business** (`E:\ИИТ\ЭлектронныйБизнес`): folders lab 4 (Porter's five forces), lab 5 (competitor analysis), lab 6 (value proposition, canvas, scenarios, releases), lab 7 (final report), "СДАЧА", "ПРОВЕРИТЬ_ОТЧЕТЫ", a `HANDOFF.md`. Archive from 27 September.
- **Project management** (`E:\ИИТ\УправлениеПроектами`): practical 1 "Project concept", a risk map, a Gantt chart in Excel, checklists, `ARCHITECTURE.md`.
- **Usability** (`E:\ИИТ\Юзабилити`): folder `usability-iit` and a "site A diagkit" report.
- **Java**: `E:\beam-java`, labs 1–3 were run on 16 October, lab 3 "Servlets" (client) checked on 22 October, Tomcat stopped.
- **`E:\ssp`**: labs 2–5, web servers stopped on 23 October, run `python server.py` in `labN\web`.
- **VBA**: a checking skill for Batin's textbook and a session "VBA методичка анализ" from 24 October.

## 10 Process and environment

Environment traps (details in `PROJECT-STATE.md`, section 7):

- Large heredocs with Cyrillic and backslashes break in the shell: create files with the editor.
- Two `npm test` runs at once interfere with each other.
- The editor tour opens on clean storage; capture scripts first write `dslkit.tour-done`.
- Kroki sometimes errors. Docker Desktop starts slowly; port 5432 is taken by PostgreSQL from WSL, Compose reads the database port from `POSTGRES_PORT`.
- Keep logo galleries outside `site/`: the page checks count every HTML page in that folder.
- The environment blocks `Remove-Item` in the project directory (`[System.IO.File]::Delete` was used to delete files).

Sessions at the snapshot:

| Session | State |
| --- | --- |
| Course project: add more entities | running |
| Editor: properties panel, code export, Gantt | running |
| Rebuild LR3 reports in branches 25 and 28 | running |
| Оставшиеся задачи проекта (remaining tasks) | finished, started the three above plus the course and Figma sessions |
| Курсовой: комментарии, маршруты v6, экран админа | finished, found the router conflict |
| Upload new notations and feature frames to Figma | stopped, waits for the owner |
| Недоступные функции и кнопки (unavailable features and buttons) | finished, commits `34edec0` and `40494d3` |
| Логотипы и документация проекта (logos and docs) | finished |

## 11 Checklist of decisions and actions

Owner decisions needed:

1. Router version in the course project: 6.30.6 or 7.18.4 (section 5).
2. Push branches `docs/mbp-lr1` and `docs/mbp-lr2`.
3. Merge the work branches into `main`, then a separate yes for cleaning the history of AI traces by force push.
4. Own fonts, final palette.
5. Number of entities in the course project and the fate of the admin screen.
6. Diploma topic and scope with the supervisor.

Owner actions needed:

1. Postman and DB screenshots, Atlas, Docker Hub.
2. Firefox, Edge, PWA in Chrome, Rich Results Test.
3. Course project in Word: title page, assignment, contents, sources, cloud deploy.
4. Open Figma once until fully loaded and allow the upload of the new frames.

Can continue without the owner:

1. Wait for the three running sessions and check their results by diff.
2. Commit the documents and the logo variants.
3. Error pages for the remaining client works.
4. Properties panel, refactoring round 3, new extras.
