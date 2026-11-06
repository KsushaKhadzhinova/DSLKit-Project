# Next steps, detailed statuses and questions for the owner

Russian version: [`40-next-steps-and-questions.md`](40-next-steps-and-questions.md). Snapshot of 6 November 2026. Adds to [`00-project-checklist.en.md`](00-project-checklist.en.md) (short), [`02-analytics.en.md`](02-analytics.en.md) (numbers and risks) and [`30-epics-and-tasks.en.md`](30-epics-and-tasks.en.md) (epics and tasks). The same things are laid out here in detail: what exactly is unfinished and why, what is in progress, what is planned, the steps and order for moving on, and a list of questions without whose answers part of the work stands still.

How to answer the questions: by numbers, for example "1b, 2a, 3 no". Each question has a plain explanation, an example, options and my recommendation.

Reliability: root tests were run on 6.11 (1026 of 1026). Other numbers and statuses come from repository documents, agent reports and the last chat messages, so where it says "verify" I did not confirm it in this snapshot.

## 1. What is happening right now

- **In progress** (really running): nothing for DSLKit in the background. Only another session is active, "DWH systems analyst for Magnit", which is not about this project.
- **Stopped halfway**: the list in section 3.
- **My work in this session**: the document package in branch `docs/test-plans-and-checklists` (pushed as commit `b3afdfc`), now being extended by this file.
- **Limit**: weekly usage 71%, five-hour 68% (the five-hour one resets at 02:40 UTC on 7.11, the weekly one on 12.11). Your rule: stop at 70%. So no new agents were started, this file was written without them.

## 2. Statuses by area, in detail

Legend: **Done** confirmed. **Unfinished** started, something remains. **Not done** not started or abandoned. **In progress** running now. **Planned** decided to do, not started. **Not planned** decided not to do.

### 2.1 Site and editor (Part 1, branch `testing-course-full`)

| Status      | What                                                                                                                                                                                                                                                                                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Done        | Landing RU and EN, login, registration and logout without a server (PBKDF2 password with salt), per-user projects, trash, quota of 5 a day (blocks creation), templates with CRUDL, seeds, 33 examples, palette, drag and drop, export and import, tour, PWA, autosave, fluid headings on the phone. `npm test` 1026 of 1026 at 100% coverage, formatting passes              |
| Unfinished  | Alignment of the other elements (palette, bottom bar, card menus, forms, settings, welcome, dashboard). Dark theme and contrast of new elements. The quota text "3 of 5" on `settings` and `welcome` is not bound to the real number. User templates on welcome                                                                                                               |
| Unfinished  | Breaker defects: Critical B-01 (editor hang on a big graph), B-02 (`POST /api/render` hangs the server), B-03 (U+2028 character). Major B-04…B-08 (two tabs, 201st project, storage overflow, logout in another tab, `localStorage` denied). Open BUG-N07, N08, N09, N12…N17, BUG-CB-01…08, CSS-01…21, HTML-01…04. All must be re-checked: the code changed after the reports |
| Unfinished  | Accessibility: `aria-label` on icons, `role="switch"` on autosave, visible focus, keyboard navigation over the canvas, an alternative to the canvas for screen readers                                                                                                                                                                                                        |
| Unfinished  | Autosave works as a debounce: while typing with pauses shorter than a second nothing is written, and closing the tab may lose data (finding of the performance plan)                                                                                                                                                                                                          |
| Not done    | Real performance measurements (Lighthouse without the performance category, drag FPS, render time of big graphs: per `perf.json` 150 blocks take 20 s, 300 blocks do not finish in 60 s)                                                                                                                                                                                      |
| Not done    | Test cases for the docs, expert, decision pages, the request form, thanks, privacy, `/api/ai/*`, `/api/engines`, `/api/external`, search and replace, versions, "Share" panels, developer and admin roles                                                                                                                                                                     |
| Planned     | Fixes with tests, a run of plans 01–08, an update of the traceability matrix                                                                                                                                                                                                                                                                                                  |
| Not planned | AI panel, collaboration, Git and versions, Image → DSL, public API, SDK and plugins, DSL autocomplete (these are for the diploma)                                                                                                                                                                                                                                             |

### 2.2 Tests and CI

| Status     | What                                                                                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Done       | Root unit tests, e2e `tc:full` (static 41, editor 21, login 42), test documentation builds                                                                                                                                                 |
| Unfinished | `tc:full` does not run `critical-path`, `extra`, `palette`, `scenarios`, `click-everything`. In the saved `scenarios-e2e.json` S1 and S13 are red, 4 console errors. `click-everything`: 366 elements, 51 without a reaction, desktop only |
| Unfinished | Unstable tests: `spike` 1000 sockets (Lab 1) and 400 (Lab 7), Lab 2 and Lab 3 config tests red with a filled `.env`, course load test (p95 above 3 s on a busy machine), Vitest and Jest workers on a busy machine                         |
| Unfinished | A script shows 2 tests for Lab 4, Lab 5, PZ3, PZ3 v6, PZ4: completeness of the set not checked                                                                                                                                             |
| Not done   | Analysis of the red GitHub Actions checks on `25`, `28`, `pz21`, `testing-course-full` (needs `gh auth login` by hand). No e2e in CI, no `npm audit` in Part 2 branches. `msedge` hard-coded, no Firefox and WebKit                        |

### 2.3 Part 1: Labs 1–8 (per the audit, state on 15–29 October, re-check)

| Work                     | Remainder per documents                                                                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lab 1 Network protocols  | check figure 1 for an empty canvas, repeat runs for the DOMContentLoaded conclusion, contents, source list, answers to 16 questions (not in the report)                                                                 |
| Lab 2 Environment        | no screenshots of VS Code with extensions, explorer, terminal with versions, Source Control; Figma file is named `bsuir-diploma`; answers to 10 questions; the report lags the template (red test)                      |
| Lab 3 Semantic HTML      | no screenshots of project structure, Figma layout, code in the editor; clarify the dates of W3C checks; answers to 10 questions                                                                                         |
| Lab 4 Responsive CSS     | justify variable values and the breakpoint, `grid-template-areas` on `.page`, flex/grid subsections, W3C CSS logs, remove `@media` duplicates. Report rebuilt on 6.11 (`ccb4b0b`)                                       |
| Lab 5 JavaScript and DOM | no screenshot of code in VS Code and of four components out of eight; the report lags the template after `script.js` changes                                                                                            |
| Lab 6 API and storage    | merge `fix/lab06-bugs` into the integration branch, re-check BUG-10 on Mermaid through Kroki, no console screenshot                                                                                                     |
| Lab 7 React components   | no component hierarchy diagram (a figure instead of a link to appendices), port 5174 against 5173 in the assignment; the stub version lives as a frozen copy in `labs/07-react-components/react-app/`, edits only there |
| Lab 8 Testing            | the React Profiler screenshot failed; Network and React DevTools; the text "Firefox and Edge remain a task" is stale                                                                                                    |
| General                  | PDFs and title pages are done separately by decision; merge into `main` only on your word                                                                                                                               |

### 2.4 Part 2: Labs 1–8, PZ1–PZ4 (branches, per documents)

| Work                    | Branch       | Tests (per documents)                            | What remains                                                                                                                                             |
| ----------------------- | ------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lab 1 Express           | `lab21`      | 78, `spike 1000 sockets` red                     | Postman screenshots of every endpoint, answers to questions, move `spike` to a separate script                                                           |
| Lab 2 Sequelize         | `lab12`      | did not finish in 170 s, 3 red config tests      | `.env` (DB on port 5434), seeds, Postman and DB structure, +1 commit not pushed; automated tests run on SQLite, repeat the key constraints on PostgreSQL |
| Lab 3 Auth              | `23`         | 129, of which 126 green                          | `.env` (port 3001, DB 5433), seeds, Postman 201/409/400/200/401/403, 15-minute lock instead of 5 (describe in the report), +1 commit not pushed          |
| Lab 4 React state       | `24`         | 102                                              | error pages, new local commits not pushed                                                                                                                |
| Lab 5 React and server  | `25`         | 123, coverage 97.69%                             | check with the real Lab 3 server (CORS), error pages, red GitHub check                                                                                   |
| Lab 6 MongoDB           | `26`         | 144, with an empty `MONGODB_URI` 7 sets time out | Atlas (cluster, user, Network Access), Atlas and Compass screenshots, seeds, 415 not found in code (verify)                                              |
| Lab 7 WebSocket         | `27`         | 102, `spike 400 sockets` red                     | client without React (describe or move), +2 commits not pushed, limits raised in tests, no index by `room` in `messages` found (verify)                  |
| Lab 8 Docker            | `28`         | 21 and 137 server                                | build and start with the new compose not verified, ports 80 and 5000 per the assignment, `docker ps`, Docker Hub, red GitHub check                       |
| PZ1 Middleware and EJS  | `pz21`       | 132, 2 red report tests                          | rebuild `report.md` and `report.en.md` from the template, red GitHub check                                                                               |
| PZ2 REST API            | `pz22`       | 77 of 77                                         | Postman and Swagger UI screenshots; error format `{error:{code,message}}` differs from the other works                                                   |
| PZ3 Routing             | `pz23`       | Vitest workers did not start                     | hand in v6; error pages exist only here; fluid headings pushed                                                                                           |
| PZ4 Context and reducer | `pz24`       | Vitest workers did not start                     | error pages                                                                                                                                              |
| Course project          | `course-app` | server 225 of 226, client 237 of 237             | see 2.5                                                                                                                                                  |

### 2.5 Course project

| Status     | What                                                                                                                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Done       | Code: 5 entities (User, Diagram, Comment, Tag + link), 21 endpoints, React Router 7, migration 6, `?tag=` filter, 17 new server and 16 client tests, client `npm audit` clean. Note and defence cards in RU and EN                                  |
| Unfinished | Server tests on a free machine (one load test failed from a busy CPU), replace 225 with 226 in the note, README and `app/README.md`. The note has a `[TODO]`                                                                                        |
| Unfinished | Diagrams `er.svg`, `usecase.svg`, `c4-containers.svg` are stale (needs `mermaid-cli`). The Postman collection has 17 requests (a copy of Lab 3), no comments and tags                                                                               |
| Not done   | The note in Word (title, assignment, contents, 20–30 pages), appendices V and Zh (all screens, test output), the 20th source (a book not older than 5 years), NFR6 and NFR8 measurements, Render deploy (`render.yaml` not created), public address |
| Not done   | Admin screen to delete a tag (only the API exists)                                                                                                                                                                                                  |
| Unfinished | The note, cards and cheat sheet live in `course-app`, not brought back to `course-project`                                                                                                                                                          |

### 2.6 Documentation, reports, conformance to the assignments

| Status     | What                                                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Done       | Reports RU and EN build from templates, strict linter, PDFs for Part 2 Labs 2–8 (in `E:\Downloads`, built with HTML and Edge), study notes in `docs/study/`, 195 assignment items marked by the audit                          |
| Unfinished | Answers to control questions: per the audit they are missing in Part 1 and only three of 10–30 in Part 2. Waits for the rule decision (question 9)                                                                             |
| Unfinished | Stale texts: `docs/study/00-RUN-GUIDE.md` and `docs/study/11` (SQLite and port 3000 instead of PostgreSQL and 3001), "Firefox and Edge remain a task" in Lab 5–8 reports, `PROGRESS-AND-HANDOVER.md` says "Part 2 not started" |
| Not done   | Title pages and Word per the company standard, contents, uploading PDFs to the LMS, a branch link in every report                                                                                                              |
| Not done   | Missing Part 1 screenshots (VS Code, terminal, Source Control, Network and React DevTools, Lab 6 console), Part 2 (Postman, Atlas, Compass, Swagger, pgAdmin)                                                                  |

### 2.7 Git and maintenance

| Status     | What                                                                                                                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Done       | `testing-course-full` pushed up to `ccb4b0b`, the new branch `docs/test-plans-and-checklists` pushed (`b3afdfc`), `integration/all` pushed                                                                                                                                 |
| Unfinished | `work/part1-finish` is 14 commits ahead of origin. 18 local branches have no copy on GitHub: `tcf-clean`, `testing-course`, `lab7-stubs`, `design/own-fonts-mascot`, 11 `claude/*`, 3 `backup/*`, `worktree-agent-*`. Branches 12, 23, 24–28 have local commits not pushed |
| Unfinished | Working tree of `testing-course-full`: about 206 `git status` entries (7 untracked md files in `docs/testing-kulikov/`, 4K screenshots, reformatted JSON, `DSLKit-Project/`, `.claude/cleanup-e-drive.ps1`, `.claude/launch.json`)                                         |
| Not done   | Pull request `integration/all` into `main` (your decision). About 26 working copies in `.claude/worktrees/`: cleaning them was not discussed                                                                                                                               |

### 2.8 Design, brand, external tracks

| Status     | What                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Done       | Decisions: the logo stays the blue `</>`, cat mascot on error pages, pinwheel rejected. 432 mockup frames                                                          |
| Unfinished | 24 PNGs of new notations and 4 PNGs of features are not uploaded to Figma. Logo sets and `AB-TEST-PLAN.md`: check whether they are in history                      |
| Unfinished | A/B testing: contradictions in the answers are open, protocol in `docs/project/ab-results/`                                                                        |
| Unfinished | ITS-2026 theses: article 1 updated in Overleaf, article 2 not; SVG and Canvas measurements not included; the CMT deadline 26.10.2026 passed, nothing was submitted |
| Unfinished | MBP Lab 1 and Lab 2: branches `docs/mbp-lr1`, `docs/mbp-lr2` only local                                                                                            |
| Planned    | Diploma (June 2027): new stack, a real backend, SRS and ADR documents after the topic is agreed with the supervisor                                                |

## 3. What stopped halfway in other chats (by the last messages)

| Chat                                           | Where it stopped                                                                                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Labs: testing and validation"                 | PDFs for PZ1 and Lab 1, fluid fonts, Lab 4/Lab 5 checked, `integration/all` pushed. Left: Docker build with the new compose, merge into `main` on your decision |
| "ITIVP practicals check"                       | Fluid headings: `site/` committed (now pushed), PZ1, PZ3, PZ4 pushed                                                                                            |
| "Accelerator Kit setup and documentation"      | End-to-end tests green, commit `06711ed` pushed. The Lab 4 report was open (rebuilt by me on 6.11)                                                              |
| "Course project: add more entities"            | Tag as the fifth entity is ready. Left: 225→226, diagrams, Postman with tags, bring the note back to `course-project`                                           |
| "Labs and reports"                             | Stopped at the weekly limit on 29.10. Original topics: reports and seeds for Lab 2/Lab 3/Lab 6                                                                  |
| "Science topics for the app"                   | Article 1 updated, article 2 not, render measurements not included                                                                                              |
| "Unavailable functions and buttons"            | Buttons with state in `react-app/` and the editor committed (`34edec0`, `40494d3`)                                                                              |
| "Overview of chats, sessions and tasks"        | The summary `STATUS-REPORT.md` is made, the push of `work/part1-finish` awaits a "yes" (not received)                                                           |
| Session of 28.10 (transcript `1b6c58ec…jsonl`) | Not run: code review of Labs 3–8, bug hunt on the site (two agents cut off by the limit), seeds for Lab 2/Lab 3/Lab 6, `render.yaml`, red GitHub checks         |

## 4. Plan of next steps

No dates are given in the documents, so the plan is in steps, not dates. Question 1 below asks for deadlines, after which the steps get attached to days.

### Step 0. Decisions (10 minutes, cost nothing in work)

1. Answer the questions of section 5 (block "First": 1, 4, 5, 6, 9, 10, 11).
2. Run `gh auth login` (question 15).

Result: E2, E6, E14 of the epic plan are unblocked.

### Step 1. Foundation (half a day of agent work)

1. E1-T1: table of the run of all works (13 works), numbers into a protocol.
2. E1-T6: analysis of red CI (after `gh auth login`).
3. E1-T2, E1-T3: move `spike` out, isolate `.env` in tests.
4. E1-T4, E1-T5, E1-T8: completeness of sets, scenarios, `tc:full`.
5. E2-T2, E2-T4: branch map, check `package-lock.json`.

Criterion: every work has a known test count and a list of failures with causes.

### Step 2. Docker and data (in parallel, your hands needed)

1. E3-T1: Docker from scratch on `integration/all` (agent, deleting commands only with your "yes").
2. E4-T1, E4-T2: you fill `.env` and Atlas.
3. E4-T4: you capture Postman (201, 409, 400, 200, 401, 403) for Lab 1–3, Lab 6, PZ2.
4. E4-T3: seeds for Lab 2, Lab 3, Lab 6 (agent).

Criterion: the Lab 8 stack is healthy, `down` and `up` lose no data, the server works have screenshots.

### Step 3. Course project and reports

1. E5-T1…E5-T3: tests on a free machine, the number 226, diagrams, Postman with tags (agent).
2. E6-T2: rebuild reports (PZ1, Part 1 Lab 2 and Lab 5).
3. E6-T3: answers to control questions per the decision of question 9.
4. E6-T4: stale texts.
5. E5-T5: the note in Word (you, the biggest manual task).

### Step 4. Site quality

1. E7-T1: Critical B-01…B-03 with tests, re-check with the breaker scripts.
2. E7-T2, E7-T3: Major and open BUG-N.
3. E9-T5: autosave.
4. E7-T4, E7-T5: interface alignment (shown at 375, 768, 1366 px with your approval) and dark theme.

### Step 5. The other kinds of checks

E8 (accessibility), E9 (performance), E10 (security), E11 (compatibility and localization) per the plans `specialists/03…06`, then E12 (traceability, summary report).

### Step 6. Hand-in

E14: gates (12 items) for each branch, title pages, PDFs, upload to the LMS, pushes and merges (on your word), defence preparation. Then the handover document (E14-T7).

### What can start today without you

E1-T1, E1-T2, E1-T3, E1-T4, E1-T5, E1-T7, E1-T8, E2-T2, E5-T2, E5-T3, E6-T2, E6-T4, E7-T7, E10-T4, E10-T5, E12-T1. In total 65 agent tasks, the first batch is described in `02-analytics.en.md` section 8. One constraint: the usage limit (question 3).

## 5. Questions for the owner

Format: **explanation** in plain words, **example**, **options**, **recommendation**, **unblocks**.

### Block "First" (they unblock the most work)

**1. What are the deadlines and order of hand-in?**
Explanation: the documents contain no hand-in date, so I do not know what is urgent. Example: if the course project is due in two weeks and Part 1 is already handed in, we start with the course project and Docker; if the reverse, with the Part 1 reports.
Options: a) the defence date of each work is named; b) hand in everything as it becomes ready; c) Part 2 and the course project first, then Part 1.
Recommendation: a), at least roughly by weeks.
Unblocks: the order of steps 1–6, an estimate of "will we make it".

**2. Does Part 1 need to be handed in again or is it already accepted?**
Explanation: old documents show Part 1 at 86%, and its readiness for the site is higher. Example: if Labs 1–8 of Part 1 are already handed in, the work on them becomes maintenance, not finishing.
Options: a) fully handed in; b) partly handed in (which works?); c) not handed in yet.
Unblocks: epics E6, E14 for Part 1.

**3. Continue working with weekly usage above 70%?**
Explanation: your rule is to stop at 70%. It is 71% now. Example: ten extra specialist agents (test manager, test design and others) would eat a noticeable part of what is left, and before the reset on 12.11 the limit may run out while Docker is not ready.
Options: a) wait for the reset and do light things meanwhile; b) continue now, but only the most important (Docker and the run table); c) continue everything.
Recommendation: b).
Unblocks: starting agents.

**4. Which Part 1 branch counts as the one to hand in?**
Explanation: there are `work/part1-finish` (14 commits ahead of origin), `integration/part1` and `testing-course-full` (the freshest site and tests). Example: the teacher opens the link from the report and it must be exactly the version you defend.
Options: a) `testing-course-full`; b) `work/part1-finish`; c) merge into one and hand in that; d) a separate branch per lab.
Recommendation: c) after checking, but it is your call.
Unblocks: E2-T1, hand-in gates.

**5. Push local branches to GitHub?**
Explanation: 18 branches live only on this computer, if the disk breaks they are gone. Example: if the disk breaks, the commits of branches 23, 27 and others vanish together with the reports.
Options: a) push only the branches of works to hand in (12, 23, 24–28 and `work/part1-finish`); b) push all except `backup/*` and `worktree-agent-*`; c) do not push yet; d) archive locally (zip) and do not push.
Recommendation: a).
Unblocks: E2-T1, protection from loss (risk R-01).

**6. Open a pull request `integration/all` into `main` and merge it?**
Explanation: a merge into `main` is irreversible in the sense of shared history. Example: after the merge all branches are compared with `main` and it becomes the "reference".
Options: a) only open the PR, do not merge; b) open and merge; c) nothing for now.
Recommendation: a).
Unblocks: E14-T6.

**7. What to do with foreign uncommitted files in the root of `testing-course-full`?**
Explanation: the working tree has about 206 entries, part are results of another session (documents `docs/testing-kulikov/20…71`, 4K screenshots, reformatted JSON), part of unclear origin (the folder `DSLKit-Project/`, `.claude/cleanup-e-drive.ps1`). Example: if left as is, they get in the way of every run and may accidentally land in someone else's commit.
Options: a) commit the testing documents as a separate commit, delete the rest after your review; b) commit everything as is; c) leave; d) move to `.gitignore`.
Recommendation: a), I will show the file list before deleting.
Unblocks: E2-T3, clean runs.

**8. May old working copies and service branches be deleted?**
Explanation: `.claude/worktrees/` holds about 26 copies, part of them service ones (`worktree-agent-*`, `backup/*`). Example: they take space and confuse `git branch`.
Options: a) delete only empty service ones (I show the list, you confirm); b) touch nothing; c) delete all except the hand-in branches.
Recommendation: a).
Unblocks: order in the repository (not urgent).

**9. Which control question rule applies?**
Explanation: per the teacher's retelling, variant 26 answers questions n−1, n, n+1 (of 30: 25, 26, 27; of 16: 9, 10, 11; of 10: 5, 6, 7), while the audit reads the assignment as "all questions". In Part 1 there are no answers at all now. Example: if all must be answered, that is dozens of answers across 16 works and a day of work.
Options: a) only n−1, n, n+1 and in Part 1 too; b) only in Part 2, Part 1 without answers; c) all questions; d) you ask the teacher.
Recommendation: d), count a) meanwhile.
Unblocks: E6-T1, E6-T3 (the largest unit of work in the reports).

**10. Is the DSLKit topic agreed for variant 26?**
Explanation: the variant generator gives "a platform for professional retraining courses", while the works are made on DSLKit. Example: without the teacher's agreement the grade may be lowered for "the wrong topic".
Options: a) agreed in writing (give the date); b) agreed orally; c) not agreed.
Recommendation: record the date and name in `docs/PROJECT-STATE.md`.
Unblocks: E5-T7, removes risk R-13.

**11. PZ3: v6 for good? Remove v7 from branch `pz23`?**
Explanation: the assignment says Router v6, the branch now holds both versions. Example: the teacher opens the branch and sees two folders, you will have to explain which is the main one.
Options: a) keep only v6; b) keep both with a note in the README; c) rename v7 to spare.
Recommendation: b).
Unblocks: E6-T8.

### Block "Access and hands"

**12. When can you fill `.env` and bring the databases up?**
Explanation: Lab 2 and Lab 3 run on PostgreSQL, Lab 6 on Atlas. Without them you cannot take Postman answers or check seeds. Example: without `MONGODB_URI` 7 test sets of Lab 6 hit a timeout.
Options: a) today; b) this week; c) I need step-by-step instructions.
Unblocks: E4-T1, E4-T2, E4-T4.

**13. Docker Hub: push the images?**
Explanation: the images `rnxdhehe/dslkit-backend` and `rnxdhehe/dslkit-frontend` are not pushed. The Lab 8 assignment asks for publication. Example: without it `docker pull` will not work for the teacher.
Options: a) push after the stack is checked (I give the commands, you enter the token yourself); b) not needed; c) later.
Recommendation: a).
Unblocks: E3-T4.

**14. Render for the course project: make `render.yaml`?**
Explanation: the course project requires a public address. The agent creates `render.yaml`, you deploy in Render. Example: without a deploy the note keeps a `[TODO]`.
Options: a) yes, make it; b) another host; c) no deploy.
Unblocks: E3-T5, E5.

**15. Can you run `gh auth login`?**
Explanation: without it I cannot see why the checks on branches 25, 28, pz21 and `testing-course-full` are red. Example: it may be one and the same formatting error fixed in five minutes.
Options: a) I will do it now; b) I will send the error text from the Actions tab; c) not for now.
Unblocks: E1-T6.

**16. Do you have time for manual screenshots?**
Explanation: needed are Postman (201, 409, 400, 200, 401, 403) for Lab 1–3, Lab 6, PZ2, Atlas and Compass, DB structure, terminal with versions, VS Code, Source Control, Network and React DevTools. Example: that is 40–60 screenshots.
Options: a) I do it myself by the list; b) we do it together step by step; c) skip some (which?).
Unblocks: E4-T4, E4-T5, E6-T5.

### Block "Product"

**17. Fix the breaker's Critical findings now (B-01 editor hang on big graphs, B-02 `POST /api/render` hangs the server, B-03 the U+2028 character)?**
Explanation: on a graph of 100 vertices the editor answers in several seconds, on 300 it does not finish in a minute. Example: at the defence someone pastes a big example and the site "hangs".
Options: a) fix now with tests; b) limit the input size (faster, simpler); c) leave as a known limitation and describe it in the report.
Recommendation: b) for B-02 and B-03, a) for B-01 after checking.
Unblocks: E7-T1, E10-T6.

**18. Error pages in Lab 4, Lab 5, PZ4: make them?**
Explanation: in your decisions of 24.10: show the 500 page in client works and make detailed pages for every error. Now they exist only in `pz23`. Example: the teacher may ask to show the 500 page in Lab 5.
Options: a) yes, in Lab 4, Lab 5, PZ4; b) only the 500 page; c) no.
Recommendation: a) port the ready ones from `pz23`.
Unblocks: E4-T6.

**19. Seeds for Lab 2, Lab 3, Lab 6: confirm the scope.**
Explanation: you chose seeds but did not specify how many records and which. Example: Lab 3 — an admin, two users, 5 diagrams; Lab 2 — 3 users and 10 diagrams.
Options: a) "as in the Lab 3 example"; b) you specify; c) minimal (2–3 records each).
Unblocks: E4-T3.

**20. Is an admin screen to delete a tag needed in the course project?**
Explanation: tag deletion exists only in the API. The admin screen was out of scope at your instruction. Example: at the defence they show that an admin can delete a tag, it will have to go through Postman.
Options: a) not needed, we show Postman; b) build a minimal screen.
Recommendation: a).
Unblocks: E5-T4.

**21. Interface: how to agree on it?**
Explanation: the rule: first show at three sizes and get approval. Example: after aligning the palette the agent captures 375/768/1366 px, you look and write "ok" or "fix".
Options: a) yes, page by page; b) one set at the end; c) you trust me, no need to show.
Unblocks: E7-T4.

**22. Dark theme: keep it postponed?**
Explanation: 28.10 "leave it for now". New elements may have weak contrast in the dark theme. Example: the "Log in" and "Register" buttons look fine in the light theme and are not checked in the dark one.
Options: a) postponed, but check contrast with the tool; b) finish it; c) remove the dark theme from the declared features.
Recommendation: a).
Unblocks: E7-T5.

**23. Usability: approve thresholds and find people?**
Explanation: the specialist proposed exit thresholds: task success at least 80%, SUS at least 68. This is a proposal, not a fact. Real sessions need 3–5 people. Example: classmates go through 9 tasks of 5–10 minutes each.
Options: a) accept the thresholds, I will find people; b) accept the thresholds, no people (stay with simulation); c) other thresholds.
Unblocks: E8-T5.

### Block "Other"

**24. Upload the remaining 28 PNGs to Figma?**
Explanation: 24 PNGs of new notations and 4 PNGs of features are not uploaded, the file with 432 pictures does not open. Example: needed only if the Figma file is handed in.
Options: a) yes, you upload by the instruction; b) not needed.
Unblocks: E13-T1.

**25. ITS-2026 theses and MBP: what about them?**
Explanation: the CMT deadline was 26.10, nothing was submitted; article 2 is not updated; the MBP branches are local only. Example: maybe there will be another conference or only an archive is needed.
Options: a) freeze the articles; b) prepare for another conference (which?); c) push MBP (after a "yes").
Unblocks: E15.

**26. Diploma (June 2027): when to start and does it belong in this plan?**
Explanation: the code is not started, there are project boundaries and mockups. Example: if you start in a month, part of the tasks (SRS, ADR, usability test) can be prepared now.
Options: a) a separate plan later; b) include the tasks in this plan.
Recommendation: a).
Unblocks: E15-T3.

**27. Include the other chats (Magnit, GMS, flats in Minsk, Google Scholar and others) in this tally?**
Explanation: I did not review them. Example: if "DWH for Magnit" is a work task, it needs its own plan.
Options: a) no, separately; b) yes, I will review the statuses; c) only Magnit and GMS.
Unblocks: completeness of the project checklist.

**28. Traces of AI in documents: keep the agents and skills document in the repository?**
Explanation: your rule: no signatures or traces of AI in commits, code and documents. The files `docs/test-plans/10-agents-and-skills*` describe how to use agents and skills, and the words "AI" and "agent" appear there. The repository already holds `docs/ACCELERATOR.md` and `CLAUDE.md`, which speak about AI agents. Example: a teacher or reviewer sees this in the branch and can ask how it was used.
Options: a) keep, it is a methodology, not a signature; b) move the document out of the repository and keep it only for yourself; c) keep, but remove the word "AI" from the wording.
Recommendation: b) or c), your decision.
Unblocks: the decision whether the document must be rewritten before the merge into `main`.

**29. Specialist plans: do you want more roles and more detail?**
Explanation: this branch has 8 roles. Another 10 are planned: test manager (schedule, resources, estimates), test design (equivalence classes, boundary values, decision tables), exploratory testing (charters), DSL and render engine (33 notations × 4 engines), data and offline (localStorage, PWA), DevOps and release, code quality, real time (WebSocket, tabs, races), oral defence, defect management and a single bug register. Example: test design will give ready value tables for each form.
Options: a) yes, all 10 after the limit reset; b) only the 3 most important (which?); c) enough.
Recommendation: b): test manager, defect management, oral defence.
Unblocks: starting agents (question 3).

**30. Where to send the questions to the teacher?**
Explanation: questions 9, 10, 11 (and "array or DB in Lab 1", "500 page in client works") must be put to the teacher. Example: it is more convenient to ask once with a list than one at a time.
Options: a) I draft a list-letter in Russian and you send it; b) you do it yourself.
Unblocks: E6-T1, E5-T7, E6-T9.

## 6. What else to take into account for the project

These are things that did not make it into the tasks but can let you down at the last moment.

1. **Every Part 2 branch keeps a copy of the whole Part 1 tree** (`labs/`, `site/`, `react-app/`, `tools/`), and the copies drift (three variants of `tools/`, Lab 3 has three versions, fluid headings are not applied in Lab 4, Lab 5, Lab 7 and the course project). Any change must follow the procedure in `50-labs-pz-tasks-and-impact.en.md`, otherwise it is fixed in one branch and not in another.
2. **One machine and one disk.** 18 branches live only locally, there are about 26 working copies. A backup matters more than any further work (question 5).
3. **Screenshots and secrets.** Screenshots of Postman, Atlas, Docker and `.env` must not show passwords, tokens, the `mongodb+srv://…` string, or addresses with a login. Blur them before inserting into the report, as you require for secrets. The Docker token once pasted into chat is considered compromised: check that it was revoked and do not use it.
4. **Secrets in git history.** Even a secret removed from a file stays in old commits. Before pushing branches, search the history (`git log -p -S` for key strings), not only the current state.
5. **What the teacher will see.** Red GitHub Actions checks are visible on the branches they open; a public Render address "falls asleep" on the free plan and the first request may take about a minute; Atlas by default opens access only from your IP and will not work from their computer (decide in advance how to show: a video recording, a local run at the defence).
6. **The defence.** The teacher asks to "write it with me" (PATCH, 409, 500 page, middleware order, `jwt.verify`, CSRF). You must be able to explain and write this yourself. Study notes are in `docs/study/`; practise them aloud for every work in advance. Agents can prepare exercises and play the examiner, but you will do the explaining.
7. **University rules on the use of AI.** Check whether the university has requirements to declare or avoid AI assistants when doing coursework, and format the hand-in as they require. This applies to you and to the documents you hand in.
8. **Environment versions.** Part of the code uses `process.loadEnvFile()` (needs a modern Node.js), Vitest and Jest depend on the version. Pin the Node.js and npm versions in the README and in the report so the result matches on another computer.
9. **Service worker.** After every static change the cache version must be raised (`dslkit-v5` now); otherwise the reviewer gets an old version. Advice to the reviewer: Ctrl+Shift+R.
10. **The external Kroki service.** Graphviz, Mermaid and PlantUML rendering goes through a public service; if it fails, the local engine remains. Have a fallback scenario at the defence (the local engine and saved screenshots).
11. **Computer load.** Docker Desktop starts slowly, Vitest and Jest tests time out on a busy machine. Close extras before a run and run one at a time.
12. **Usage limit.** The weekly limit is 71%, resets on 12.11. Plan heavy agent runs after the reset or pick the most important (question 3).
13. **A single source for numbers.** The test count repeats in the README, RU and EN reports, defence cards, cheat sheet, `PROJECT-STATE.md`, `STATUS-REPORT.md`. After each run update all places at once (row M18 of the impact matrix).
14. **Deadlines are unknown.** Without dates you cannot separate urgent from important. This is question 1.
15. **The work exceeds the time.** The rough estimate is 450 hours against the capacity of one person. Honestly choose what goes into the hand-in (minimum: tests green, reports built, Docker checked, course project formatted) and what stays "after" (E13, E15, part of E8–E11).
16. **Boundaries of other sessions.** Other sessions work in the same root `E:\DSLKit-Project`. Changes in the shared tree can break each other's tests. Make changes in separate working copies.
17. **Rights and licences.** Fonts (Inter, JetBrains Mono, Kubik), icons, the logo and images must have permitted licences; for a public repository this is worth noting in the README.
18. **User data in tests.** `docs/testing-kulikov/` may hold real emails and passwords of test accounts (do not commit `.claude/admin-test-account.txt`). Check screenshots and logs before pushing.

## 7. How this file relates to the others

- Short and as a checklist: `00-project-checklist.en.md`.
- Numbers, risks, discrepancies: `02-analytics.en.md`.
- All tasks with identifiers: `30-epics-and-tasks.en.md`.
- Tasks for every lab and practical and what to change at the same time: `50-labs-pz-tasks-and-impact.en.md`.
- Roles, agents, skills, hand-in gates: `10-agents-and-skills.en.md`.
- Plans of the kinds of testing and checklists: `01-test-strategy.en.md`, `specialists/01…08`.
