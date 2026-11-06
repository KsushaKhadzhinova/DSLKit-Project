# Tasks for the labs and practicals and the change impact map

Russian version: [`50-labs-pz-tasks-and-impact.md`](50-labs-pz-tasks-and-impact.md). Snapshot of 6 November 2026. Adds to [`30-epics-and-tasks.en.md`](30-epics-and-tasks.en.md): there the tasks are by epic, here they are laid out by work (Lab and PZ) and each states which other works, modules and documents must be changed at the same time.

Where the links come from. Labels on each fact:

- **[git]** checked with `git ls-tree` and `git rev-parse` across branches on 6.11.
- **[template]** checked from the `{{code:…}}` and `{{include:…}}` tags in the Part 1 `report.tpl.md`.
- **[doc]** taken from repository documents (audit, `PROJECT-STATE.md`, agent reports), not re-checked in this snapshot.
- **[verify]** an assumption, confirm before changing anything.

Task identifiers: Part 1 `P1L1-T1` (Lab 1, task 1), Part 2 `P2L1-T1`, practicals `PZ1-T1`, course project `KP-T1`, common `X-T1`. Subtasks `P2L3-T6.2`. Checkboxes are empty. Size and priority as in `30-epics-and-tasks.en.md`: P0…P3, S/M/L/XL. Who: **O** the owner by hand, **A** agent, **D** her decision.

The rules are as before: commits only in the owner's name with no signatures, push and merge only on her word, reports RU and EN together.

## 1. Verified links between works

### 1.1 Part 2: where copies of the same works live [git]

Every branch holds its own set of folders in `part-2/`:

| Branch        | Folders in `part-2/`                                                    |
| ------------- | ----------------------------------------------------------------------- |
| `lab21`       | lab-01                                                                  |
| `lab12`       | lab-01, lab-02                                                          |
| `23`          | lab-01, lab-02, lab-03                                                  |
| `24`          | lab-04                                                                  |
| `25`          | lab-01, lab-02, lab-03, lab-04, lab-05                                  |
| `26`          | lab-01, lab-02, lab-06                                                  |
| `27`          | lab-07                                                                  |
| `28`          | lab-01, lab-02, lab-03, lab-04, lab-05, lab-08                          |
| `pz21`–`pz24` | one folder each (two in `pz23`: `pz-03-routing-v6` and `pz-03-routing`) |
| `course-app`  | no `part-2/`, all code in `course-project/app/{client,server}`          |

Comparison of copy contents (git tree hashes, so an equal hash means a byte-identical folder):

| Folder             | Groups of copies                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| lab-01-node-server | `25` = `26` = `28` (`55338e1b`); separately `lab21` (`02b4dd15`), `lab12` (`09593abc`), `23` (`23680a51`) |
| lab-02-sequelize   | `25` = `26` = `28` (`ea9082e3`); separately `lab12` (`737fdf75`), `23` (`3e0610ba`)                       |
| lab-03-auth        | **three different versions**: `23` (`7df5571d`), `25` (`70ba5bf2`), `28` (`5344bf96`)                     |
| lab-04-react-state | `25` = `28` (`dcb4560c`); separately `24` (`7d98b71a`)                                                    |
| lab-05-react-api   | **two different ones**: `25` (`4c9b0c50`), `28` (`ead91e25`)                                              |

Consequence: a Lab 1 or Lab 2 change in one branch does not appear in the others. For a change to reach all copies it must be carried into every group (see section 4).

### 1.2 Every Part 2 branch keeps the whole Part 1 tree [git]

The root of each of the 13 Part 2 branches holds `labs/`, `site/`, `react-app/`, `tools/`. Therefore:

- Fluid headings (`clamp()` in `site/css/variables.css`) exist only in `testing-course-full` (6 places). In branches `lab21`, `lab12`, `23`, `24`, `25`, `26`, `27`, `28`, `pz21`–`pz24` the root `site/css/variables.css` does not have them.
- The `tools/` folder comes in two variants: `df0afb18` (branches `lab21`, `lab12`, `23`, `25`, `26`, `28`, `pz22`) and `3801b280` (branches `24`, `27`, `pz21`, `pz23`, `pz24`). `testing-course-full` has a third variant `b7d36772`. So a change to `tools/build.js`, `lint-report.js` or `server.js` will drift across three variants.

### 1.3 The same stylesheet in UI works [git]

A `dslkit.css` file of the same structure lives in the Part 2 UI works:

| Work / branch                                                          | Size       | Steps `--step-1…6` fluid (`clamp`) |
| ---------------------------------------------------------------------- | ---------- | ---------------------------------- |
| Lab 4 (`24`), Lab 5 (`25`), Lab 7 (`27`), course client (`course-app`) | 1209 lines | **no (0 of 6)**                    |
| PZ1 (`pz21`), PZ3 (`pz23`, both versions), PZ4 (`pz24`)                | 1211 lines | yes (6 of 6)                       |

Conclusion: fluid headings are applied in PZ1, PZ3, PZ4 and the root site, but **not applied in Lab 4, Lab 5, Lab 7 and the course client**. Lab 8 (Docker) builds its frontend from a copy of Lab 5 [doc], so it is affected too. PZ2 has no interface using this file.

### 1.4 Which sources the Part 1 reports embed [template]

A report is built from `report.tpl.md` and inserts the whole code of a file. If the file changes, the report must be rebuilt (`node tools/build.js labs/<folder>` or `npm run labN:report`), otherwise the report test is red.

| Part 1 work | Embeds                                                                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lab 1       | `labs/01-network/analyze-har.js`, `figures.js`, `cli.js`, `analyze-har.test.js`, `generated/ru/analysis.md`                                          |
| Lab 2       | `labs/02-environment/check-env.js`, `check.js`, `check-env.test.js`, **`tools/server.js`**, `generated/check.ru.md`                                  |
| Lab 3       | **`site/index.html`**, `site/design/design-tokens.txt`, `labs/03-semantic-markup/site-checks.js`, `site.test.js`                                     |
| Lab 4       | **`site/css/variables.css`, `base.css`, `header.css`, `main.css`, `footer.css`, `adaptive.css`, `style.css`**                                        |
| Lab 5       | **`site/js/script.js`**, `utils/storage.js`, `utils/validation.js`, `components/notation-filter.js`, `waitlist-form.js`, `dashboard.js`, `editor.js` |
| Lab 6       | `site/js/api/config.js`, `api/apiService.js`, `storage/localStorage.js`, `utils/dataParser.js`, `components/diagram-runner.js`                       |
| Lab 7       | `labs/07-react-components/react-app/src/...` (frozen copy: `Button.jsx`, `Card.jsx`, `NotationCard.jsx`, `ProjectList.jsx`, `App.jsx`)               |
| Lab 8       | `react-app/src/utils/helpers.js` and tests, `ProjectList.test.jsx`, `react-app/jest.config.js`                                                       |

### 1.5 Other links [doc]

- The Lab 3 version from branch `25` is considered the main one: it has CORS and the `?search=` parameter. Lab 5 uses this server.
- Lab 8 includes copies of Lab 1–Lab 5, and `docker-compose.yml` refers to Lab 3 and Lab 5 paths: renaming Lab 3 environment variables breaks compose.
- Lab 6 holds copies of Lab 1 and Lab 2 replaced by the current ones (`25` = `26` = `28`).
- Lab 7 uses the `mongodb` driver and a login token, not Mongoose.
- Course project: the server grew from Lab 3, the client from Lab 5 (in `course-app` `app.css` matches Lab 5 line by line in several places); the course Postman collection (17 requests) is a copy of Lab 3.
- Ports: Lab 2 `PORT=3000`, DB 5434; Lab 3 `PORT=3001`, DB 5433; the Lab 5 client on 5178, Lab 4 on 5175; Lab 8 defaults to 8080 and 3000 (the assignment requires 80 and 5000).
- The file `limits.json` occurs in PZ1, PZ2, Lab 3 and the course project (server and client).
- Error format: Lab 1, Lab 2, Lab 3, Lab 6, the course project return `{"error":"text"}`, PZ2 and the root API return `{"error":{"code","message"}}`, Lab 7 and PZ1 return HTML.
- Error pages 401/403/404/500/network exist only in `pz23` (`fe27e69`, `cb934b2`).

## 2. Impact matrix: what was changed, what else to change

Read it like this: found a reason to change A, look at row A and change everything in the column "Change at the same time".

| No. | Kind of change                                                           | Change at the same time                                                                                                                                                                                                               | Rebuild / check                                                                                                               |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| M1  | Styles: tokens and sizes (`variables.css`, `dslkit.css`, fluid headings) | root `site/css/` in `testing-course-full`; `dslkit.css` in Lab 4, Lab 5, Lab 7, PZ1, PZ3 v6, PZ3 v7, PZ4, the course client; the Lab 8 frontend (copy of Lab 5); optionally the root `site/` in Part 2 branches                       | Part 1 Lab 4 report (`node tools/build.js labs/04-responsive-css`), Part 2 reports with embedded CSS (verify), CSS rule tests |
| M2  | Landing page (`site/index.html`)                                         | `site/en/index.html`; semantics tests; Schema.org                                                                                                                                                                                     | Part 1 Lab 3 report, W3C, Rich Results                                                                                        |
| M3  | Site scripts (`site/js/script.js`, `utils`, `components`)                | `site/en/`; e2e `testing-course/full/*`                                                                                                                                                                                               | Part 1 Lab 5 and Lab 6 reports; `npm test`; `tc:full`                                                                         |
| M4  | `tools/server.js`, `build.js`, `lint-report.js`, `variant.js`            | **all 13 Part 2 branches** (three variants of `tools/`), `testing-course-full`                                                                                                                                                        | Part 1 Lab 2 report (embeds `server.js`), all reports on a `build`/`lint` change                                              |
| M5  | Report template or layout                                                | `report.tpl.md` and `report.en.tpl.md` of every work, the linter                                                                                                                                                                      | rebuild all reports, report tests                                                                                             |
| M6  | Lab 1: routes, layers, input checks                                      | Lab 1 copies in `lab21`, `lab12`, `23`, `25`, `26`, `28`; then Lab 2, Lab 3 (build on it), the Lab 5 client; Lab 1 Postman; the course project (modelled on it)                                                                       | Lab 1–3, 6, 8 tests; reports; test counts in documents                                                                        |
| M7  | Lab 2: models, migrations, seeds                                         | Lab 2 copies in `lab12`, `23`, `25`, `26`, `28`; Lab 3 (shared models); the course server; Lab 8 compose                                                                                                                              | tests on SQLite and on PostgreSQL; `db:migrate`, `db:seed`; reports                                                           |
| M8  | Lab 3: routes, fields, roles, CORS, `?search=`, lock                     | three Lab 3 versions (`23`, `25`, `28`); Lab 5 client (`api.js`, `useSession`); the Lab 7 token; Lab 8 compose and variables; the course server; Lab 3 Postman and the copy in the course project; `docs/study/11`, `00-RUN-GUIDE.md` | Lab 3, 5, 8 tests; Lab 3, 5, 8 reports; Postman screenshots                                                                   |
| M9  | API error format                                                         | Lab 1, Lab 2, Lab 3, Lab 6, PZ2, the course server, the root `render-api`; error parsing in the Lab 4/Lab 5/PZ3/PZ4/course clients; error pages                                                                                       | contract tests, reports, Postman                                                                                              |
| M10 | Error pages 401/403/404/500/network                                      | source `pz23`; port to Lab 4, Lab 5, PZ4, the course client; link to the 500 page from navigation                                                                                                                                     | axe accessibility check, reports                                                                                              |
| M11 | `limits.json` (lengths, number limits)                                   | PZ1, PZ2, Lab 3, the course server and client                                                                                                                                                                                         | boundary tests, reports, `docs/study`                                                                                         |
| M12 | `.env`, ports, variable names                                            | Lab 2 (3000/5434), Lab 3 (3001/5433), Lab 5 (`VITE_API_URL`), Lab 6 (`MONGODB_URI`), Lab 7, Lab 8 (compose, 80/5000), the course project; `.env.example`; Postman variables; `docs/study/00-RUN-GUIDE.md`                             | `npm test` without a filled `.env`; `docker compose config`; reports                                                          |
| M13 | Docker and compose                                                       | Lab 8 (`28`), `course-project/app/docker`, Lab 2 and Lab 3 compose (projects `dslkit-lab2-db`, `dslkit-lab3-db`)                                                                                                                      | build from scratch, `docker ps`, healthcheck, Lab 8 report                                                                    |
| M14 | Authentication and tokens                                                | Lab 3, Lab 5 (`useSession`), Lab 7 (login token, `Origin`), Lab 8, the course project                                                                                                                                                 | login, lock, role tests                                                                                                       |
| M15 | Routing (Router)                                                         | PZ3 v6 (handed in), PZ3 v7 (spare), the course client (v7)                                                                                                                                                                            | Vitest, axe, PZ3 report                                                                                                       |
| M16 | React state (hooks, Context, reducer)                                    | Lab 4, Lab 5 (`useSession`), PZ4 (`shell.css` shared with PZ3) [verify code links]                                                                                                                                                    | Vitest, reports                                                                                                               |
| M17 | The `react-app/` directory                                               | the frozen copy `labs/07-react-components/react-app/` is **not updated automatically**; Lab 8 tests read `react-app/`                                                                                                                 | Part 1 Lab 7 and Lab 8 reports, `npx jest -i`                                                                                 |
| M18 | Test count or thresholds                                                 | README of each work, `report.md` and `report.en.md`, tables in `PROJECT-STATE.md`, `STATUS-REPORT.md`, `docs/study/*`, `defence-cards.md`, `cheat-sheet.md`, `00-project-checklist.en.md`                                             | rebuild reports, hand-in gates                                                                                                |
| M19 | Decision on control questions                                            | reports of all Part 1 and Part 2 works (RU and EN), defence cards                                                                                                                                                                     | report linter                                                                                                                 |

## 3. Tasks and subtasks by work

In each task: **Affects** lists only what must be changed together with it (matrix row M in brackets).

### 3.1 Part 1: Labs 1–8 (per the audit, state on 15–29 October, re-check)

**Lab 1 Network protocol analysis** (`labs/01-network/`)

- [ ] **P1L1-T1** (P2, O, S) Check figure 1 (draw.io screenshot) for an empty canvas. Affects: the report only.
- [ ] **P1L1-T2** (P3, A, M) Repeated runs, the DOMContentLoaded conclusion.
  - [ ] P1L1-T2.1 Take 3–5 HAR runs and recompute the tables (`analyze-har.js`).
  - [ ] P1L1-T2.2 Rebuild the report.
- [ ] **P1L1-T3** (P1, A, S) Contents and source list.
- [ ] **P1L1-T4** (P1, A, L) Answers to the 16 control questions (after the M19 decision).

**Lab 2 Working environment** (`labs/02-environment/`)

- [ ] **P1L2-T1** (P1, O, M) Screenshots: terminal with Node, npm, Git versions; VS Code with extensions; explorer; Source Control.
- [ ] **P1L2-T2** (P2, O, S) Figma file name `bsuir-diploma` → a project name.
- [ ] **P1L2-T3** (P0, A, S) Rebuild the report (it embeds `tools/server.js`, red test "report built from the template"). Affects: M4.
- [ ] **P1L2-T4** (P1, A, M) Answers to 10 questions (M19).

**Lab 3 Semantic markup** (`labs/03-semantic-markup/`)

- [ ] **P1L3-T1** (P1, O, M) Figures: project structure, Figma layout, code in the editor.
- [ ] **P1L3-T2** (P2, A, S) Dates and mode of the W3C checks, wording about Rich Results.
- [ ] **P1L3-T3** (P1, A, M) Answers to 10 questions (M19).
- [ ] **P1L3-T4** (P1, A, S) After any change to `site/index.html` rebuild the report and repeat W3C. Affects: M2, `site/en/index.html`.

**Lab 4 Responsive CSS** (`labs/04-responsive-css/`)

- [ ] **P1L4-T1** (P1, A, M) Justify variable values and breakpoints in the text.
- [ ] **P1L4-T2** (P2, A, M) `grid-template-areas` on `.page`, flex/grid subsections.
- [ ] **P1L4-T3** (P1, A, S) Remove `@media` duplicates (rule: one block per media query).
- [ ] **P1L4-T4** (P2, O, S) W3C CSS logs.
- [ ] **P1L4-T5** (P0, A, S) Rebuild the report after every `site/css/*` change (rebuilt now, `ccb4b0b`). Affects: M1 (Part 2 UI works).

**Lab 5 JavaScript and DOM** (`labs/05-javascript-interactivity/`)

- [ ] **P1L5-T1** (P1, O, M) Screenshot of code in VS Code and of four components out of eight.
- [ ] **P1L5-T2** (P0, A, S) Rebuild the report after `site/js/script.js` changes (red test). Affects: M3.
- [ ] **P1L5-T3** (P1, A, M) Answers to questions (M19).

**Lab 6 API and storage** (`labs/06-async-api-storage/`)

- [ ] **P1L6-T1** (P1, A, M) Merge `fix/lab06-bugs` into the integration branch and run the tests.
- [ ] **P1L6-T2** (P1, A, S) Re-check BUG-10 on Mermaid through Kroki.
- [ ] **P1L6-T3** (P2, O, S) A console screenshot with logs. Affects: `apiService.js`, M3.

**Lab 7 React components** (`labs/07-react-components/`)

- [ ] **P1L7-T1** (P1, A, M) Component hierarchy diagram instead of a link to appendices.
- [ ] **P1L7-T2** (P2, A, S) Port 5174 against 5173 in the assignment.
- [ ] **P1L7-T3** (P1, A, S) Any changes only in the frozen copy `labs/07-react-components/react-app/`, not in `react-app/`. Affects: M17.

**Lab 8 Testing** (`labs/08-frontend-testing/`)

- [ ] **P1L8-T1** (P2, O, M) React Profiler screenshot (failed earlier).
- [ ] **P1L8-T2** (P1, O, S) Network and React DevTools screenshots.
- [ ] **P1L8-T3** (P1, A, S) Remove the stale "Firefox and Edge remain a task" in Lab 5–8.

### 3.2 Part 2: Labs 1–8

**Lab 1 Express** (branch `lab21`)

- [ ] **P2L1-T1** (P0, O, M) Postman: a screenshot of every endpoint (201, 400, 404, 200).
- [ ] **P2L1-T2** (P1, A, M) Move `spike: 1000 sockets` into `npm run test:load`.
- [ ] **P2L1-T3** (P1, A, L) Answers to questions (M19).
- [ ] **P2L1-T4** (P1, A, M) Reconcile the Lab 1 copies: `lab21` (`02b4dd15`), `lab12`, `23`, group `25`=`26`=`28` (`55338e1b`). Decide which version is the reference and carry the differences into all.
  - [ ] P2L1-T4.1 Compare with `git diff lab21 25 -- part-2/lab-01-node-server`.
  - [ ] P2L1-T4.2 Carry missing changes into the other groups, run each one's tests.
  - [ ] P2L1-T4.3 Update the test count (M18).
  - Affects: M6 (Lab 2, Lab 3, Lab 5, Lab 6, Lab 8, the course project).

**Lab 2 Sequelize** (branch `lab12`)

- [ ] **P2L2-T1** (P0, O, M) `.env`, DB on 5434, `docker compose up -d`, `db:migrate`, `db:seed`.
- [ ] **P2L2-T2** (P1, A, M) Repeat CHECK, foreign keys, UNIQUE, 409 on PostgreSQL (automated tests run on SQLite).
- [ ] **P2L2-T3** (P1, A, L) Seeds (repeatable, a second run without duplicates).
- [ ] **P2L2-T4** (P1, O, M) Postman and DB structure screenshots (pgAdmin or DBeaver).
- [ ] **P2L2-T5** (P1, A, M) Slow tests (`npm test` over 170 s): find the bottlenecks.
- [ ] **P2L2-T6** (P1, A, S) `.env` isolation in the config tests (3 tests red).
- [ ] **P2L2-T7** (P1, D, S) Push the +1 local commit (only on her word).
- [ ] **P2L2-T8** (P1, A, M) Reconcile with the Lab 2 copies (`23`, group `25`=`26`=`28`). Affects: M7 (Lab 3, Lab 6, Lab 8, the course project).

**Lab 3 Authentication** (branch `23`)

- [ ] **P2L3-T1** (P0, O, M) `.env` (port 3001, DB 5433, `JWT_SECRET` at least 32 characters, admin and demo ≥ 10).
- [ ] **P2L3-T2** (P1, A, L) Seeds: admin, users, diagrams.
- [ ] **P2L3-T3** (P0, O, L) Postman: 201, 409, 400, 200, 401, 403; screenshots.
- [ ] **P2L3-T4** (P1, A, S) Describe the 15-minute lock in the report (the mechanism catalogue says 5) or align `limits.json`.
- [ ] **P2L3-T5** (P1, A, S) `.env` isolation in the config tests.
- [ ] **P2L3-T6** (P0, A, L) **Merge the three Lab 3 versions** (`23`, `25`, `28`) into one reference (the main version `25` has CORS and `?search=`).
  - [ ] P2L3-T6.1 `git diff 23 25 -- part-2/lab-03-auth`, `git diff 25 28 -- part-2/lab-03-auth`.
  - [ ] P2L3-T6.2 Decide what stays in branch `23` for handing in Lab 3 and what lives only in `25`.
  - [ ] P2L3-T6.3 Carry the changes, run the Lab 3 and Lab 5 tests against one server.
  - Affects: M8 (Lab 5, Lab 7, Lab 8, the course project, Postman, `docs/study/11`).
- [ ] **P2L3-T7** (P1, D, S) Push the +1 local commit.

**Lab 4 React state** (branch `24`)

- [ ] **P2L4-T1** (P1, A, L) Error pages (source `pz23`). Affects: M10.
- [ ] **P2L4-T2** (P1, A, S) Fluid heading sizes in `dslkit.css` (now 0 of 6). Affects: M1 (Lab 5, Lab 7, the course client, Lab 8).
- [ ] **P2L4-T3** (P1, A, M) Reconcile with the copy in `25`/`28` (`dcb4560c` against `7d98b71a`): the 1-second load simulation and the rest.
- [ ] **P2L4-T4** (P1, D, S) Push the local commits.
- [ ] **P2L4-T5** (P1, A, S) Completeness of the test set (102 against "2" in the script).

**Lab 5 React and server** (branch `25`)

- [ ] **P2L5-T1** (P0, O→A, M) Check with the real Lab 3 server (`VITE_API_URL` without `/api`, client 5178). Affects: M8, M12.
- [ ] **P2L5-T2** (P1, A, L) Error pages. Affects: M10.
- [ ] **P2L5-T3** (P1, A, S) Fluid headings (now 0 of 6). Affects: M1.
- [ ] **P2L5-T4** (P1, A, M) Reconcile `lab-05` from `25` (`4c9b0c50`) with the copy in `28` (`ead91e25`).
- [ ] **P2L5-T5** (P1, A, M) Coverage 97.69%: clarify the target per the assignment, add tests if needed.
- [ ] **P2L5-T6** (P0, O, M) The red GitHub Actions check (after `gh auth login`).

**Lab 6 MongoDB** (branch `26`)

- [ ] **P2L6-T1** (P0, O, M) Atlas M0, `MONGODB_URI`, Network Access.
- [ ] **P2L6-T2** (P1, O, M) Atlas, Compass, nested comments screenshots.
- [ ] **P2L6-T3** (P1, A, M) Seeds.
- [ ] **P2L6-T4** (P2, A, S) Verify: 415 not found in code; without `limit` up to 100 records are returned (in Lab 1–Lab 3 the whole list).
- [ ] **P2L6-T5** (P1, A, S) The Lab 1 and Lab 2 copies equal group `25`/`28`: keep the equality when making M6, M7 changes.

**Lab 7 WebSocket** (branch `27`)

- [ ] **P2L7-T1** (P1, A, M) Move `spike: 400 raw sockets` into `test:load`; add scenarios with the real limits (tests use `maxPerAddress` 1000 and `rateMax` 100000).
- [ ] **P2L7-T2** (P2, A, S) Check the index by `room` in `messages`.
- [ ] **P2L7-T3** (P1, A, S) A note in the report: the client has no React (allowed by task 2) or move it to React.
- [ ] **P2L7-T4** (P1, A, S) Fluid headings (`dslkit.css`, 0 of 6). Affects: M1.
- [ ] **P2L7-T5** (P1, D, S) Push the +2 local commits.

**Lab 8 Docker** (branch `28`)

- [ ] **P2L8-T1** (P0, A, L) Build from scratch, `docker ps`, healthcheck, `/api/health`, register and log in through Nginx, `down` and `up` with data (`down -v` only with a "yes"). Affects: M13.
- [ ] **P2L8-T2** (P1, A, M) Ports 80 and 5000 through `FRONTEND_PORT` and `BACKEND_PORT`, a note in the report. Affects: M12.
- [ ] **P2L8-T3** (P1, O, M) Docker Hub (after "push the image"), `docker ps` on her machine.
- [ ] **P2L8-T4** (P1, A, M) Reconcile the Lab 1–Lab 5 copies in `28` with the references (especially `lab-03` `5344bf96`, `lab-05` `ead91e25`). Affects: M6–M8.
- [ ] **P2L8-T5** (P1, A, S) Fluid headings in the frontend (copy of Lab 5). Affects: M1.
- [ ] **P2L8-T6** (P0, O, M) The red GitHub Actions check.

### 3.3 Practicals

**PZ1 Middleware and EJS** (branch `pz21`)

- [ ] **PZ1-T1** (P0, A, S) Rebuild `report.md` and `report.en.md` from the templates (2 red tests).
- [ ] **PZ1-T2** (P0, O, M) The red GitHub Actions check.
- [ ] **PZ1-T3** (P1, A, M) Check the 500 page when the log DB is unavailable (a requirement for the even variant) and `limits.json`.
- [ ] **PZ1-T4** (P3, A, S) Fluid headings are already there; make sure M1 reaches here too.

**PZ2 REST API** (branch `pz22`)

- [ ] **PZ2-T1** (P0, O, M) Postman screenshots (at least five operations) and Swagger UI at `/api/openapi.json`.
- [ ] **PZ2-T2** (P2, A, S) In the Postman collection the health request uses an absolute address, replace with `{{base}}`.
- [ ] **PZ2-T3** (P2, D, S) The error format `{error:{code,message}}` differs from the other works: keep (and describe it) or unify. Affects: M9.

**PZ3 Routing** (branch `pz23`)

- [ ] **PZ3-T1** (P0, D, S) Hand-in v6: keep both folders with a note or rename v7 to spare. Affects: M15 (the course project).
- [ ] **PZ3-T2** (P1, A, S) Vitest times out on a busy machine: run one at a time, `testTimeout` 30000.
- [ ] **PZ3-T3** (P1, A, M) Error pages: the reference to port into Lab 4, Lab 5, PZ4, the course project. Affects: M10.

**PZ4 Context and reducer** (branch `pz24`)

- [ ] **PZ4-T1** (P1, A, L) Error pages. Affects: M10.
- [ ] **PZ4-T2** (P1, A, S) Vitest one at a time.
- [ ] **PZ4-T3** (P2, A, S) Shared `shell.css` with PZ3: make shell style changes in both. Affects: M1, M16.

### 3.4 Course project (branch `course-app`, documents also in `course-project`)

- [ ] **KP-T1** (P0, A, M) Server tests on a free machine, 225 → 226 in the note, README, `app/README.md`, defence cards. Affects: M18.
- [ ] **KP-T2** (P1, A, M) Re-render `er.svg`, `usecase.svg`, `c4-containers.svg`.
- [ ] **KP-T3** (P1, A, S) Tag requests in `postman_collection.json` and `requests.http` (now 17 requests, a copy of Lab 3). Affects: M8.
- [ ] **KP-T4** (P0, O, XL) The note in Word: title, assignment, contents, 20–30 pages, appendices V and Zh, source 20.
- [ ] **KP-T5** (P1, A, M) NFR6 and NFR8 measurements.
- [ ] **KP-T6** (P2, A, S) Fluid headings in the client `dslkit.css` (0 of 6). Affects: M1.
- [ ] **KP-T7** (P1, A, M) Error pages in the client. Affects: M10.
- [ ] **KP-T8** (P1, D, M) A single source of the note: bring it back from `course-app` to `course-project` or the reverse.
- [ ] **KP-T9** (P2, A, M) Deploy on Render (`render.yaml`, values only in the environment). Affects: M12.

### 3.5 Common tasks for all works

- [ ] **X-T1** (P0, D, S) A decision on the propagation order (section 4) and on the reference branches.
- [ ] **X-T2** (P1, A, M) Bring the three variants of `tools/` (`df0afb18`, `3801b280`, `b7d36772`) to one and carry it into all branches. Affects: M4.
- [ ] **X-T3** (P2, D, S) Whether Part 2 branches need a fresh root `site/` (now without fluid headings and without the latest changes) or it is outside the hand-in.
- [ ] **X-T4** (P1, A, M) Test counts in all documents after E1-T1 (M18).
- [ ] **X-T5** (P1, A, M) Update `docs/study/00-RUN-GUIDE.md` and `docs/study/11` (PostgreSQL, ports 3001/5433/5434).
- [ ] **X-T6** (P1, A, M) `.env.example` in all server works: identical variable names. Affects: M12.
- [ ] **X-T7** (P0, D, S) The control question rule (M19), then insert the answers into all reports.

## 4. Order of propagating a change (procedure)

For any change from the matrix do the following steps:

1. Determine the kind from the table in section 2 (M1…M19) and write out the list of affected works.
2. Choose the reference branch (where to change first). For Part 2: Lab 1 and Lab 2 — group `25`; Lab 3 — `25`; Lab 4 — `24`; Lab 5 — `25`; the rest — its own branch. For the site — `testing-course-full`.
3. Make the change and the test in the reference, run `npm test` there as a single process.
4. For each affected branch: carry the commit (`git cherry-pick <sha>`) in its own separate working copy (`git worktree add`), not in the shared root; on a conflict resolve by hand, do not rewrite history.
5. Rebuild the affected reports (`node tools/build.js <folder>`, RU and EN), run the linter.
6. Run the tests of each affected work separately and record the count (M18).
7. Update the documents: README, `PROJECT-STATE.md`, the tables in `00-project-checklist.en.md`, defence cards.
8. Show the result to the owner, push each branch only on her word.

Limits: stop at 70% of the weekly limit; Docker deleting commands only with a "yes"; do not carry secrets into commits.

## 5. One pass: what can be fixed at once in many works

These are already known discrepancies. It is better to close them in one pass following the procedure in section 4 so as not to come back.

| No. | Pass                                                 | Works                                                                                      | Tasks                                                |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| W1  | Fluid headings (6 `clamp` steps) in `dslkit.css`     | Lab 4, Lab 5, Lab 7, the course client, the Lab 8 frontend (PZ1, PZ3, PZ4 already have it) | P2L4-T2, P2L5-T3, P2L7-T4, KP-T6, P2L8-T5            |
| W2  | Error pages from `pz23`                              | Lab 4, Lab 5, PZ4, the course client                                                       | P2L4-T1, P2L5-T2, PZ4-T1, KP-T7                      |
| W3  | `.env` isolation in config tests                     | Lab 2, Lab 3 (check Lab 6, the course project)                                             | P2L2-T6, P2L3-T5                                     |
| W4  | Moving load `spike` tests into `test:load`           | Lab 1, Lab 7, the course project                                                           | P2L1-T2, P2L7-T1, E1-T2                              |
| W5  | Reconcile the Lab 1–Lab 5 copies with the references | branches `lab21`, `lab12`, `23`, `24`, `25`, `26`, `28`                                    | P2L1-T4, P2L2-T8, P2L3-T6, P2L4-T3, P2L5-T4, P2L8-T4 |
| W6  | Reconcile the three variants of `tools/`             | all 13 branches                                                                            | X-T2                                                 |
| W7  | Answers to control questions                         | all reports of Parts 1 and 2                                                               | X-T7, P1L1-T4 and others                             |
| W8  | Test counts and ports in documents                   | all READMEs, reports, `docs/study`                                                         | X-T4, X-T5                                           |
| W9  | Postman: screenshots and `{{base}}` variables        | Lab 1, Lab 2, Lab 3, Lab 6, PZ2, the course project                                        | P2L1-T1, P2L2-T4, P2L3-T3, PZ2-T1, KP-T3             |
| W10 | Push local commits                                   | `lab12`, `23`, `24`, `25`, `26`, `27`, `28`, `work/part1-finish`                           | on the owner's word                                  |

## 6. What is unknown and must be checked before changes

- Which of the Lab 1 and Lab 2 copy groups is the reference (per documents group `25`/`26`/`28`, but `lab21` has its own hand-in version) [verify with a diff].
- Whether the other UI works have their own fixed heading sizes outside `--step-*` (in `app.css` of Lab 5 and the course project there are `font-size: var(--step-3)` and `var(--step-6)`, so they inherit the steps) [verify after W1].
- Code links Lab 4 ↔ Lab 5 ↔ PZ4 (shared components, `shell.css`) [verify].
- Whether the tests of Part 2 branches read the root `site/` and `labs/` (if yes, W6 and X-T3 are mandatory) [verify].
- Whether Part 2 reports embed file code (as in Part 1) [verify in Part 2 `report.tpl.md`].
