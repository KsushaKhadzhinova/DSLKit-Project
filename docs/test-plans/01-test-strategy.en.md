# DSLKit overall test strategy: plans for every kind of testing

Russian version: [`01-test-strategy.md`](01-test-strategy.md). Version 1.0, 6 November 2026, branch `docs/test-plans-and-checklists`.

This document ties every kind of testing in the project into one plan and points to the detailed plans and checklists of the specialists in [`specialists/`](specialists/). It does not replace the existing set [`docs/testing-kulikov/`](../testing-kulikov/) (test plan 10, checklists 11, test cases 13, traceability matrix 14, run reports 20–95). It refers to it and adds what is missing there: coverage of Part 2 and the course project, the run order, and the split by specialist.

## 1. Test objects

| No. | Object                                                        | Where                                                 | Environment                                                                  |
| --- | ------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| O1  | DSLKit site and editor (RU, EN, both themes, PWA)             | `site/`, branch `testing-course-full`                 | `npm start` (port: 5173 per `package.json`, 5190 in older documents, verify) |
| O2  | Own rendering API (`/api/render`, `/api/validate` and others) | `tools/render-api.js`, `tools/server.js`              | local                                                                        |
| O3  | Reports and document build of Part 1 (Labs 1–8)               | `labs/`, `tools/build.js`, `tools/lint-report.js`     | Node.js                                                                      |
| O4  | Part 1 React app                                              | `react-app/`                                          | Jest, `-i`                                                                   |
| O5  | Part 2 server works (Lab 1–3, Lab 6, PZ1, PZ2)                | branches `lab21`, `lab12`, `23`, `26`, `pz21`, `pz22` | PostgreSQL 16 in Docker, Atlas, SQLite in tests                              |
| O6  | Part 2 client works (Lab 4, Lab 5, PZ3, PZ4)                  | branches `24`, `25`, `pz23`, `pz24`                   | Vitest                                                                       |
| O7  | Real time and containers (Lab 7, Lab 8)                       | branches `27`, `28`, `integration/all`                | Socket.IO, Docker Compose                                                    |
| O8  | Course project (client, server, note)                         | branch `course-app`                                   | PostgreSQL, Vite                                                             |
| O9  | Documentation and conformance to the assignments              | `docs/`, `materials/`, reports                        | manual check and linter                                                      |

## 2. Kinds of testing and who owns them

| Kind of testing                             | Objects       | Plan and checklist                                                                                   | Basis in the repository                                 |
| ------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Smoke, critical path                        | O1, O2        | [`specialists/01-qa-functional.en.md`](specialists/01-qa-functional.en.md)                           | `testing-course/documents/05-business-critical-path.md` |
| Functional, boundary values, negative       | O1, O2        | `specialists/01-qa-functional.en.md`                                                                 | `docs/testing-kulikov/13-test-cases.md`                 |
| Regression                                  | O1–O8         | `specialists/01-qa-functional.en.md`, `specialists/02-test-automation.en.md`                         | `npm test`, `npm run tc:full`                           |
| Exploratory and acceptance (UAT)            | O1            | `specialists/01-qa-functional.en.md`                                                                 | `docs/testing-kulikov/50-manual-click-run.md`           |
| Unit and integration                        | O1–O8         | [`specialists/02-test-automation.en.md`](specialists/02-test-automation.en.md)                       | `node:test`, Vitest, Jest                               |
| End-to-end and automation                   | O1, O8        | `specialists/02-test-automation.en.md`                                                               | `testing-course/full/*.py`                              |
| Security                                    | O1, O2, O5–O8 | [`specialists/03-security.en.md`](specialists/03-security.en.md)                                     | `docs/testing-kulikov/61-security-code-review.md`       |
| Accessibility and usability                 | O1, O6, O8    | [`specialists/04-accessibility-ux.en.md`](specialists/04-accessibility-ux.en.md)                     | `docs/testing-kulikov/60-ux-a11y-review.md`             |
| Performance and load                        | O1, O2, O5–O8 | [`specialists/05-performance.en.md`](specialists/05-performance.en.md)                               | `paper-its/bench`, spike tests                          |
| Cross-browser, responsiveness, localization | O1, O3        | [`specialists/06-compatibility-localization.en.md`](specialists/06-compatibility-localization.en.md) | `docs/testing-kulikov/70-cross-browser-matrix.md`       |
| API, database, WebSocket, Docker            | O2, O5–O8     | [`specialists/07-backend-db-docker.en.md`](specialists/07-backend-db-docker.en.md)                   | `docs/testing-kulikov/30-api-test-run.md`, Postman      |
| Documentation acceptance and conformance    | O3, O8, O9    | [`specialists/08-docs-acceptance.en.md`](specialists/08-docs-acceptance.en.md)                       | `docs/ITIVP-AUDIT-2026-10-29.md`                        |

## 3. Approach

Testing is mixed: manual by test cases and checklists, plus automation where it already exists. The levels go from cheap to expensive: linters and formatting, unit tests, integration, end-to-end, manual and exploratory sessions, non-functional measurements. Priorities: P0 blocks release or hand-in, P1 important defect, P2 noticeable, P3 cosmetic.

Technical rules for a run:

1. Run `npm test` as a single process: ports and temporary databases are shared.
2. Run Part 2 client tests and `react-app/` on a free machine (`npx jest -i`, `npx vitest run`), otherwise worker timeouts are possible.
3. Run Lab 2 and Lab 3 tests without a filled `.env` (otherwise the config tests go red).
4. Run e2e scripts in the foreground, they hang in the background.
5. Set the key `dslkit.tour-done=true` before an end-to-end run, otherwise the tour opens.
6. Do not run `docker compose down -v`, `docker system prune` and the like without the owner's explicit yes: they delete data.

## 4. Entry and exit criteria

Start of a run:

- the build is pinned by a commit, the tree is clean or the list of differences is written in the protocol;
- `npm install` is done, `npm test` in the root is green;
- the site answers on its own port (5173 or 5190, see the objects table), the console is clean on all six `/app/*` pages;
- for Part 2: the database is running, migrations are applied, `.env` is filled only for servers, not for unit tests.

End of a run:

- all P0 and P1 cases are executed, no open P0 defects;
- open P1 defects have an owner decision (fix or accept the risk);
- the specialists' checkboxes are filled, results are written in the run protocol with the date, commit and environment;
- the traceability matrix is updated, new defects are filed with steps, expected and actual results.

Suspension: a blocking build defect, an unavailable environment (Docker, Atlas, Kroki), 70% of the weekly account limit. Resumption: after the fix and a repeated smoke run.

## 5. Order of execution

| Stage | What we do                                                                                           | Who                                 |
| ----- | ---------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1     | Close the unfinished items of [`00-project-checklist.en.md`](00-project-checklist.en.md) (section 2) | agent, then the owner for section 3 |
| 2     | Automatic checks: `npm test`, `format:check`, `tc:full`, Part 2 branch tests                         | automation (02)                     |
| 3     | Smoke test and critical path, then regression                                                        | QA (01)                             |
| 4     | API, DB, WebSocket, Docker                                                                           | backend (07)                        |
| 5     | Security, accessibility, performance, compatibility (in parallel)                                    | specialists 03–06                   |
| 6     | Acceptance of documentation and reports, check against the assignments                               | documentation (08)                  |
| 7     | Summary report: defects, metrics, residual risks, owner decisions                                    | QA (01)                             |

## 6. Metrics

- Share of passed P0–P3 cases and number of open defects by severity.
- Unit-test coverage (threshold 100% of lines, branches and functions for `npm test` in the root).
- Requirement coverage by cases from the traceability matrix (`docs/testing-kulikov/14-traceability-matrix.md`).
- For non-functional checks: Web Vitals, p95 response time, number of WCAG violations, number of differences between browsers.

## 7. Risks

| Risk                                                           | What to do                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Kroki and other external services are unavailable              | test the behaviour on service failure, do not load someone else's service |
| Browser-side accounts do not replace server checks (risk R-05) | record as an accepted limitation, check server protection only in Part 2  |
| Load tests are unstable on a busy machine                      | move to a separate run, record the machine load                           |
| No access to Atlas, Postman, Docker Hub                        | items are marked "by the owner's hand" in the project checklist           |
| Foreign uncommitted changes in the working tree                | run from a clean working copy (`git worktree add`)                        |
| Account limit                                                  | stop at 70%, write the state in the protocol                              |

## 8. Artifacts

- Run protocols following the template in `specialists/*` (date, commit, environment, result per checkbox).
- Defect reports next to the existing `docs/testing-kulikov/21-bug-reports.md`, `31-api-bug-reports.md`, `42-bug-reports.md`.
- An updated traceability matrix.
- A summary test report (stage 7).
