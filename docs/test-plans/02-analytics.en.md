# Analytics of the DSLKit project state before hand-in

Russian version: [`02-analytics.md`](02-analytics.md). Snapshot of 6 November 2026, branch `testing-course-full` (commit `ccb4b0b`), new branch `docs/test-plans-and-checklists`.

The document answers: where the project stands in numbers, where the main gaps are, which risks and contradictions exist, roughly how much work is left and in what order to do it. It relies on [`00-project-checklist.en.md`](00-project-checklist.en.md), the specialist plans in [`specialists/`](specialists/), [`30-epics-and-tasks.en.md`](30-epics-and-tasks.en.md) and repository documents.

Limits of reliability: I ran the root tests myself (6.11). Everything else comes from documents, reports and code reading by the specialists and was not re-checked in this snapshot. There were no browser, load or Docker runs in this session. Effort estimates are rough.

## 1. Conclusions in five lines

1. The site and editor are in good shape: 1026 of 1026 tests, coverage 100%, formatting passes, end-to-end `tc:full` is green. But `tc:full` does not run all end-to-end scripts, and the saved results of the others show red scenarios (S1, S13) and 51 elements without a reaction.
2. The main hand-in risk is not the site but Part 2 and the course project: no test output in the note, no Word file, no deploy, no Postman screenshots, no `.env` with a DB, Docker not checked after the compose change, red GitHub checks not analysed.
3. Part of the work exists only on the local machine: `work/part1-finish` is 14 commits ahead of origin, and about 18 more local branches have no copy on GitHub.
4. There are open decisions that block a large amount of work and cost the owner nothing: the rule for control questions, which Part 1 branch to hand in, v6 or v7 in PZ3 (v6 decided, but the branch state is not brought into line), agreeing the DSLKit topic.
5. There is a lot of test documentation (≈9.6 thousand lines in `docs/testing-kulikov/` and eight new plans), but there are no run results against the new checklists yet: every checkbox is empty.

## 2. State in numbers

| Indicator                                                | Value                                                                                                                        | Source and reliability                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Root tests (`npm test`)                                  | 1026 of 1026, coverage 100%                                                                                                  | run on 6.11                                    |
| Formatting (`npm run format:check`)                      | passes                                                                                                                       | run on 6.11                                    |
| End-to-end `tc:full`                                     | static 41/41, editor 21/21, login 42/42                                                                                      | Accelerator chat, commits `7b541df`, `fee7c6c` |
| `click-everything`                                       | 366 elements, 51 without a reaction                                                                                          | saved JSON (from the automation plan)          |
| `scenarios-e2e`                                          | S1 and S13 red, 4 console errors                                                                                             | saved JSON                                     |
| ITIVP audit 29.10: assignment items                      | 195: done 127 (65%), partial 39 (20%), no 20 (10%), cannot check 9 (5%)                                                      | `docs/ITIVP-AUDIT-2026-10-29.md`               |
| Audit discrepancies (partial and no)                     | 59                                                                                                                           | same                                           |
| Breaker findings                                         | 18: Critical 3, Major 7, Minor 8                                                                                             | `docs/testing-kulikov/80-break-report.md`      |
| Test cases of the manual set                             | TC-001 … TC-140 and on                                                                                                       | `docs/testing-kulikov/13-test-cases.md`        |
| Working copies (git worktree)                            | about 26 (in `.claude/worktrees/` plus two outside)                                                                          | `git worktree list`                            |
| Local branches without a copy on GitHub                  | 18 (`tcf-clean`, `testing-course`, `lab7-stubs`, `design/own-fonts-mascot`, 11 `claude/*`, 3 `backup/*`, `worktree-agent-*`) | `git for-each-ref`, 6.11                       |
| `work/part1-finish` ahead of origin                      | 14 commits                                                                                                                   | `git rev-list`, 6.11                           |
| Uncommitted entries in the root of `testing-course-full` | about 206 `git status` entries at session start                                                                              | git status                                     |
| Items in the new specialist checklists (all empty)       | see the table in section 9                                                                                                   | count per file                                 |
| Tasks in the work plan                                   | 95 tasks in 15 epics, 57 subtasks                                                                                            | `30-epics-and-tasks.en.md`                     |
| Rough effort estimate                                    | about 450 hours (S=1, M=4, L=8, XL=16 h)                                                                                     | count by task sizes                            |

Task priorities: P0 15, P1 45, P2 26, P3 9. Assignee by first letter: agent 65, owner by hand 16, her decision needed 14.

## 3. Analysis by area

| Area                           | What exists                                                                                    | What is missing or weak                                                                                                                                                                                                                        | Risk   | Epic       |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- |
| Site and editor: functions     | login, registration, projects, trash, quota, templates, seeds, palette, export and import, PWA | not covered by test cases: the landing request form, thanks, privacy, robots, sitemap, the docs, expert, decision pages, `/api/ai/*`, `/api/engines`, `/api/external`, search and replace, versions, "Share" panels, developer and admin roles | medium | E7, E12    |
| Stale cases                    | TC-069…TC-073, risk R-08                                                                       | describe the quota as "only displayed", while since commit `3bb2482` it blocks creation (BUG-N19)                                                                                                                                              | low    | E7-T7      |
| Open site defects              | reports 21, 51, 71, 80, 95                                                                     | Critical B-01…B-03, Major B-04…B-08, BUG-N07, N08, N09, N12…N17, BUG-CB-01…08, CSS-01…21, HTML-01…04 need a re-check                                                                                                                           | high   | E7         |
| Automation                     | 1026 unit tests, Playwright e2e, CI with `npm ci`, `format:check`, `npm test`, `npm audit`     | `tc:full` does not run all scripts, e2e outside CI, `channel="msedge"` everywhere, no Firefox and WebKit, `spike` load tests inside `npm test`, Lab 2/Lab 3 tests depend on `.env`, no `npm audit` in Part 2 CI                                | medium | E1         |
| Security                       | CSP, SVG sanitising, PBKDF2, code review (61), breaker findings                                | no server-side account check in Part 1 (risk R-05, accepted), DoS on `/api/render` (B-02), Part 2 JWT/CSRF/CORS checks not re-run                                                                                                              | high   | E10, E7-T1 |
| Accessibility and usability    | audit 60, persona runs 90–92, commit `fb6913c` (44 px targets)                                 | no run with a real screen reader, no keyboard navigation over the canvas, no sessions with people (simulation only), exit thresholds not approved                                                                                              | medium | E8         |
| Performance                    | graph and culling measurements in `paper-its/bench`, Lighthouse in Part 1 Lab 8                | no SVG/Canvas FPS and first-frame measurements, no load scenarios for Part 2 servers, B-01 on a big graph                                                                                                                                      | medium | E9         |
| Compatibility and localization | matrix 70, bugs 71, markup audit 95, device screenshots                                        | Firefox and WebKit through Playwright did not start, real iOS and Android not checked, `color-mix` without `@supports` (11 places), manifest only in Russian, print only in `editor.css`                                                       | medium | E11        |
| Part 2 server works            | branches with tests, RU and EN reports, Postman collections                                    | no screenshots of every endpoint, no seeds for Lab 2/3/6, `.env` not filled for DBs, error pages only in `pz23`, Lab 5 not checked with the real server                                                                                        | high   | E4         |
| Docker (Lab 8)                 | compose, healthcheck, pgAdmin and Redis profiles                                               | build and start with the new compose not verified, ports 80/5000 per the assignment not captured, images not pushed to Docker Hub                                                                                                              | high   | E3         |
| Course project                 | `course-app` code, 5 entities, 21 endpoints, note in Markdown, defence cards                   | no Word file, no deploy, no test output (225 against 226), stale diagrams, no title page and assignment, no book in sources, 20–30 page volume in question                                                                                     | high   | E5         |
| Reports                        | build from templates, strict linter, RU and EN                                                 | red report tests (PZ1, Part 1 Lab 2 and Lab 5 after code changes), no answers to control questions, stale texts about browsers and SQLite, some screenshots missing                                                                            | high   | E6         |
| Git and maintenance            | branch maps in documents, handover                                                             | local branches without a GitHub copy, foreign uncommitted changes, duplicated Lab 7 files (frozen copy), the "Router v6 or v7" discrepancy in older documents                                                                                  | medium | E2         |

## 4. Risk register

Scale: probability and impact on three levels (H high, M medium, L low).

| No.  | Risk                                                                                   | Prob. | Impact | What to do                                                                  | Epic, task     |
| ---- | -------------------------------------------------------------------------------------- | ----- | ------ | --------------------------------------------------------------------------- | -------------- |
| R-01 | Loss of local commits and branches (no GitHub copy, one computer)                      | M     | H      | push branches on her word, at least a backup to a personal remote           | E2-T1, E2-T2   |
| R-02 | Red CI on branches to be handed in 25, 28, pz21, testing-course-full                   | H     | M      | `gh auth login`, read the logs                                              | E1-T6          |
| R-03 | The Docker stack does not build or data is lost on recreation                          | M     | H      | check from scratch before hand-in, `down -v` only with her "yes"            | E3-T1          |
| R-04 | The course project is not formatted in Word in time (title, volume, appendices)        | H     | H      | start the note now, the rest in parallel                                    | E5-T5          |
| R-05 | No answers to control questions or a wrong rule for picking them                       | M     | H      | ask the teacher, record the decision                                        | E6-T1, E6-T3   |
| R-06 | Unstable tests give a false red at the defence                                         | H     | M      | move `spike` out, isolate `.env`, a free machine                            | E1-T2, E1-T3   |
| R-07 | Critical breaker findings not fixed (editor hang on big graphs, API DoS)               | M     | H      | fix with a test, re-check with scripts                                      | E7-T1          |
| R-08 | Browser-side accounts taken for real protection                                        | L     | M      | record explicitly as an accepted limitation (R-05 in test plan `10`)        | E10-T2         |
| R-09 | Secrets get into the repository (`.env`, Docker token, Atlas string)                   | L     | H      | scan before each push, gate S1 item 5                                       | E10-T5, E14-T1 |
| R-10 | Traces of AI in history or documents break her rule                                    | L     | H      | gate S1 items 3, 4, 7, commit author only her                               | E14-T1         |
| R-11 | `integration/all` merged into `main` without her decision                              | L     | H      | merge only on her word                                                      | E2-T1, E14-T6  |
| R-12 | The weekly usage limit stops work mid-stage                                            | H     | M      | `get_usage` before a stage, stop at 70%, handover after each stage          | E14-T7         |
| R-13 | The DSLKit topic is not agreed for variant 26 (the generator gives retraining courses) | M     | H      | get and record the teacher's agreement                                      | E5-T7          |
| R-14 | External services (Kroki, Atlas, Render) unavailable on the day of the check           | M     | M      | offline mode and local engine, a fallback plan without the external service | E3-T5, E4-T2   |
| R-15 | Simulations (personas, SUS, A/B) presented as a poll of people                         | L     | M      | label "simulation" everywhere, real sessions in E8-T5                       | E8-T5          |

## 5. Contradictions and discrepancies in sources

They must be closed by a decision or a check before they become an error in a report.

| No. | Discrepancy                                                                                                             | Where                                                    | Proposed action                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| D-1 | Control questions: n−1, n, n+1 (the owner's retelling) against "all questions" (audit); for Part 1 answers "not needed" | `docs/notes/06-teacher-requirements.md`, audit section 5 | question to the teacher, E6-T1                      |
| D-2 | Site port: 5190 in the `testing-kulikov` documents, 5173 in `npm start` and the e2e scripts                             | `docs/testing-kulikov/*`, `package.json`                 | unify, E1-T7                                        |
| D-3 | Quota "only displayed" in TC-069…073 against "blocks" in code                                                           | `13-test-cases.md`, commit `3bb2482`                     | update the cases, E7-T7                             |
| D-4 | PZ3: "Router v6" in project memory, "router v7" in the handover                                                         | memory, `HANDOVER-SESSION-2026-10-28.md`                 | decision made: PZ3 v6, course project v7, record it |
| D-5 | Esc and Tab mode in the editor: report 60 says "does not release", report 92 describes leaving via Esc and Tab          | `60-ux-a11y-review.md`, `92-persona-a11y-mobile-en.md`   | check `code-input.js`, E8                           |
| D-6 | Test count: 836 (audit), 982 (Accelerator), 1026 (now) for the root                                                     | audit, Accelerator report                                | count from the actual run, E1-T1                    |
| D-7 | "Part 2 not started, 0%" in `PROGRESS-AND-HANDOVER.md` against the finished branches                                    | `docs/PROGRESS-AND-HANDOVER.md` section 4                | mark the document stale, E2-T2                      |
| D-8 | Test runner: the Accelerator scanner detects `null`, in fact `node:test`                                                | profile `.accelerator/profile.json`                      | refine in the profile                               |
| D-9 | Plan 08: question Q-02 whether Part 1 needs answers                                                                     | `specialists/08-docs-acceptance.en.md`                   | same fork as D-1                                    |

## 6. Test instability analysis

| Test or set                            | Symptom                                           | Probable cause (per documents)  | Check of the cause             | Solution                               |
| -------------------------------------- | ------------------------------------------------- | ------------------------------- | ------------------------------ | -------------------------------------- |
| Lab 1 `spike: 1000 sockets`            | fails, depends on the machine                     | descriptor limit and load       | run alone on a free machine    | move to `npm run test:load`            |
| Lab 7 `spike: 400 raw sockets`         | same                                              | same                            | same                           | same                                   |
| Lab 2, Lab 3 config tests              | red with a filled `.env`                          | tests read the real environment | `env -u DATABASE_URL npm test` | clear `process.env` in the tests       |
| Course `load: 600 authenticated reads` | p95 above 3 s, passes alone                       | busy CPU                        | run alone                      | move out or relax with a justification |
| Vitest in Lab 4, PZ3, PZ4              | workers do not start, timeout                     | busy machine (Docker Desktop)   | repeat on a free machine       | run one at a time, `testTimeout` 30000 |
| Jest in `react-app/`                   | workers fail without `-i`                         | same                            | `npx jest -i`                  | fix `-i` in the script                 |
| Lab 6                                  | 7 sets time out at 110 s                          | empty `MONGODB_URI`             | fill `.env` or a local MongoDB | E4-T1, E4-T2                           |
| Lab 2, Lab 5, PZ1 reports              | report does not equal the build from the template | code changed without a rebuild  | `node tools/build.js <folder>` | rebuild after changes                  |

## 7. Critical path and order

The order that unblocks the most work for the least effort:

1. **Owner decisions in one message** (E2-T1, E6-T1, E6-T8, E5-T7). Zero hours of work, unblock E2, E6, E14.
2. **`gh auth login` and reading the red CI** (E1-T6). Shows the real state of the branches.
3. **A table of the run of all works** (E1-T1). Without it the numbers in the reports stay unreliable.
4. **Docker from scratch** (E3-T1). The longest risk in checking and the most visible at the defence.
5. **Part 2 data and screenshots** (E4-T1, E4-T4): `.env`, Atlas, Postman. These are her hands, start as early as possible.
6. **Course project** (E5-T1, E5-T5) in parallel with reports (E6-T2, E6-T3).
7. **Fixing Critical site defects** (E7-T1) together with API security (E10-T6).
8. **The remaining kinds of checks** (E8, E9, E10, E11), then documentation (E12).
9. **Hand-in** (E14) only after the owner's "yes" for pushes and merges.

Bottlenecks: the load on the owner (16 tasks by hand, the heaviest are E5-T5 Word and E14-T2 title pages), a single machine with Docker and the weekly usage limit, Part 2 depending on `.env`, Atlas and Postman.

## 8. What can be sped up without the owner

65 tasks are marked "agent". Recommended first batch, needing none of her decisions: E1-T1, E1-T2, E1-T3, E1-T4, E1-T5, E1-T7, E1-T8, E2-T2, E5-T1 (after a free machine), E5-T2, E5-T3, E6-T2, E6-T4, E7-T7, E10-T4, E10-T5, E12-T1. Everything else first needs her word (pushes, deletion, merge, Docker with data deletion) or her hands.

## 9. Size of the new specialist plans and checklists

The table is filled by counting empty checkboxes "- [ ]" in each file (Russian version). The item count drops after each run only when an item is marked with a result.

| File                                           | Area                           | Checklist items |
| ---------------------------------------------- | ------------------------------ | --------------- |
| `specialists/01-qa-functional.md`              | functional, regression         | 131             |
| `specialists/02-test-automation.md`            | automation                     | 84              |
| `specialists/03-security.md`                   | security                       | 118             |
| `specialists/04-accessibility-ux.md`           | accessibility and usability    | 101             |
| `specialists/05-performance.md`                | performance                    | 85              |
| `specialists/06-compatibility-localization.md` | compatibility and localization | 116             |
| `specialists/07-backend-db-docker.md`          | API, DB, WebSocket, Docker     | 148             |
| `specialists/08-docs-acceptance.md`            | documentation acceptance       | 152             |

## 10. What next

1. Read this document and `30-epics-and-tasks.en.md`, answer by numbers the decisions in section 7 item 1.
2. Choose what to start first: the batch of section 8 or Docker (E3-T1).
3. After each stage update `00-project-checklist.en.md` and this document (section 2) so the numbers do not go stale.
