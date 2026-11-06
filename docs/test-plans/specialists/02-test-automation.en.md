# DSLKit test automation: test plan and checklist (specialist 02)

Russian version: [`02-test-automation.md`](02-test-automation.md). Version 1.0, 6 November 2026, branch `docs/test-plans-and-checklists`. Overall strategy: [`../01-test-strategy.en.md`](../01-test-strategy.en.md). The manual test cases (TC-001…TC-224), checklists (CL-…) and the traceability matrix live in `docs/testing-kulikov/` and are not repeated here, they are referenced by ID.

The facts below come from `package.json`, `.github/workflows/ci.yml`, `testing-course/README.md`, `docs/ITIVP-AUDIT-2026-10-29.md` (sections 0 and 5) and the saved `testing-course/full/*.json`. What the files do not say is marked "verify".

## 1. Role and scope

The automation engineer makes sure the checks run with one command, give the same result on another machine and in CI, and that the result can be put into a report.

In scope:

- Root unit tests on `node:test` and `jsdom` in `labs/**/*.test.js` and `tools/**/*.test.js` (97 files, coverage threshold 100 % for lines, branches and functions).
- Tests of the server and client labs of Part 2 in the working copies under `.claude/worktrees/` (`node:test`, Vitest) and of `react-app/` (Jest).
- End-to-end checks in `testing-course/full/*.py` and `static-sec-perf.js`, the checklists `testing-course/lab2` and `lab3`.
- Contract checks of the rendering API and of the server labs, Postman collections.
- CI in `.github/workflows/ci.yml`, `prettier` formatting, the report linter `tools/lint-report.js`.
- Test data, seeds, run order, reporting of a run.

Out of scope: manual test cases and exploratory testing (specialist 01), security (03), accessibility (04), load (05), the content of the reports for the teacher (08).

## 2. What the specialist checks

| Priority | What is checked                                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0       | `npm test` in the root is green and holds the 100 % threshold. `ci.yml` is green on the submission branch. The end-to-end path (register, diagram, save, log out, log in) passes in `tc:full` with no manual edits |
| P1       | No flaky tests that turn red because of machine load or a filled `.env`. `tc:full` builds completely. Scenarios S1 and S13 are green. The results of the run are in the report                                     |
| P2       | Server branches and clients of Part 2 run one by one and give the same number of tests as the audit. API contracts are pinned by tests. A cross-browser run in Firefox and WebKit                                  |
| P3       | Mutation check of weak spots (`tools/mutate.cjs`), a single `test:load`, a JUnit report, a faster run                                                                                                              |

Thresholds: any red test of P0 blocks the release and the submission, P1 is closed before submission or recorded as a known defect with a reason, P2 and P3 go to the queue.

## 3. Plan

### 3.1 Goals

Any change in `site/`, `tools/`, `labs/` is caught by automation before manual checking. A red result always means a defect of the product or of the test, never "the machine is busy" or "something sits in `.env`". The result of every run is saved as a file and reaches the documentation without manual edits.

### 3.2 Test pyramid and current state

| Level                     | What                                                                              | Where                                                         | Count (source)                                                    |
| ------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| Root unit and integration | Pure functions, DSL parsing, storage, validation, the in-memory `tools/server.js` | `labs/**/*.test.js`, `tools/**/*.test.js`                     | 1026 tests per the task (audit of 29.10: 836), verify `npm test`  |
| Client components         | Jest (`react-app/`), Vitest (Part 2 labs 4 and 5, practicals 3 and 4)             | `react-app/`, `.claude/worktrees/*/part-2/*`                  | Jest 55 in 7 suites, Vitest lab 4 102, lab 5 123 (audit)          |
| Server integration        | Express and Sequelize on temporary SQLite, PostgreSQL in Docker, WebSocket        | `.claude/worktrees/*/part-2/lab-0*/tests`                     | lab 1 78, lab 3 129, PZ1 132, PZ2 77 (audit), verify labs 2 and 6 |
| Contract                  | API response shape, codes, headers, Postman collections                           | `tools/render-api.test.js`, `tests/contract.test.js` in lab 3 | verify, list below in 4.5                                         |
| HTTP checklists           | Smoke 8 and critical path 36, 22 test cases of the form                           | `testing-course/lab3`, `testing-course/lab2`                  | 44 and 22 Passed (README)                                         |
| Static and non-functional | HTML, links, `lang`, `h1`, CSP, `ru`/`en`, sizes                                  | `testing-course/full/static-sec-perf.js`                      | 41 Passed (`static-sec-perf.json`)                                |
| End-to-end (e2e)          | Playwright for Python, Edge browser, real clicks                                  | `testing-course/full/*.py`                                    | 42 + 21 + 21 + 11 + 12 checks Passed, 14 scenarios (12 Passed)    |
| "Click everything" crawl  | Every element on 13 pages, search for dead ones                                   | `testing-course/full/click-everything.py`                     | 366 elements, 51 without reaction (`click-everything.json`)       |

The base of the pyramid is wide and the top is thin: manual TCs cover the interface by ID, there is little automation there. This is the goal of section 4.

### 3.3 Scope

Included: all items of section 1. Automation comes first for the TC groups "Login", "Registration", "Dashboard", "Projects", "Editor", "API" (TC-001…TC-196) along the critical path, the rest by High priority from `docs/testing-kulikov/13-test-cases.md`.

Excluded: Kroki as an external service (per `docs/testing-kulikov/10-test-plan.md` only the behavior of DSLKit when it is unavailable is checked) and load with thousands of users (plan 05).

### 3.4 Approach

- One level answers for one risk, duplication is removed: what a unit test covers is not repeated in e2e.
- Every test is independent: its own port (`listen(0)` as in `static-sec-perf.js` and `lab3/run.js`), its own temporary database, a clean browser profile.
- Expectations in e2e are built on state (`wait_for_url`, visibility, node count), not on `wait_for_timeout`. `scenarios-e2e.py` currently has fixed pauses, a candidate for rework.
- A red test is first reproduced with one command on one file, then analyzed (cause: product, test, data, environment), and the result goes into the table of known defects.
- Load `spike` tests and tests that depend on the machine live apart from `npm test`.

### 3.5 Environment

| What           | Value                                                                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js        | `engines >=20` in `package.json`, version 24 in CI                                                                                                                                                 |
| Python         | Playwright for Python, `python testing-course/full/*.py`, browser `channel="msedge"` (Edge installed)                                                                                              |
| Site server    | `npm start` at `http://localhost:5173` (default in the scripts, another address can be passed as the first argument). `docs/testing-kulikov` used port 5190                                        |
| Part 2         | PostgreSQL in Docker (ports 5433 for lab 3 and 5434 for lab 2 per `docs/ITIVP-AUDIT-2026-10-29.md`, section 6), temporary SQLite in lab 3 tests, MongoDB Atlas for lab 6, `.env` in the lab folder |
| CI             | `ubuntu-latest`, `actions/checkout@v4`, `actions/setup-node@v4`, `npm ci`, token permissions `contents: read`                                                                                      |
| Development OS | Windows 11, Git Bash or PowerShell                                                                                                                                                                 |

### 3.6 Entry criteria

- The working copy has no foreign edits in `site/` (in the audit a red `npm test` was caused by another agent's edits in `site/js/script.js`), `npm ci` is done, Node is 20 or newer.
- For e2e: the site server is running, the port is free, Edge is installed, `pip install playwright` is done.
- For Part 2: a free machine, Docker is running, `.env` holds test values or is absent (see 4.9).

### 3.7 Exit criteria

- `npm run format:check` and `npm test` are green, coverage is 100 %.
- `tc:full` ends with code 0, `critical-path-e2e.py`, `extra-e2e.py`, `palette-e2e.py`, `scenarios-e2e.py`, `click-everything.py` were also run, every red item is fixed or recorded as a known defect.
- Part 2 tests were run one by one on a free machine, the JSON files are fresh, `04-full-test-documentation.md` was rebuilt after them.

### 3.8 Risks

| Risk                                                                                                | Impact                              | Measure                                                                                                |
| --------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Load tests `spike: 1000 sockets` (lab 1) and `spike: 400 raw sockets` (lab 7) depend on the machine | Random red `npm test` of the branch | Move to `test:load`, reduce the number of sockets (audit, item 11)                                     |
| Vitest and Jest workers time out on a busy machine (labs 4, PZ3, PZ4, course project)               | A green result cannot be confirmed  | Run one by one, `jest -i`, a larger `testTimeout` (PZ3 already has 30000)                              |
| Configuration tests of labs 2 and 3 are red with a filled `.env` (3 tests)                          | Red locally, green in CI            | Clear the variables in the test, as in `tests/config.test.js` of lab 3 on branch `25`, verify the rest |
| Reports of labs 2, 5 (ru, en) and PZ1 do not match the template after code edits                    | Red `npm test` because of a report  | Rebuild with `npm run lab2:report`, `lab5:report`, then `npm test`                                     |
| Fixed pauses in e2e                                                                                 | Flaky S1 and S13                    | Wait for a condition                                                                                   |
| `gh` is not authorized                                                                              | Red GitHub checks are not visible   | The owner runs `gh auth login`, until then analyze by local reproduction                               |
| `tc:full` does not start the server and leaves out part of the scripts                              | A green `tc:full` is not a full run | A run wrapper (4.6), the list of scripts in 5.2                                                        |

## 4. CHECKLIST

### 4.1 Pyramid and level plan

- [ ] The pyramid table (3.2) is checked against the real `npm test`: the number of tests and files goes into the report (command `npm test`, 97 files in `labs/` and `tools/`)
- [ ] For every TC of the group "Login" (TC-001…TC-021) the automation level or the reason for manual execution is stated (`docs/testing-kulikov/13-test-cases.md`)
- [ ] The same for "Registration" (TC-022…TC-053), "Dashboard, storage, quota" (TC-054…TC-078), "Projects, trash" (TC-079…TC-102), "Shared examples and templates" (TC-103…TC-114), "Editor" (TC-115…TC-128)
- [ ] The same for "API" (TC-171…TC-196) linked to CL-API-01…CL-API-22 (`docs/testing-kulikov/11-checklists.md`)
- [ ] Automated cases are marked in `docs/testing-kulikov/14-traceability-matrix.md` or in a separate column of the report (verify what is customary)

### 4.2 Unit tests and root coverage

- [ ] `npm test` ends with code 0 (command `npm test`)
- [ ] Line, branch and function coverage is 100 % (thresholds are set by flags in `scripts.test` of `package.json`)
- [ ] The files `site/js/dashboard.js` and `editor-palette.js`, which caused 99.63 % in the audit, are covered by tests in `labs/05-javascript-interactivity/`
- [ ] Every test checks a result, not the fact of a call (a sample of 5 `*.test.js` files is reviewed, a test without a checked result is rewritten)
- [ ] Error branches are covered: empty input, large input, wrong type (`tools/server.test.js`, `tools/render-api.test.js`, `labs/05-javascript-interactivity/*.test.js`)
- [ ] Mutation check of weak spots: `node tools/mutate.cjs <file> --cwd <folder>` on `tools/render-api.js`, `site/js/utils/validation.js`, surviving mutants are analyzed
- [ ] Tests do not depend on the current date and locale: the quota "5 diagrams per day" and time are checked with a fixed clock (verify in `labs/05-javascript-interactivity`)

### 4.3 Report tests

- [ ] `report.test.*` of each lab confirms that `report.md` and `report.en.md` are built from the template (audit: red labs 2 and 5, PZ1)
- [ ] After edits of `site/js/script.js`, `npm run lab2:report` and `npm run lab5:report` were run, then `npm test`
- [ ] `tools/lint-report.js` passes over all `labs/*/report*.md` (called from `tools/report-suite.js`, test `tools/lint-report.test.js`)

### 4.4 Server and integration tests of Part 2

- [ ] Lab 1 (`lab21`) and lab 7 (`27`): `npm test`, 78 tests expected in lab 1, `spike: 1000 sockets` and `spike: 400 raw sockets` are moved out or stable
- [ ] Lab 2 (`lab12`): PostgreSQL integration tests fit the time budget or are marked slow, `docker compose up -d` and migrations are described (`db:migrate`, `db:seed`)
- [ ] Lab 3 (`23`): 129 tests, `tests/config.test.js` does not depend on `.env`, the database is a temporary SQLite via `tests/helpers.js` (so on branch `25`, verify on `23`)
- [ ] Lab 6 (`26`): without `MONGODB_URI` the suite fails fast and clearly, not by the 110 second timeout
- [ ] Lab 8 (`28`): `docker.test.mjs`, `hardening.test.mjs`, `report.test.mjs` run after `npm install` in the working copy (the audit found no `node_modules`)
- [ ] PZ1 (`pz21`) and PZ2 (`pz22`): `npm test` is green, the report matches the template
- [ ] Course project (`course-app`): `npm test` of server and client run one by one on a free machine, the output recorded (`docs/ITIVP-AUDIT-2026-10-29.md`, section 6, item 17)
- [ ] Every server suite opens port 0 or a temporary port, not a fixed one (like `listen(0)` in `tests/harness.js` of lab 3)

### 4.5 Contract tests

- [ ] For `GET /api/notations`, `GET /api/grammar`, `POST /api/render`, `/api/validate`, `/api/parse`, `/api/generate` the response shape (fields, types, codes) is described and pinned by a test (`tools/render-api.test.js`, `tools/server.test.js`)
- [ ] The 100000 character limit and error codes 400, 404, 405 are checked (TC-171…TC-196)
- [ ] The contract of the Part 2 server labs is pinned in `tests/contract.test.js` (lab 3) and equivalents in labs 1, 2, 6 (verify they exist)
- [ ] The `postman_collection.json` collections match the real routes: `tools/make-postman.js` and `tools/http-to-postman.js` were rerun, the test `tools/http-to-postman.test.js` is green

### 4.6 E2E and static checks (`npm run tc:full`)

- [ ] The site server is running (`npm start`), port 5173 is free, otherwise the address is passed as the first argument
- [ ] `node testing-course/full/static-sec-perf.js` ends with code 0, 41 checks Passed
- [ ] `python testing-course/full/editor-e2e.py` ends with code 0, 21 checks Passed
- [ ] `python testing-course/full/auth-e2e.py` ends with code 0, 42 checks Passed, the accounts are test ones
- [ ] `python testing-course/full/build-md.py` builds the document without a JSON read error (fresh `critical-path-e2e.json`, `extra-e2e.json`, `palette-e2e.json`, `lab2/results.json`, `lab3/results.json` are needed)
- [ ] `python testing-course/full/critical-path-e2e.py`, `extra-e2e.py`, `palette-e2e.py` are run separately because `tc:full` does not include them (21, 11 and 12 checks Passed)
- [ ] It is decided whether to add these three scripts and `scenarios-e2e.py` to `tc:full` (today a green `tc:full` does not cover all the JSON files that `build-md.py` reads)
- [ ] `tc:full` is a chain with `&&`: after the first red step the rest do not run, this is taken into account in analysis
- [ ] There is no `wait_for_timeout` where a condition can be awaited (list in `scenarios-e2e.py`, `editor-e2e.py`)
- [ ] Every e2e creates its own browser context and sets the key `dslkit.tour-done` in `localStorage` so the tour does not cover the interface
- [ ] Page console errors are collected and written to the JSON (field `console_errors`), for a green run there are none (`scenarios-e2e.json` has 4 now)
- [ ] The scripts take the address as the first argument, the documentation names one default port (5173 in the scripts and 5190 in `docs/testing-kulikov`, bring them to one)

### 4.7 Click everything and scenarios

- [ ] `python testing-course/full/click-everything.py` crawls 13 pages (ru and en) and writes `click-everything.json`
- [ ] The 51 elements without reaction from the last run are analyzed: a defect, a legitimately empty element or a weakness of the heuristic (reaction: address change, DOM, focus, dialog, download, error)
- [ ] A narrow screen run is added: `VIEWPORTS` holds only `desktop 1366x800` now, the 390 px phone is covered separately by scenario S8
- [ ] Scenario S1 (connect block A3 to A4, drag, save) is green: the cause of the timeout of locator `A4` is established, product or test (verify)
- [ ] Scenario S13 (edit code by hand, delete a block with Delete, "Undo") is green: the step "the error did not go away after the edit" is analyzed, three steps after it are marked "previous step failed"
- [ ] The other scenarios S2…S12 and S14 are green (12 of 14 in the saved JSON)

### 4.8 Cross-browser through Playwright

- [ ] The browser is parametrized (environment variable or argument) instead of the hard-coded `chromium.launch(channel="msedge")` in all `testing-course/full/*.py`
- [ ] A run of `editor-e2e.py` and `auth-e2e.py` on Chromium, Edge, Chrome (channels `msedge`, `chrome`)
- [ ] A run on Firefox: the installed build matches the Playwright version (`docs/testing-kulikov/70-cross-browser-matrix.md` records a mismatch of 1555 and 1543), `playwright install firefox`
- [ ] A run on WebKit: `playwright install webkit`, the result against the matrix of `docs/testing-kulikov/70-cross-browser-matrix.md`, device emulation is named Chromium emulation in the report
- [ ] Differences between browsers are filed as bugs in the format of `docs/testing-kulikov/71-cross-browser-bugs.md`

### 4.9 Stability (flaky)

- [ ] Every unstable test from the audit list has a record: test, symptom, cause, solution, owner
- [ ] `spike: 1000 sockets` (lab 1, `tests/stress.test.js`) and `spike: 400 raw sockets` (lab 7) are moved to `npm run test:load` or limited in socket count
- [ ] Vitest of labs 4, PZ3, PZ4 in the working copies runs one by one, `testTimeout` is at least 30000 (as in `vite.config.js` of PZ3), pool options are verified for the installed version
- [ ] Jest in `react-app/` runs with `-i` (`npx jest -i`), without it the workers time out
- [ ] Configuration tests of labs 2 and 3 pass with a filled `.env` and without it (run both ways)
- [ ] Running the same suite 3 times in a row gives one result (`npm test` three times, e2e three times, record the differences)
- [ ] Tests do not depend on file order or on shared state (`localStorage`, database, a file on disk)
- [ ] Timeouts in e2e are set explicitly (in `click-everything.py` 3000 ms per action and 20000 ms per navigation)
- [ ] The machine load during the run is recorded in the report (in `docs/testing-kulikov/70-cross-browser-matrix.md` the run went at about 100 % CPU load)

### 4.10 Test data and seeds

- [ ] The test users A and B from `docs/testing-kulikov/13-test-cases.md` are used identically in all e2e, the passwords never match real ones
- [ ] The seeds in `docs/testing-kulikov/seeds/` (`user-*.json`, `accounts.md`, `load-snapshot.js`) load per `README.md` and give the expected "My projects" screen
- [ ] Before every e2e a clean profile or `localStorage.clear()`, the storage keys are known (`accounts`, `session`, `projects.<id>`, `settings`, `theme`, `dashboard`, `dslkit.tour-done`)
- [ ] The boundary data of the waitlist form lives in `testing-course/lab2/cases.js`, new rows are added there
- [ ] The Part 2 seeds (`seed-data/`, `seeders/` in lab 3) are repeatable: two runs in a row give the same state
- [ ] The temporary database is created and removed inside the test (`createTempDatabase` in `tests/helpers.js`), database files do not stay in the working copy
- [ ] Secrets are not in the repository: `.env` is in `.gitignore`, `.env.example` has no values, values do not reach the chat or the reports (owner rule, `docs/PROJECT-STATE.md`)
- [ ] `.claude/admin-test-account.txt`, `.claude/worktrees/`, `.playwright-mcp/`, `.accelerator/profile.user.json` do not enter a commit (check `git status` before committing)

### 4.11 CI (GitHub Actions)

- [ ] `.github/workflows/ci.yml` is green on the submission branch: steps `npm ci`, `npm run format:check`, `npm test`, `npm audit --omit=dev --audit-level=high`
- [ ] The same order is reproduced locally on Node 24: `npm ci && npm run format:check && npm test && npm audit --omit=dev --audit-level=high`
- [ ] The cause of a red CI is placed in one group: formatting, test, coverage, dependency audit, environment (file name case, line endings, no Edge and Docker on `ubuntu-latest`)
- [ ] The owner has run `gh auth login`, after that `gh run list --branch <branch>` shows the red checks of branches `25`, `28`, `pz21`, `testing-course-full` (until then the status is "verify")
- [ ] Analysis of a red check: `gh run view <id> --log-failed`, then the same command locally (if `gh` is unavailable, open the Actions tab in the browser)
- [ ] The Part 2 branches have their own `ci.yml` (in `check-lab12`, `lab25`, `lab28` it holds `npm ci`, `format:check`, `npm test` without `npm audit`), the differences from the root one are recorded and it is decided whether `audit` is needed there
- [ ] e2e are not part of CI: it is decided whether to add a separate job (needs Edge or Playwright Chromium, `npm start` in the background, JSON artifacts)
- [ ] The versions of actions and Node are pinned (`actions/checkout@v4`, `actions/setup-node@v4`, Node 24), `.github/dependabot.yml` watches `npm` in `/` and `/react-app` and `github-actions`
- [ ] `docs/**/*.json`, `testing-course/**/*.json` are excluded from `prettier` (`.prettierignore`), generated documents do not turn `format:check` red
- [ ] Branches with a red CI are listed in the report with a cause and a decision (not all branches are pushed, list in `docs/ITIVP-AUDIT-2026-10-29.md`, section 6, item 21)

### 4.12 Run reporting

- [ ] After every run these are saved: the `npm test` output (summary, test count, coverage), the JSON files from `testing-course/full/`, `lab2/results.json`, `lab3/results.json`
- [ ] For every kind of check the report holds: command, date, branch, commit, Node and browser version, the number of Passed, Failed, skipped, not run
- [ ] "Not run" is told apart from "Passed" and "Failed" (as in the audit: lab 8 was not run, lab 6 was not confirmed)
- [ ] The metrics from `testing-course/README.md` are computed: executed, successful, defect density, requirements coverage R1…R9
- [ ] Red checks have a defect ID and a link to a test case (TC-…), checklist (CL-…) or scenario (S…)
- [ ] `python testing-course/full/build-md.py` is run after all runs, the date in the document is fresh
- [ ] The Russian and English versions of the report are equal in content (repository rule: Markdown, two languages)

## 5. Run commands

### 5.1 Repository root (`E:\DSLKit-Project`)

```bash
npm ci
npm run format:check
npm test
npm audit --omit=dev --audit-level=high
npm --prefix react-app test -- -i
```

### 5.2 End-to-end checks (site server in a separate terminal)

```bash
npm start
node testing-course/full/static-sec-perf.js
python testing-course/full/editor-e2e.py
python testing-course/full/auth-e2e.py
python testing-course/full/critical-path-e2e.py
python testing-course/full/extra-e2e.py
python testing-course/full/palette-e2e.py
python testing-course/full/scenarios-e2e.py
python testing-course/full/click-everything.py
python testing-course/full/build-md.py
npm run tc:full
npm run tc:lab2
npm run tc:lab3
```

For another address pass it as the first argument, for example `python testing-course/full/editor-e2e.py http://localhost:5190`. The script `static-sec-perf.js` and `tc:lab3` start their own server on a free port.

### 5.3 Rebuilding reports, mutations, linter

```bash
npm run lab2:report
npm run lab5:report
npm run tc:reports
node tools/mutate.cjs tools/render-api.js --cwd . --cmd "node --test tools/render-api.test.js" --max 60
```

### 5.4 Part 2 and ports (one lab at a time)

| Work                | Folder in the working copy under `.claude/worktrees/`                                    | Command                        | Ports and conditions                                           |
| ------------------- | ---------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------- |
| Labs 1, 2, 3        | `lab25/part-2/lab-01-node-server`, `lab-02-sequelize`, `lab-03-auth`                     | `npm test`                     | lab 3 `PORT=3001`, DB 5433, lab 2 `PORT=3000`, DB 5434, `.env` |
| Labs 4, 5, PZ3, PZ4 | `lab25/part-2/lab-04-react-state`, `lab-05-react-api`, `check-pz23/part-2/pz-03-routing` | `npm test` or `npx vitest run` | dev port of lab 5 is 5178, tests take no port                  |
| Lab 6               | `part2-mongo-work-6cc76b/part-2/lab-06-mongodb`                                          | `npm test`                     | `MONGODB_URI` (Atlas) is required                              |
| Lab 7               | `part2-ws-work-ee9b7b/part-2/lab-07-websocket`                                           | `npm test`                     | `spike` loads the sockets                                      |
| Lab 8               | `lab28/part-2/lab-08-docker`                                                             | `npm test`                     | Docker, install `node_modules` beforehand                      |

Before starting, stop the previous suite, check the busy ports (`netstat -ano | findstr :5173` in PowerShell) and do not run several suites in parallel. Which branch sits in which working copy is in `docs/HANDOVER-SESSION-2026-10-28.md`.

### 5.5 Analyzing a red CI

```bash
gh auth login
gh run list --branch testing-course-full --limit 5
gh run view <id> --log-failed
```

Without `gh`: the Actions tab on GitHub, then local reproduction 5.1.

## 6. Artifacts

| Artifact                                             | Path                                                                   | When updated                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| Results of e2e and static checks                     | `testing-course/full/*.json`                                           | after each run of the matching script    |
| Results of the lab 2 and lab 3 checklists            | `testing-course/lab2/results.json`, `testing-course/lab3/results.json` | `npm run tc:lab2`, `npm run tc:lab3`     |
| Summary test documentation                           | `testing-course/documents/04-full-test-documentation.md`               | `python testing-course/full/build-md.py` |
| Critical path document                               | built by `testing-course/full/build-critical.py`                       | after `critical-path-e2e.py`             |
| `npm test` output with coverage                      | attached to the run report (verify the file name customary in `docs/`) | every run                                |
| Manual cases, checklists, bugs, cross-browser matrix | `docs/testing-kulikov/`                                                | kept by specialist 01                    |

Total checklist items: 84.
