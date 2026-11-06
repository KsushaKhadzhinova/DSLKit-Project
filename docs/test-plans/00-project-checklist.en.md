# DSLKit project checklist: done, in progress, still open

Russian version: [`00-project-checklist.md`](00-project-checklist.md). Snapshot of 6 November 2026, branch `testing-course-full`, commit `ccb4b0b`.

How to read it. Every item has a source: a repository file or the last message of the chat it came from. Items marked "verify" come from older documents and were not re-confirmed in this snapshot. Test counts for Part 2 from 23–29 October were not re-run.

Legend: `[x]` done and confirmed, `[~]` in progress or partly done, `[ ]` not done. Column "Who": **O** the owner (by hand), **A** can be done without the owner, **D** needs her decision.

Sources: `docs/PROJECT-STATE.md`, `docs/HANDOVER-SESSION-2026-10-28.md`, `docs/STATUS-REPORT.md`, `docs/PROGRESS-AND-HANDOVER.md`, `docs/ITIVP-AUDIT-2026-10-29.md`, `docs/project/TODO.md`, and the last messages of the chats "Labs: testing and validation", "ITIVP practicals check", "Accelerator Kit setup and documentation", "Labs and reports", "Science topics for the app", "Course project: add more entities", "Unavailable functions and buttons", "Overview of chats, sessions and tasks".

## 1. Done and confirmed

- [x] Site and editor: login, registration, logout without a server, per-user projects, trash, quota, templates, seeds, 33 examples, palette, drag and drop, export and import, tour, PWA.
- [x] `npm test` in the root: 1026 of 1026, coverage 100%, `npm run format:check` passes (checked on 6 November after rebuilding the Lab 4 report).
- [x] End-to-end `tc:full`: static 41 of 41, editor 21 of 21, login 42 of 42 (Accelerator chat, commits `7b541df`, `fee7c6c`).
- [x] Fluid heading sizes on narrow screens: `site/` (`995c6b0`) and PZ1, PZ3, PZ4 (`5a96bff`, `8e3835d`, `9b38f7a`).
- [x] Lab 4 report rebuilt for the new `variables.css` (`ccb4b0b`). Branch `testing-course-full` is pushed up to `ccb4b0b`.
- [x] Part 2 works exist in branches: Lab 1 `lab21`, Lab 2 `lab12`, Lab 3 `23`, Lab 4 `24`, Lab 5 `25`, Lab 6 `26`, Lab 7 `27`, Lab 8 `28`, PZ1–PZ4 `pz21`–`pz24`, course project `course-app` (five entities, React Router 7, Tag added).
- [x] Integration branch `integration/all` pushed to GitHub ("Labs: testing and validation" chat), PDFs for PZ1 and Lab 1 added.
- [x] Testing documentation after the Kulikov book: `docs/testing-kulikov/` (requirements, use cases, test plan, checklists, test cases TC-001…, traceability matrix, run reports 20–95).
- [x] Accelerator skills installed in `.claude/skills/`, report `docs/agent-reports/accelerator-check-2026-11-05.md` (RU and EN).
- [x] Owner decisions recorded: logo stays the blue `</>`, cat mascot on error pages, Lab 1 on an array, PostgreSQL (SQLite only in tests), PZ3 handed in on v6, router v7 in the course project, a screenshot of every endpoint.

## 2. In progress and left unfinished in chats

| Status | What                                                                                                                                                                                                         | Where                                                  | Who |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | --- |
| `[~]`  | Image build and container start with the new `docker-compose.yml` not verified, only `docker compose config` was                                                                                             | `integration/all` (`E:\integration-all`), Labs chat    | A   |
| `[~]`  | Pull request `integration/all` into `main` not opened, the owner decides                                                                                                                                     | Labs chat                                              | D   |
| `[~]`  | Branch `work/part1-finish` is 14 commits ahead of origin, not pushed (checked with `git rev-list`)                                                                                                           | local repository                                       | D   |
| `[~]`  | Many local branches have no copy on GitHub: `tcf-clean`, `testing-course`, `lab7-stubs`, `design/own-fonts-mascot`, `claude/*` (11), `backup/*` (3)                                                          | `git branch`                                           | D   |
| `[~]`  | Course project: re-run server tests on a free machine and change 225 to 226 in the note and README (the note has a `[TODO]`)                                                                                 | `course-app`, chat "Course project: add more entities" | A   |
| `[~]`  | Course project: `er.svg`, `usecase.svg`, `c4-containers.svg` are stale (needs `mermaid-cli`), no tag requests in `postman_collection.json` and `requests.http`                                               | `course-app`                                           | A   |
| `[~]`  | Course project: note, defence cards and cheat sheet live in `course-app`, not brought back to `course-project`                                                                                               | `course-project`, `course-app`                         | D   |
| `[~]`  | Unstable tests: 1000-socket stress (Lab 1), 400-socket stress (Lab 7), Lab 2 and Lab 3 config tests red with a filled `.env`, course load test (600 reads, p95 > 3 s)                                        | `docs/ITIVP-AUDIT-2026-10-29.md` sections 0 and 5      | A   |
| `[~]`  | A script shows 2 tests for Lab 4, Lab 5, PZ3, PZ3 v6, PZ4, completeness of the set not checked                                                                                                               | "Labs: testing and validation" chat                    | A   |
| `[~]`  | `scenarios-e2e.py`: 3 of 14 failed on 28 October (including S13), `click-everything.py` was never run. Verify the current result                                                                             | `testing-course/full/`                                 | A   |
| `[~]`  | Red GitHub Actions checks on `25`, `28`, `pz21`, `testing-course-full` were not analysed, `gh` is not authorised                                                                                             | GitHub                                                 | O   |
| `[~]`  | The `testing-course-full` working tree holds uncommitted work: `docs/testing-kulikov/20…71` files, 4K screenshots, reformatted JSON, `DSLKit-Project/`, `.claude/cleanup-e-drive.ps1`, `.claude/launch.json` | `git status`                                           | D   |
| `[~]`  | Figma upload: 24 PNGs of the new notations and 4 PNGs of editor features not uploaded                                                                                                                        | `docs/STATUS-REPORT.md` section 6                      | O   |
| `[~]`  | Logo sets `final-v2…v7`, `survey`, `test-round-2…5`, `AB-TEST-PLAN.md`, `docs/ANALOGS-AND-INSPIRATION.md` were not committed (verify, may be in already)                                                     | `docs/design-contest/logos/`                           | A   |
| `[~]`  | ITS-2026 theses: article 1 updated in Overleaf, article 2 left as it was, SVG and Canvas measurements not included, CMT deadline 26.10.2026 has passed                                                       | `paper-its/`, "Science topics" chat                    | D   |
| `[~]`  | MBP Lab 1 and Lab 2: branches `docs/mbp-lr1`, `docs/mbp-lr2` are local only                                                                                                                                  | project memory                                         | D   |

## 3. Waiting for the owner (by hand)

- [ ] Fill `.env`: Lab 2 (DB port 5434), Lab 3 (port 3001, DB 5433, `JWT_SECRET` at least 32 characters), Lab 6 (`MONGODB_URI` from Atlas). Keep values out of the repository.
- [ ] Atlas M0: cluster, user, Network Access with her IP.
- [ ] Postman: import the collections for Lab 1, Lab 2, Lab 3, Lab 6, PZ2 and capture responses 201, 409, 400, 200, 401, 403 (a screenshot of every endpoint).
- [ ] Screenshots of the DB structure (pgAdmin or DBeaver), Atlas and Compass, Swagger UI.
- [ ] Docker Hub: push `rnxdhehe/dslkit-backend` and `rnxdhehe/dslkit-frontend` only after an explicit "push the image". Take `docker ps` on ports 80 and 5000.
- [ ] Render: after the words "make render.yaml" the file is created, the deploy is by hand.
- [ ] Part 1 screenshots: terminal with versions, VS Code with extensions, explorer, Source Control, Network and React DevTools, Lab 6 console.
- [ ] Check PWA and install in real Chrome, Firefox and Edge, Rich Results Test.
- [ ] Course project: move `note.md` into Word, title page, assignment, contents, 20–30 pages, source 20 (a book not older than 5 years).
- [ ] Export PDFs and upload reports to the LMS.
- [ ] Agree with the teacher: the DSLKit topic for variant 26, v6 or v7 for PZ3, array or DB for Lab 1, answers to all control questions or to three, the 500 page in client works.
- [ ] Decisions: merge `integration/all` into `main`, push unpushed branches (`work/part1-finish` and the local ones).

## 4. Planned (can be done without the owner)

- [ ] Docker: build images and bring the stack up from `docker-compose.yml` in `integration/all`, `docker ps`, `/api/health`, register and log in, `down` and `up` with data kept.
- [ ] Fix unstable tests: move `spike` into a separate `npm run test:load` script, clear `process.env` in the Lab 2 and Lab 3 config tests.
- [ ] Answers to control questions in every report (audit, discrepancy no. 1) once the teacher replies.
- [ ] Seeds for Lab 2, Lab 3, Lab 6, chosen by the owner and not made.
- [ ] Code review of Labs 3–8 and a bug hunt on the site (two passes were cut off by the limit).
- [ ] Finish the interface: alignment of palette, editor bottom bar, card menus, forms, settings, welcome, dashboard; dark theme and contrast of new elements (`tools/contrast.js`).
- [ ] Error pages 401, 403, 404, 500 and network in Lab 4, Lab 5, PZ4 (only in `pz23` now).
- [ ] Fix stale texts: `docs/study/00-RUN-GUIDE.md` and `docs/study/11` (SQLite, port 3000 instead of PostgreSQL and 3001), claims about Firefox and Edge in Part 1 Lab 5–8 reports.
- [ ] Accessibility from `docs/project/TODO.md`: `aria-label` on icons, `role="switch"` on autosave, visible focus, keyboard navigation over the canvas, click target of at least 24 px.
- [ ] Performance measurements of SVG and Canvas, load scenarios, Lighthouse for all pages (see `specialists/05-performance.en.md`).
- [ ] Repeat W3C HTML and CSS, Schema.org and cross-browser runs after all changes.
- [ ] A/B testing: resolve contradictions in the owner's answers, protocol in `docs/project/ab-results/`.
- [ ] Execute the test plans in this directory (`01-test-strategy.en.md` and `specialists/`) and fill the checkboxes with real results.

## 5. Not planned within the coursework

- `connectionStateRecovery` in Lab 7, a `lint` script in the server works (unless the teacher asks).
- AI panel, collaboration, Git and versions, Image → DSL, public API, SDK and plugins, DSL autocomplete: belongs to the diploma (June 2027).
- Mobile and tablet mockups in Figma, CLI mode, Mermaid export (deferred in `docs/project/TODO.md`).
- The Word/PDF question and the dark theme of new screens are postponed by the decision "leave it for now" (note of 28 October).

## 6. Other chats that are not about DSLKit

I did not review these and did not include them: "DWH systems analyst for Magnit" (running now), "QA position GMS EXPERT", "Gist review", "Apartment search site in Minsk", "Presentation analysis", "Papers in Google Scholar", "Article information", "Folder with feeds for interns and DA/BI" (`E:\da_bi_review`), "Accelerator install and check" (`E:\orders-analytics`). Their status can be collected in a separate pass if needed.

## 7. Rules for all work

- Commits only as the owner, in English, with no tool signatures.
- Merge nothing into `main` and push nothing without her word. No force push, no history rewriting.
- Secrets only in `.env`, never in chat or the repository.
- Reports and READMEs in Russian and English at the same time.
- Do not commit `.claude/admin-test-account.txt`, `.claude/worktrees/`, `.playwright-mcp/`, `.accelerator/profile.user.json`.
- Stop heavy work at 70% of the weekly account limit.
