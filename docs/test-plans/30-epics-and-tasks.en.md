# Epics, tasks and subtasks for the DSLKit project

Russian version: [`30-epics-and-tasks.md`](30-epics-and-tasks.md). Snapshot of 6 November 2026. Based on [`00-project-checklist.en.md`](00-project-checklist.en.md), [`02-analytics.en.md`](02-analytics.en.md), the specialist plans in [`specialists/`](specialists/), the audit `docs/ITIVP-AUDIT-2026-10-29.md` and the breaker report `docs/testing-kulikov/80-break-report.md`.

## How to read

Identifiers: epic `E1`, task `E1-T1`, subtask `E1-T1.1`. All checkboxes are empty: this is a plan, not a report.

Task fields: **P0…P3** priority (P0 blocks hand-in or breaks data, P1 important, P2 noticeable, P3 cosmetic). **Who**: **O** the owner by hand, **A** an agent can do it without the owner, **D** needs her decision first. **Size**: S up to 1 hour, M up to half a day, L up to a day, XL more than a day (a rough estimate, not a measurement). **Depends** on which tasks.

Rules for all tasks (from `CLAUDE.md` and the owner's decisions): commits only in her name in English with no tool signatures, push and merge into `main` only after her word, secrets only in `.env`, reports and READMEs in Russian and English, stop at 70% of the weekly limit. More in `10-agents-and-skills.en.md` section 1.

Where the plan says "agent": codes `V1…S6` from `10-agents-and-skills.en.md` section 3.

## Epic map and order

| Epic | Name                                                | Priority | Mainly who | Depends on |
| ---- | --------------------------------------------------- | -------- | ---------- | ---------- |
| E1   | Stabilise the build, tests and CI                   | P0       | A, O       | —          |
| E2   | Git: branches, pushes, merges, a clean working tree | P0       | D, A       | E1         |
| E3   | Docker and Lab 8                                    | P0       | A, O       | E1         |
| E4   | Part 2 server works: data, seeds, screenshots       | P1       | O, A       | E1, E3     |
| E5   | Course project                                      | P0       | A, O       | E1, E3, E4 |
| E6   | Reports and conformance to the assignments          | P0       | A, D, O    | E1, E4     |
| E7   | Site and editor quality: defects and interface      | P1       | A          | E1         |
| E8   | Accessibility and usability                         | P1       | A, O       | E7         |
| E9   | Performance and load                                | P2       | A          | E1         |
| E10  | Security                                            | P1       | A          | E7         |
| E11  | Compatibility, responsiveness, localization         | P2       | A, O       | E7         |
| E12  | Test documentation and traceability                 | P1       | A          | E7–E11     |
| E13  | Design, brand, Figma                                | P3       | A, O       | —          |
| E14  | Hand-in: gates, PDF, LMS, defence                   | P0       | O, A       | E2–E6      |
| E15  | External tracks: ITS-2026 theses, MBP, diploma      | P3       | D          | —          |

Order of waves:

1. **Wave 1** (foundation): E1, then E2 and E3 in parallel.
2. **Wave 2** (content): E4, E5, E6, E7 (E7 and E10 together, they touch the same code).
3. **Wave 3** (quality): E8, E9, E10, E11, then E12.
4. **Wave 4** (hand-in): E14. E13 and E15 run separately and do not block the hand-in.

---

## E1. Stabilise the build, tests and CI

Goal: on every branch to be handed in `npm test` is green and repeatable, CI is not red. Done when: the table "work → tests → passed → failing" has no unexplained red.

- [ ] **E1-T1** (P0, A, M) Put the run of all works in one table. Agents V1, V2. Skills: `COMPLETION-VERIFICATION`, `PIPELINE-CHECK-SELECTION`.
  - [ ] E1-T1.1 Root: `npm test`, `npm run format:check`, record the test count and coverage (1026 of 1026 on 6.11).
  - [ ] E1-T1.2 `react-app/`: `npx jest -i`.
  - [ ] E1-T1.3 Part 2 branches (13 works) in separate working copies: `npm install`, `npm test`, compare the count with README and report.
  - [ ] E1-T1.4 Write the result in a run protocol (date, commit, environment).
- [ ] **E1-T2** (P1, A, M) Unstable load tests. Depends on E1-T1.
  - [ ] E1-T2.1 Lab 1: move `spike: 1000 sockets` out of `npm test` into `npm run test:load`.
  - [ ] E1-T2.2 Lab 7: `spike: 400 raw sockets` likewise.
  - [ ] E1-T2.3 Course project: `load: 600 authenticated reads` (p95 over 3 s on a busy machine) move out or relax with a justification.
  - [ ] E1-T2.4 Document in each work's README.
- [ ] **E1-T3** (P1, A, M) `.env` isolation in Lab 2 and Lab 3 tests (three config tests are red with a filled `.env`).
  - [ ] E1-T3.1 Clear `process.env` in the tests before checking config.
  - [ ] E1-T3.2 Check that `npm test` is green with a filled `.env`.
  - [ ] E1-T3.3 A note in the README on how to run.
- [ ] **E1-T4** (P1, A, M) Completeness of the sets: a script shows 2 tests for Lab 4, Lab 5, PZ3, PZ3 v6, PZ4.
  - [ ] E1-T4.1 Run component tests directly (`npx vitest run`) on a free machine.
  - [ ] E1-T4.2 Compare the count with the table in `docs/PROJECT-STATE.md` section 3.
  - [ ] E1-T4.3 Fix the counting script if it counts only the report tests.
- [ ] **E1-T5** (P1, A, M) End-to-end scenarios: `scenarios-e2e.py` (3 of 14 failed on 28.10, S13 among them) and `click-everything.py` (never run).
  - [ ] E1-T5.1 Run in the foreground, record the actual result.
  - [ ] E1-T5.2 If red remains, diagnose the cause before any fix (`ERROR-DIAGNOSIS`): suspected seeds or the auto-created project.
  - [ ] E1-T5.3 Update the scenarios for the quota that now blocks creation (commit `3bb2482`).
  - [ ] E1-T5.4 In the saved `scenarios-e2e.json` S1 (locator timeout `A4`) and S13 (step "the error did not go away after the edit", three more steps not run) are red, and it has 4 console errors. Check whether this still reproduces.
  - [ ] E1-T5.5 `click-everything.json`: 366 elements, 51 without a reaction, only desktop in `VIEWPORTS`. Go through the 51 (defect or legitimately inert) and add a phone width.
- [ ] **E1-T6** (P0, O, M) Red GitHub Actions checks on `25`, `28`, `pz21`, `testing-course-full`.
  - [ ] E1-T6.1 Run `gh auth login` by hand.
  - [ ] E1-T6.2 Read the logs of the failed steps and sort by cause.
  - [ ] E1-T6.3 Fixes for each branch as a separate commit.
- [ ] **E1-T7** (P2, A, S) Port in documents: `npm start` listens on 5173, older documents say 5190. Bring all checklists and scripts into line.
- [ ] **E1-T8** (P1, A, M) Completeness of `npm run tc:full` and CI. Source: automation plan `specialists/02-test-automation.en.md`.
  - [ ] E1-T8.1 `tc:full` is a `&&` chain and does not run `critical-path-e2e`, `extra-e2e`, `palette-e2e`, `scenarios-e2e`, `click-everything`, although `build-md.py` reads their JSON. Either add them to the chain or describe a separate command.
  - [ ] E1-T8.2 CI (root `ci.yml`: `npm ci`, `format:check`, `npm test`, `npm audit`) does not run e2e. Decide whether a separate manual or nightly run is needed.
  - [ ] E1-T8.3 Part 2 branches (`check-lab12`, `lab25`, `lab28`) have no `npm audit` in CI.
  - [ ] E1-T8.4 `channel="msedge"` is hard-coded everywhere: parametrise the browser for Firefox and WebKit.

## E2. Git: branches, pushes, merges, a clean working tree

Goal: a clear branch map, nothing valuable lives only locally, the working tree is free of foreign clutter. Done when: the list "branch → pushed → merged" is current and `git status` of the root branch is clean.

- [ ] **E2-T1** (P0, D, S) Owner decisions before starting (ask in one message, answered by numbers).
  - [ ] E2-T1.1 Which Part 1 branch to hand in (`work/part1-finish`, `integration/part1`, `testing-course-full`).
  - [ ] E2-T1.2 Whether to push local branches (`work/part1-finish` is 14 commits ahead of origin, `tcf-clean`, `testing-course`, `lab7-stubs`, `design/own-fonts-mascot`, 11 `claude/*` branches, 3 `backup/*` branches).
  - [ ] E2-T1.3 Whether to open a pull request `integration/all` into `main`.
- [ ] **E2-T2** (P1, A, M) Branch map. Make a table "branch → working copy → last commit → origin → merged" in `docs/PROJECT-STATE.md` (RU and EN).
- [ ] **E2-T3** (P1, D→A, M) Foreign uncommitted changes in `testing-course-full`.
  - [ ] E2-T3.1 Go through `docs/testing-kulikov/20…71` (7 untracked md files), 4K screenshots, reformatted JSON.
  - [ ] E2-T3.2 Decide the fate of `DSLKit-Project/` (unclear origin), `.claude/cleanup-e-drive.ps1`, `.claude/launch.json`.
  - [ ] E2-T3.3 Commit what is needed by meaning, delete the rest or add to `.gitignore` (only with her word).
- [ ] **E2-T4** (P1, A, S) Check that `package-lock.json` is correct (commit `c92ab6d` added `esbuild`), CRLF/LF per `.gitattributes`.
- [ ] **E2-T5** (P1, A, M) Logo sets `final-v2…v7`, `survey`, `test-round-2…5`, `AB-TEST-PLAN.md`, `docs/ANALOGS-AND-INSPIRATION.md`: check whether they are in history, commit what is missing.
- [ ] **E2-T6** (P2, D, M) Course project: the note, defence cards and cheat sheet live in `course-app`, not brought back to `course-project`. Decide where the single source is.

## E3. Docker and Lab 8

Goal: the Lab 8 stack builds from scratch and works, evidence taken. Done when: three containers healthy, data survives `down` and `up`, a `docker ps` screenshot.

- [ ] **E3-T1** (P0, A, L) Check `integration/all` and `part-2/lab-08-docker`. Agent V3. Skills: `DOCKER-COMPOSE-LOCAL-STACK`, `DOCKER-IMAGE-BUILD`, `DOCKER-DATA-LOSS-CONFIRMATION`.
  - [ ] E3-T1.1 `docker compose config` (already checked), then `docker compose up --build`, wait for healthy.
  - [ ] E3-T1.2 `/api/health` through Nginx and directly, register, log in, create a diagram, a 401 answer without a token.
  - [ ] E3-T1.3 `down` and `up`: data in place. `down -v` only with her explicit "yes".
  - [ ] E3-T1.4 The pgAdmin and Redis profiles.
  - [ ] E3-T1.5 Protocol and `docker ps` output in `docs/evidence/`.
- [ ] **E3-T2** (P1, A, M) Ports per the assignment: 80 and 5000 through `.env` (defaults 8080 and 3000), a note in the Lab 8 report.
- [ ] **E3-T3** (P1, O, S) A `docker ps` screenshot on her machine on ports 80 and 5000.
- [ ] **E3-T4** (P1, O, M) Docker Hub: push `rnxdhehe/dslkit-backend` and `rnxdhehe/dslkit-frontend` only after her "push the image". Check local image names (`docker images`).
- [ ] **E3-T5** (P2, A→O, M) Render for `course-app`: on the words "make render.yaml" the agent creates the file, the deploy is by hand.
  - [ ] E3-T5.1 `render.yaml` and environment variables by names only, no values.
  - [ ] E3-T5.2 Put the address into the course-project note.

## E4. Part 2 server works: data, seeds, screenshots

Goal: every server work runs on her data and has evidence for the report. Done when: Lab 1, Lab 2, Lab 3, Lab 6, PZ2 have Postman screenshots of every endpoint, Lab 2, Lab 3, Lab 6 have seeds.

- [ ] **E4-T1** (P0, O, M) Fill `.env`: Lab 2 (DB port 5434, `PORT=3000`), Lab 3 (`PORT=3001`, DB 5433, `JWT_SECRET` at least 32 characters, admin and demo passwords at least 10), Lab 6 (`MONGODB_URI`). Do not show values in chat.
- [ ] **E4-T2** (P1, O, M) Atlas M0: cluster, user, Network Access, `/dslkit` in the URI.
- [ ] **E4-T3** (P1, A, L) Seeds for Lab 2, Lab 3, Lab 6 (chosen by the owner, not made). Skills: `DATA-QUALITY-CONTROLS`.
  - [ ] E4-T3.1 Repeatable seeds (a second run does not duplicate).
  - [ ] E4-T3.2 Tests for the seeds and migration rollback.
- [ ] **E4-T4** (P0, O, L) Postman: import the collections of Lab 1, Lab 2, Lab 3, Lab 6, PZ2 and capture responses 201, 409, 400, 200, 401, 403 (a screenshot of every endpoint).
- [ ] **E4-T5** (P1, O, M) Screenshots of the DB structure (pgAdmin or DBeaver), Atlas and Compass, Swagger UI.
- [ ] **E4-T6** (P1, A, L) Error pages 401, 403, 404, 500 and network in Lab 4, Lab 5, PZ4 (only in `pz23` now, commits `fe27e69`, `cb934b2`), each with "what it is, why it happened, how to fix it".
- [ ] **E4-T7** (P1, O→A, M) Lab 5 with the real Lab 3 server (`VITE_API_URL` without `/api`, client on 5178, server from branch 25 with CORS).
- [ ] **E4-T8** (P2, A, M) Lab 7: add a note to the report that the client has no React (allowed by task 2), or move it to React. Lab 3: a note on the 15-minute lock, not 5.
- [ ] **E4-T9** (P2, A, M) Check `lint`/ESLint and the server works' READMEs for current ports (PostgreSQL, 3001/5433).

## E5. Course project

Goal: a defence kit. Done when: the note in Word is 20–30 pages, tests and diagrams are current, deploy is ready.

- [ ] **E5-T1** (P0, A, M) Re-run the server tests on a free machine, replace 225 with 226 in the note, README, `app/README.md`, defence cards (the note has a `[TODO]`).
- [ ] **E5-T2** (P1, A, M) Re-render `er.svg`, `usecase.svg`, `c4-containers.svg` (`mermaid-cli`, command in the README).
- [ ] **E5-T3** (P1, A, S) Add tag requests to `postman_collection.json` and `requests.http`.
- [ ] **E5-T4** (P1, D, S) Admin screen: deleting a tag exists only in the API. Decide whether a screen is needed (the admin screen was out of scope).
- [ ] **E5-T5** (P0, O, XL) The note in Word: title page, assignment, contents, 20–30 pages, appendices V and Zh (all screens, test output), source 20 (a book not older than 5 years), access dates.
- [ ] **E5-T6** (P1, A, M) Measure NFR6 and NFR8 (not done per `docs/ITIVP-CHECK.md`), output into the note.
- [ ] **E5-T7** (P1, D, S) Agree the DSLKit topic with the teacher for variant 26, record the date and name in `docs/PROJECT-STATE.md`.
- [ ] **E5-T8** (P2, A, M) Defence cards and cheat sheet updated for 5 entities, 21 endpoints, 32 control examples.

## E6. Reports and conformance to the assignments

Goal: every report is built, passes the linter and meets the assignment. Done when: the specialist 08 tables are filled, no red reports.

- [ ] **E6-T1** (P0, D, S) Control question rule: n−1, n, n+1 (per the owner's retelling, `docs/notes/06-teacher-requirements.md`) or all (as the audit reads it). Ask the teacher, record the answer. Questions Q-01…Q-11 in `specialists/08-docs-acceptance.en.md`.
- [ ] **E6-T2** (P0, A, M) Red report tests.
  - [ ] E6-T2.1 PZ1: `report.md` and `report.en.md` differ from the template (2 tests), rebuild from `report.tpl.md`.
  - [ ] E6-T2.2 Part 1: rebuild the Lab 2 and Lab 5 reports after any change to `site/js/script.js`, `style.css`, `variables.css`.
  - [ ] E6-T2.3 The Lab 4 report is already rebuilt (`ccb4b0b`): re-check after the next CSS changes.
- [ ] **E6-T3** (P1, A, L) Answers to control questions in all reports per the decision of E6-T1 (take answers from `docs/study/`).
- [ ] **E6-T4** (P1, A, M) Stale texts.
  - [ ] E6-T4.1 `docs/study/00-RUN-GUIDE.md` and `docs/study/11`: PostgreSQL and ports 3001/5433/5434.
  - [ ] E6-T4.2 Part 1 Lab 5–8 reports: remove "Firefox and Edge remain a task" (they were checked).
  - [ ] E6-T4.3 Test counts in READMEs and reports of Part 2 works per the facts of E1-T1.
- [ ] **E6-T5** (P1, O, L) Missing Part 1 screenshots: Lab 2 (terminal with versions, VS Code with extensions, explorer, Source Control), Lab 3 and Lab 5 (VS Code with code), Lab 6 (console), Lab 8 (Network, React DevTools).
- [ ] **E6-T6** (P2, A, M) Part 1 Lab 7: component hierarchy diagram, port 5174 against 5173; the stub version of Lab 7 lives in `labs/07-react-components/react-app/`, edit it there.
- [ ] **E6-T7** (P2, A, M) Repeat W3C HTML and CSS, Schema.org, Rich Results after all changes (agent C5).
- [ ] **E6-T8** (P1, D, S) PZ3: finally v6, leave only `pz-03-routing-v6` in `pz23` or explicitly keep both.
- [ ] **E6-T9** (P2, D, S) Questions to the teacher: Lab 1 data (decision "array" made), 500 page in client works (decision made), SQLite or PostgreSQL (PostgreSQL decided). Close questions 31–32 in `docs/study/33-QUESTIONS.md` by recording the decisions.

## E7. Site and editor quality: defects and interface

Goal: close the found defects and finish the interface. Done when: all Critical and Major from `80-break-report.md` and the open BUG-N are fixed or accepted as a risk.

- [ ] **E7-T1** (P0, A, L) Breaker findings, Critical.
  - [ ] E7-T1.1 B-01: the editor slows down on a big graph (100 vertices and up per script `break-01-editor-load.py`).
  - [ ] E7-T1.2 B-02: `POST /api/render` with a big graph hangs the server (script `break-02-api-dos.mjs`).
  - [ ] E7-T1.3 B-03: the U+2028 character in DSL.
  - [ ] E7-T1.4 Every fix with a test, re-check with the script.
- [ ] **E7-T2** (P1, A, L) Major findings B-04…B-08 and the rest (B-09…B-18 per the report table).
  - [ ] E7-T2.1 B-04: two tabs, project in the trash, edit in the other.
  - [ ] E7-T2.2 B-05: the 201st project at a limit of 200.
  - [ ] E7-T2.3 B-06: `localStorage` overflow, a save-error message.
  - [ ] E7-T2.4 B-07: log out in another tab, then "Save".
  - [ ] E7-T2.5 B-08: `localStorage` access denied (SecurityError).
- [ ] **E7-T3** (P1, A, M) Open defects of the manual run BUG-N07, N08, N09, N12…N17 (`docs/testing-kulikov/51-manual-bugs.md`, `21-bug-reports.md`) and cross-browser BUG-CB-01…08, CSS-01…21, HTML-01…04 (`71-cross-browser-bugs.md`, `95-markup-css-audit.md`).
- [ ] **E7-T4** (P1, A, L) Finish the interface: alignment of palette, editor bottom bar, card menus, forms, settings, welcome, dashboard; one settings icon. Show at 375, 768, 1366 px and get her approval.
- [ ] **E7-T5** (P1, A, M) Dark theme and contrast of new elements with `tools/contrast.js`.
- [ ] **E7-T6** (P2, A, M) Quota: bind the text "3 of 5" on `settings.html` and `welcome.html` to the real number; user templates on welcome.
- [ ] **E7-T7** (P2, A, M) Update test cases TC-069…TC-073 and risk R-08: the quota blocks creation (BUG-N19).
- [ ] **E7-T8** (P2, A, M) Code review and bug hunt (V4): the site, Labs 3–8 (two passes were cut off by the limit).

## E8. Accessibility and usability

Goal: WCAG 2.2 AA on all pages. Done when: checklist 04 passed, no level A and AA violations or they are accepted.

- [ ] **E8-T1** (P1, A, L) Fixes from `docs/project/TODO.md`: `aria-label` on toolbar and Activity bar icons, `role="switch"` on autosave, visible focus, click target at least 24 px (commit `fb6913c` makes 44 px, verify).
- [ ] **E8-T2** (P1, A, XL) Keyboard navigation over the canvas (Tab, arrows), an alternative to the canvas for screen readers.
- [ ] **E8-T3** (P1, A, M) Automatic run: axe-core, Lighthouse accessibility, `tools/contrast.js` in light and dark themes.
- [ ] **E8-T4** (P2, O, L) Check with a real screen reader (NVDA, VoiceOver, TalkBack), zoom 200% and 400%.
- [ ] **E8-T5** (P2, O, XL) Usability sessions with 3–5 participants (tasks T1–T9, TSR, SUS, UMUX). Exit thresholds (TSR ≥ 80%, SUS ≥ 68) were proposed by the specialist and await her decision.
- [ ] **E8-T6** (P3, D, M) A/B testing: resolve contradictions in the answers, protocol in `docs/project/ab-results/`, sample size from `AB-TEST-PLAN.md`.

## E9. Performance and load

Goal: measured numbers instead of assumptions. Done when: a results table per plan 05.

- [ ] **E9-T1** (P2, A, L) Web Vitals and Lighthouse per page (LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms as "good"), size budget.
  - [ ] E9-T1.1 `docs/metrics/lighthouse-landing` and `lighthouse-editor` have no performance category (accessibility, practices, SEO were measured): capture performance again. For the Lab 8 React app the numbers exist (FCP and LCP 352 ms, CLS 0, TBT 0).
- [ ] **E9-T5** (P1, A, M) Autosave `source-autosave.js` works as a debounce: while typing with pauses shorter than 1000 ms nothing is written, and closing the tab may lose data. Check with a scenario and propose a maximum delay. Source: plan `specialists/05-performance.en.md` item F2.
- [ ] **E9-T6** (P2, A, S) Service worker `dslkit-v5`: pages are network-first with no timeout, on a hanging network the saved copy may not show (item G3 of plan 05).
- [ ] **E9-T2** (P2, A, L) First render time by diagram size (10, 100, 1000, 5000 nodes) and memory in a long session. Related to E7-T1.
- [ ] **E9-T3** (P3, A, L) SVG and Canvas measurements (FPS, first frame), cost of adding and removing edges: not measured in `paper-its`.
- [ ] **E9-T4** (P2, A, M) Load scenarios of the Part 2 servers (smoke, load, stress, spike, soak) in a separate run recording the machine load. Related to E1-T2.

## E10. Security

Goal: confirmed protection of her own application. Done when: checklist 03 closed or an accepted risk recorded.

- [ ] **E10-T1** (P1, A, L) XSS and SVG: project names, DSL, file import, SVG sanitising, CSP.
- [ ] **E10-T2** (P1, A, M) Password storage (PBKDF2-SHA-256 with salt), session, logout, `localStorage`; the accepted limitation R-05 (browser-side accounts do not replace server ones).
- [ ] **E10-T3** (P1, A, L) Part 2 servers: JWT, roles, IDOR, login lock (5 failures for 15 minutes), CSRF, CORS, helmet, WebSocket `Origin`.
- [ ] **E10-T4** (P1, A, S) `npm audit` of the root, `react-app/`, the servers and clients of Part 2.
- [ ] **E10-T5** (P1, A, S) Scan the repository for secrets and `.env` (only `.env.example`), gate S1 items 5 and 6.
- [ ] **E10-T6** (P2, A, M) Render API: the 100000 character limit, DoS per B-02, request rate limit.
- [ ] **E10-T7** (P2, A, M) Docker: non-root user, closed network, secrets outside the image.

## E11. Compatibility, responsiveness, localization

Goal: confirmed browsers and devices, full bilingual support. Done when: the plan 06 matrix is filled.

- [ ] **E11-T1** (P2, A, L) Playwright: Chromium, Firefox, WebKit on desktop and mobile emulation (Firefox and WebKit did not start before).
- [ ] **E11-T2** (P2, O, L) Real iOS and Android, Edge, Safari; PWA install in Chrome.
- [ ] **E11-T3** (P2, A, M) `color-mix` without `@supports` (11 places), print style only in `editor.css`, `theme-color` repeated in `site/index.html`, manifest only in Russian, service worker version `dslkit-v5`.
- [ ] **E11-T4** (P2, A, M) Localization: translation completeness, `hreflang`, `canonical`, string lengths, English app pages.
- [ ] **E11-T5** (P3, A, S) Install `puppeteer-core` (`--no-save`) for `tools/evidence/cross2.mjs`.

## E12. Test documentation and traceability

Goal: a run leaves traces. Done when: the traceability matrix and defect reports are updated from facts.

- [ ] **E12-T1** (P1, A, M) Run the smoke test and critical path per plan 01 and record a protocol.
- [ ] **E12-T2** (P1, A, L) Fill the specialists' checklists with real results (checkboxes, date, commit, environment).
- [ ] **E12-T3** (P1, A, M) Update `docs/testing-kulikov/14-traceability-matrix.md` (REQ → case → result), add cases for the new pages (docs, expert, decision, `/api/ai/*`, `/api/engines`, `/api/external`).
- [ ] **E12-T4** (P2, A, S) Defect reports next to `21-bug-reports.md`, `31-api-bug-reports.md`, `42-bug-reports.md`, in one format.
- [ ] **E12-T5** (P1, A, M) A summary test report (defects, metrics, residual risks, owner decisions).

## E13. Design, brand, Figma

- [ ] **E13-T1** (P3, O, M) Upload to Figma 24 PNGs of the six new notations and 4 PNGs of editor features (the file with 432 pictures does not load: close tabs, open once, wait).
- [ ] **E13-T2** (P3, D, M) Decisions on fonts, palette and radii (now Inter, JetBrains Mono, Kubik).
- [ ] **E13-T3** (P3, A, S) Audit of the golden ratio and the earlier approved design rules: a report in `docs/`.

## E14. Hand-in: gates, PDF, LMS, defence

Goal: every work handed in. Done when: for each work the 12 gate S1 items (`10-agents-and-skills.en.md` section 5) are passed.

- [ ] **E14-T1** (P0, A, L) Gate S1 for each branch: tests, reports, AI traces in history, secrets, forbidden paths, commit author, branch name.
- [ ] **E14-T2** (P0, O, XL) Title pages and Word per the company standard ("Prepared by Khadzhinova K.A.", "Checked by Khadzhinova N.V."), contents.
- [ ] **E14-T3** (P0, A, L) Report PDFs in `E:\Downloads\` (HTML + Edge), compare with Markdown.
- [ ] **E14-T4** (P0, O, M) Upload PDFs and branch links to the LMS (Labs 1–8 of Part 1, Labs 1–8, PZ1–4 and the course project of Part 2).
- [ ] **E14-T5** (P1, A, L) Defence preparation: questions n−1, n, n+1, "write it with me" exercises (PATCH, 409, 500 page, middleware order, `jwt.verify`, CSRF), a run by examiner agents (N2).
- [ ] **E14-T6** (P1, D, S) Pushes and merges: order of publishing branches, then merge into `main` only on her word (agent S4).
- [ ] **E14-T7** (P2, A, M) Handover document `docs/HANDOVER-SESSION-*.md` and updates of `PROJECT-STATE.md`, `00-project-checklist.en.md` (agent S5).

## E15. External tracks (outside the ITIVP hand-in)

- [ ] **E15-T1** (P3, D, M) ITS-2026 theses: article 2 not updated in Overleaf, SVG/Canvas measurements not included, the CMT deadline 26.10.2026 has passed, the reference to the earlier article has no venue and pages.
- [ ] **E15-T2** (P3, D, S) MBP Lab 1 and Lab 2: branches `docs/mbp-lr1`, `docs/mbp-lr2` only local, push after her "yes".
- [ ] **E15-T3** (P3, D, S) Diploma (June 2027): new stack, backend, SRS and ADR documents: after the topic and scope are agreed with the supervisor.

---

## Dependency graph (short)

`E1` → `E2`, `E3` → `E4` → `E5`, `E6` → `E14`. `E7` → `E8`, `E10`, `E11` → `E12` → `E14`. `E9` depends on `E1` and partly on `E7-T1`. `E13` and `E15` are independent.

Critical path to hand-in: E1-T1 → E1-T6 → E3-T1 → E4-T1 → E4-T4 → E6-T2 → E6-T3 → E14-T1 → E14-T3 → E14-T4. The owner decisions E2-T1 and E6-T1 are needed as early as possible, they cost nothing in work and unblock a large amount.

## What an agent can do right now (without the owner)

E1-T1, E1-T2, E1-T3, E1-T4, E1-T5, E1-T7, E2-T2, E2-T4, E2-T5, E3-T1 (with her "yes" for deleting commands), E5-T1…E5-T3, E6-T2, E6-T4, E7-T1…E7-T3, E8-T1, E8-T3, E10-T1, E10-T2, E10-T4, E10-T5, E12-T1…E12-T5.

## What is needed from the owner

Decisions: E2-T1, E6-T1, E6-T8, E5-T4, E5-T7, E2-T6. By hand: E1-T6, E3-T3, E3-T4, E4-T1, E4-T2, E4-T4, E4-T5, E5-T5, E6-T5, E14-T2, E14-T4, E11-T2, E8-T4, E8-T5.
