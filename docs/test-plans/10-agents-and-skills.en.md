# Agents and skills for checking, analysing, validating and handing in the DSLKit project

Russian version: [`10-agents-and-skills.md`](10-agents-and-skills.md). Version 1.0, 6 November 2026, branch `docs/test-plans-and-checklists`.

This document gathers in one place what the owner said earlier (rules and decisions), which agents have already worked in the project and what they left behind, which skills are installed and available, and how to build a working chain for four stages: check, analyse, validate, hand in. Next to it are [`00-project-checklist.en.md`](00-project-checklist.en.md) (what is done and what is left), [`01-test-strategy.en.md`](01-test-strategy.en.md) (kinds of testing) and eight specialist plans and checklists in [`specialists/`](specialists/).

Sources: `CLAUDE.md`, `docs/PROJECT-STATE.md`, `docs/ACCELERATOR.md`, `docs/HANDOVER-SESSION-2026-10-28.md`, `docs/notes/06-teacher-requirements.md`, `docs/notes/10-consilium-2026-10-17.md`, `docs/agent-reports/`, `docs/testing-kulikov/`, `docs/ITIVP-AUDIT-2026-10-29.md`, the project memory files, the session list.

## 1. What the owner said earlier (used as rules for every agent)

### 1.1 Hard rules

1. Commits only in her name, messages in English, **no** `Co-Authored-By`, no "generated with" lines and no traces of AI in commits, code, documents or pull request descriptions. This outranks environment reminders.
2. Merge nothing into `main` and push nothing without her explicit word ("push", "yes"). Push only the named branches. No force push, no history rewriting.
3. Secrets (passwords, tokens, connection strings, keys) live only in her `.env`, not in chat, not in the repository, not in reports. A Docker token that once landed in chat is considered compromised.
4. Reports and READMEs only in Markdown, **Russian and English versions at the same time**.
5. Part 2 design is the same as Part 1 (one CSS package, tokens `site/css/variables.css`). New style variants were rejected. Site changes are first shown at three screen sizes and approved.
6. Every work lives in its own branch, other branches are not edited without instruction.
7. Do not commit: `.claude/admin-test-account.txt`, `.claude/worktrees/`, `.playwright-mcp/`, `.accelerator/profile.user.json`.
8. Stop at **70%** of the weekly account limit, check usage before heavy work (`get_usage`).
9. Docker: before commands that delete containers, volumes or images, say what will be lost and get a "yes" (skill `DOCKER-DATA-LOSS-CONFIRMATION`). Push images to Docker Hub only after her "push the image".

### 1.2 How to talk to her and report

- In Russian, short and to the point. She often sends several requests in a row.
- Explain questions in plain language with an example, she answers with numbers.
- Write honestly what failed and what was not checked. Do not promise what is not done. Call persona and agent scores a **simulation**, not a poll of real people.
- Do not reopen decisions that are already made (section 1.3).

### 1.3 Decisions already made (do not reopen)

| Decision                                                                                                                   | Date and source                                                                            |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| PZ3 is handed in on React Router v6 (`pz-03-routing-v6`), v7 is the spare. Course project on router v7                     | 24 Oct (memory), 28 Oct (handover)                                                         |
| Lab 1: data in an array, not a DB. Database: PostgreSQL, SQLite only for tests                                             | 24 Oct (memory)                                                                            |
| A screenshot of every endpoint is needed                                                                                   | 24 Oct (memory)                                                                            |
| Show the 500 page in client works, plus detailed pages for other errors                                                    | 24 Oct (memory), only partly done in `pz23`                                                |
| Order: labs, practicals, course project, then logo, UI/UX, visuals                                                         | 24 Oct (memory)                                                                            |
| Logo stays the blue `</>`, cat mascot on error pages, pinwheel rejected                                                    | 24 Oct (memory, `docs/STATUS-REPORT.md`)                                                   |
| Course project on the same topic as the labs (DSLKit). The Word/PDF question and dark theme postponed ("leave it for now") | 28 Oct (handover)                                                                          |
| Control questions: n−1, n, n+1 of her variant (26: out of 30 that is 25, 26, 27, out of 16 that is 9, 10, 11)              | `docs/notes/06-teacher-requirements.md`. The 29 Oct audit asks to confirm with the teacher |
| Even variant: request log is written to a DB table, a 500 page instead of black text                                       | `docs/notes/06-teacher-requirements.md`                                                    |

### 1.4 Teacher requirements for reports and code (checked by the validators in section 3, stage 3)

The goal of the work is numbered, the section is called "Conclusion". A page is filled at least 25%. Caption "Figure N – Description", figures inside the text, no "(see fig. 1)". Guillemet quotes. Hyperlinks not blue. Filler words removed. Limits moved to `limits.json`. Every record has a unique "creation time". Numeric fields not below 0. Details: `docs/notes/06-teacher-requirements.md`, the strict linter `tools/lint-report.js`.

### 1.5 Environment traps (an agent must know them)

- Windows, Git Bash and PowerShell. Create files with Cyrillic, backslashes and regular expressions with the Write/Edit tools, not heredoc (a double backslash and `n` turn into a line break).
- Run Python with `-I`. Repository files are CRLF, `.gitattributes` requires LF.
- Run `npm test` one at a time: shared ports and databases. Run e2e scripts in the foreground. Client tests on a busy machine time out, repeat.
- Tour key `dslkit.tour-done=true`, storage prefix `dslkit.`. Service worker cache: Ctrl+Shift+R.
- Lab 2 and Lab 3 tests are red with a filled `.env`.
- Parallel sessions share the working tree `E:\DSLKit-Project`. Write only to your own branch or a separate working copy (`git worktree add`).

## 2. Agents that already worked in the project

The list is rebuilt from reports in the repository, project memory and the session list. It is a reconstruction from documents, not a call log.

| No. | Agent (role)                                                             | What it did                                                                                                                                                                                      | Trace in the repository                                                                                                          | State                                                                                              |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A1  | Independent checkers of Part 1 Labs 1–8                                  | Read only: compare the work with the assignment and theory, run tests, tables "item → evidence"                                                                                                  | `docs/agent-reports/lab-01-02.md`, `lab-05-06.md`, `lab-07-08.md` (Labs 3–4 earlier)                                             | Done, remarks closed partly                                                                        |
| A2  | Examiner council (3): Node.js server, React, alternative tech and Docker | Forecast of teacher extras for Labs 1–8, PZ1–4, tables with file paths                                                                                                                           | `docs/agent-reports/consilium-2026-10-17/server.md`, `react.md`, `alt-tech-docker.md`, `docs/notes/10-consilium-2026-10-17.md`   | Done. Two examiners (report formatting and standard, breaking scenarios) were cut off by the limit |
| A3  | Usability and accessibility expert                                       | Nielsen heuristics 0–4, problems by severity, from code and screenshots                                                                                                                          | `docs/agent-reports/usability-2026-10-16.md`                                                                                     | Done, expert simulation                                                                            |
| A4  | Design metrics analyst                                                   | Golden ratio, contrast AA/AAA, breakpoints from `site/css/*`                                                                                                                                     | `docs/agent-reports/design-metrics-2026-10-16.md`, `audit-2026-10-17/`                                                           | Done                                                                                               |
| A5  | "Teacher extras" and Part 1 breaker                                      | Ways to break the program, negative tests (`labs/06-async-api-storage/negative.test.js`)                                                                                                         | `docs/agent-reports/teacher-extras-2026-10-21.md`, `docs/notes/11-negative-tests-brief.md`, `20-teacher-extras-live-failures.md` | Done                                                                                               |
| A6  | Testers by Kulikov                                                       | Requirements, use cases, test plan, checklists, 140+ test cases, traceability matrix, UI, API, navigation, manual click, UX and accessibility, code security, render quality, cross-browser runs | `docs/testing-kulikov/01…95`                                                                                                     | Done 29–30 Oct, some files not committed                                                           |
| A7  | The breaker                                                              | 18 findings: Critical 3, Major 7, Minor 8 (render load, API DoS, U+2028, tabs, quota)                                                                                                            | `docs/testing-kulikov/80-break-report.md`, `scripts/break-0*.py`                                                                 | Done, fixes of the findings to be verified                                                         |
| A8  | User personas (3 sets)                                                   | Student and teacher, analyst and developer, accessibility, phone and English                                                                                                                     | `docs/testing-kulikov/90…92-persona-*.md`                                                                                        | Done, roles played by one checker (simulation)                                                     |
| A9  | 12 simulated personas (SUS) and A/B (100 questions)                      | Interface and logo evaluation                                                                                                                                                                    | `docs/project/UX-RESEARCH-RESULTS.md`, `docs/project/ab-results/`, `docs/design-contest/logos/`                                  | Done, contradictions in answers open                                                               |
| A10 | ITIVP auditor of 29 Oct                                                  | 195 assignment items of Part 1, Part 2, course project: done 127, partial 39, no 20, cannot check 9                                                                                              | `docs/ITIVP-AUDIT-2026-10-29.md`                                                                                                 | Done, discrepancies of section 5 open                                                              |
| A11 | Executor sessions                                                        | "Editor: properties panel, code export, Gantt", "Rebuild LR3 reports in branches 25 and 28", "Course project: add more entities", labs 12, 23–28, PZ                                             | working copies in `.claude/worktrees/`                                                                                           | Finished, some commits not pushed                                                                  |
| A12 | Accelerator check                                                        | Skill install, adaptation of 18 `SKILL.md`, test and format check, `tc:full` run                                                                                                                 | `docs/agent-reports/accelerator-check-2026-11-05.md`, `docs/ACCELERATOR.md`                                                      | Done, pushed 6 Nov                                                                                 |
| A13 | Capture and mockups, logos, Figma upload                                 | 432 mockup frames, logo sets, upload to Figma                                                                                                                                                    | `docs/design-contest/`, `docs/STATUS-REPORT.md` section 6                                                                        | Upload of 28 PNGs not finished                                                                     |
| A14 | ITS-2026 theses and MBP                                                  | Measurements (`paper-its/bench`), theses in Overleaf, MBP Lab 1 and Lab 2                                                                                                                        | `paper-its/`, project memory                                                                                                     | Article 2 and MBP not pushed, CMT deadline passed                                                  |

Lessons from these agents:

- Agents with heavy reading (A2 examiners) were cut off by the limit. Start one or two at a time, with a short task and an exact file list.
- Results of simulations (A3, A8, A9) must not be presented as a poll of people.
- Agents in the shared tree got in each other's way (`site/` tests failed during someone else's work). Each writer gets its own working copy or branch.
- Reports A1, A2, A10 hold remarks that were not fully closed: read them before a new run so as not to open them again.

## 3. Which agents to run at each stage

Agent types in the environment: `Explore` (read only, fast search), `Plan` (plan design), `general-purpose` (read, run commands, write files), `claude` (universal). For read-only checks use `Explore` or `general-purpose` with a write ban in the task. Give anything that writes files a separate working copy.

For every agent: **Input** is what it reads, **Output** is what it leaves, **Done** is when to consider the work finished.

### Stage 1. Check (run it and see what works)

| Code | Agent                 | Task                                                                                                               | Input                                                | Output                                  | Done                                                            | Skills                                                                                           |
| ---- | --------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| V1   | Builder and runner    | `npm test`, `format:check`, `tc:full`, summary of numbers                                                          | root, `package.json`, `testing-course/full/`         | run protocol (date, commit, numbers)    | numbers written, red sorted by cause                            | `COMPLETION-VERIFICATION`, `PIPELINE-CHECK-SELECTION`, `TEST-DESIGN-REVIEW`                      |
| V2   | Part 2 branch checker | For every branch in its own working copy: `npm install`, `npm test`, compare the test count with README and report | `.claude/worktrees/*`, `docs/PROJECT-STATE.md` table | table "work → tests → passed → failing" | all 13 works, unstable ones marked separately                   | `COMPLETION-VERIFICATION`, `ERROR-DIAGNOSIS`                                                     |
| V3   | Docker checker        | Build from scratch, `docker ps`, healthcheck, `/api/health`, register, log in, `down` and `up` with data           | `integration/all`, `part-2/lab-08-docker`            | protocol, `docker ps` screenshot        | stack healthy, data in place, deleting commands only with "yes" | `DOCKER-COMPOSE-LOCAL-STACK`, `DOCKER-IMAGE-BUILD`, `DOCKER-DATA-LOSS-CONFIRMATION`              |
| V4   | Code reviewer         | Review branch diffs for correctness, security, simplicity                                                          | branch diffs                                         | list of findings with file and line     | findings confirmed by reproduction                              | `CODE-CHANGE-REVIEW`, `/code-review`, `/security-review`, `/simplify`, `engineering:code-review` |
| V5   | Browser checker       | Open the site in Chrome/Edge/Firefox/WebKit, walk the critical path, console, network                              | `http://localhost:5190`, `testing-course/full/`      | screenshots, list of console errors     | smoke test passed in every browser of the matrix                | `built-in-browser`, `chrome-browser` (Playwright and Chrome DevTools tools)                      |
| V6   | The breaker           | Negative and boundary scenarios, big inputs, corrupt storage, two tabs                                             | `80-break-report.md`, `11-negative-tests-brief.md`   | updated findings list                   | all earlier B-01…B-18 re-checked (fixed or still open)          | `ERROR-DIAGNOSIS`, `TEST-DESIGN-REVIEW`                                                          |

### Stage 2. Analyse (understand causes, gaps, risks)

| Code | Agent                        | Task                                                                           | Input                                                           | Output                                    | Done                                                           | Skills                                                                                                       |
| ---- | ---------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| N1   | Assignment auditor           | Match every assignment item with evidence (table Y/P/N/?)                      | `materials/`, 29 Oct audit                                      | updated status table                      | 195 items with a current status                                | `PROJECT-DOCUMENTATION`, `REQUIREMENTS-BRAINSTORMING`                                                        |
| N2   | Examiner council             | Forecast of extras: "write it with me", PATCH, 409, 500 page, router           | `docs/agent-reports/consilium-2026-10-17/`                      | extras table with covered / not covered   | every extra has an evidence file or a task                     | `TEST-DESIGN-REVIEW`, `REQUEST-REFINEMENT`                                                                   |
| N3   | Cause diagnostician          | Root cause of failures: unstable spikes, `.env`, timeouts, 3 e2e scenarios     | run reports, logs                                               | cause and proposed fix for each           | cause proved before changing code                              | `ERROR-DIAGNOSIS`, `engineering:debug`, `DATA-INCIDENT-TRACING`                                              |
| N4   | UX and accessibility analyst | Heuristics, WCAG 2.2, contrast, keyboard, usability protocol                   | `specialists/04-accessibility-ux.en.md`, `60-ux-a11y-review.md` | report with the note "simulation"         | every WCAG criterion of the checklist marked                   | `design:accessibility-review`, `design:design-critique`, `design:user-research`, `design:research-synthesis` |
| N5   | Performance analyst          | Measure SVG/Canvas rendering, Web Vitals, server p95                           | `specialists/05-performance.en.md`, `paper-its/bench`           | results table with measurement conditions | numbers obtained by measurement, thresholds from the checklist | `data:analyze`, `data:statistical-analysis`, `PIPELINE-OUTPUT-REVIEW`                                        |
| N6   | Security analyst             | OWASP review, dependencies, secrets, CSP                                       | `specialists/03-security.en.md`, `61-security-code-review.md`   | list of checks and findings               | every checklist item closed or a risk recorded                 | `/security-review`, `SENSITIVE-DATA-HANDLING`                                                                |
| N7   | Tech debt analyst            | Duplicates (Lab 7 copy in `labs/07-…/react-app/`), stale texts, unstable tests | repository, `docs/study/`                                       | list of debts by priority                 | every debt has a branch or an assignee                         | `engineering:tech-debt`, `REFACTOR-STEP-PLANNING`                                                            |

### Stage 3. Validate (confirm the result matches the requirements)

| Code | Agent                         | Task                                                                                                                      | Input                                      | Output                                | Done                                                                | Skills                                              |
| ---- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| C1   | Report validator              | `tools/lint-report.js`, rebuild reports, test "report equals build from template", RU/EN match                            | `labs/*/report*.md`, `part-2/*/report*.md` | table "report → lint → build → RU=EN" | no red reports                                                      | `TECHNICAL-PROSE-EDITING`, `PROJECT-DOCUMENTATION`  |
| C2   | Teacher requirement validator | Check against `06-teacher-requirements.md`: numbered goal, "Conclusion", 25% of page, captions, guillemets, `limits.json` | reports and code of the works              | table per work                        | every requirement marked                                            | `CODE-CHANGE-REVIEW`, `TEST-DESIGN-REVIEW`          |
| C3   | Numbers validator             | Test count, ports, branches in README, reports and note equal the actual ones                                             | README, reports, `note.md`, actual run     | list of discrepancies                 | 0 discrepancies (for example 225 against 226 in the course project) | `COMPLETION-VERIFICATION`                           |
| C4   | Traceability validator        | Requirements → test cases → results, `14-traceability-matrix.md`                                                          | `docs/testing-kulikov/`                    | updated matrix                        | every REQ has a case and a result                                   | `TEST-DESIGN-REVIEW`                                |
| C5   | Markup validator              | W3C HTML and CSS, Schema.org, Rich Results after changes                                                                  | `site/`, `95-markup-css-audit.md`          | validator logs                        | no errors or they are explained                                     | `built-in-browser`                                  |
| C6   | User simulator (UAT)          | Personas and scenarios, SUS by protocol, A/B                                                                              | `03-user-scenarios.md`, `90…92`            | protocols marked "simulation"         | all scenarios passed, scores marked                                 | `design:user-research`, `design:research-synthesis` |
| C7   | Data and seed validator       | Seeds for Lab 2, Lab 3, Lab 6, migrations up and down, DB constraints                                                     | `specialists/07-backend-db-docker.en.md`   | protocol                              | migrations and seeds repeatable                                     | `DATA-QUALITY-CONTROLS`, `data:validate-data`       |

### Stage 4. Hand in (prepare and release)

| Code | Agent                 | Task                                                                                                 | Input                                            | Output                                  | Done                                                      | Skills                                                                                          |
| ---- | --------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| S1   | Hand-in gatekeeper    | Pre-hand-in checks (section 5): AI traces, secrets, forbidden files, `.env`, green tests, branch map | git, all branches                                | "can / cannot" per work                 | all items of section 5 marked                             | `COMPLETION-VERIFICATION`, `SENSITIVE-DATA-HANDLING`, `engineering:deploy-checklist`            |
| S2   | Report builder        | Rebuild RU and EN reports, PDF (HTML + Edge), figure list                                            | `node tools/build.js`, `report.tpl.md` templates | PDFs in `E:\Downloads\`                 | PDFs match the Markdown, captions and figures in place    | `anthropic-skills:pdf`, `anthropic-skills:docx` (title page in Word), `TECHNICAL-PROSE-EDITING` |
| S3   | Defence preparation   | Question cards, "write it with me", cheat sheets from `docs/study/`                                  | `docs/study/`, `defence-cards.md`                | updated cards                           | every work has questions n−1, n, n+1 and exercises        | `PROJECT-DOCUMENTATION`, `REQUEST-REFINEMENT`                                                   |
| S4   | Release manager       | Prepare pull requests and merge order (only with her "yes"), branch map                              | branch map in `PROJECT-STATE.md`                 | PR draft with no AI traces, merge order | owner approved, push only on her word                     | `engineering:deploy-checklist`, `COMPLETION-VERIFICATION`                                       |
| S5   | Handover writer       | `docs/HANDOVER-SESSION-*.md`, update `PROJECT-STATE.md` and `00-project-checklist.md`                | results of stages 1–4                            | documents RU and EN                     | the next agent starts without questions                   | `PROJECT-DOCUMENTATION`, `DAILY-STANDUP-UPDATE`, `engineering:documentation`                    |
| S6   | Course project deploy | `render.yaml` and deploy of `course-app` (after the words "make render.yaml")                        | `course-app`, `docs/ITIVP-AUDIT…` line 11        | file and instructions                   | the owner does the deploy, the address goes into the note | `engineering:deploy-checklist`, `DOCKER-IMAGE-BUILD`                                            |

## 4. Skills

### 4.1 Installed in the project (`.claude/skills/`, 19 items, adapted to DSLKit in the "Project context" section)

| Group               | Skills                                                                                                         | Where to apply                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Process             | `REQUIREMENTS-BRAINSTORMING`, `IMPLEMENTATION-PLANNING`, `PLAN-EXECUTION`, `COMPLETION-VERIFICATION`           | new tasks, work plans, **before saying "done"**                                                                                  |
| Quality             | `CODE-CHANGE-REVIEW`, `TEST-DESIGN-REVIEW`, `ERROR-DIAGNOSIS`, `REFACTOR-STEP-PLANNING`                        | review, choosing and judging tests, finding causes, safe refactoring                                                             |
| Documentation       | `PROJECT-DOCUMENTATION`, `CODE-COMMENT-WRITING`, `PROJECT-ADAPTATION`                                          | README, decisions, code comments, adapting skills                                                                                |
| Docker and security | `DOCKER-COMPOSE-LOCAL-STACK`, `DOCKER-IMAGE-BUILD`, `DOCKER-DATA-LOSS-CONFIRMATION`, `SENSITIVE-DATA-HANDLING` | Lab 8, course project, any user data, secrets                                                                                    |
| Data and pipelines  | `DATA-QUALITY-CONTROLS`, `DATA-INCIDENT-TRACING`, `PIPELINE-CHECK-SELECTION`, `PIPELINE-OUTPUT-REVIEW`         | seeds, migrations, choosing checks after a change, reading a run result (mostly about dbt and Python, of limited use for DSLKit) |

### 4.2 The owner's personal skills (local, not part of the repository)

`DAILY-STANDUP-UPDATE` (summaries), `TECHNICAL-PROSE-EDITING` (report editing), `REQUEST-REFINEMENT` (clarifying a request), `RECENT-DISCUSSION-RESEARCH` (discussion survey). To restore them on a new machine see `docs/ACCELERATOR.en.md` section 6.

### 4.3 Environment skills useful for these stages

| Skill                                                                                                                                                                     | What for                                                         | Stage         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------- |
| `code-review`, `security-review`, `simplify`                                                                                                                              | diff review, branch security, simplification                     | 1, 2          |
| `engineering:code-review`, `debug`, `testing-strategy`, `tech-debt`, `documentation`, `deploy-checklist`, `architecture`, `system-design`, `incident-response`, `standup` | engineering checks, strategy, debt, documents, release checklist | 1–4           |
| `design:accessibility-review`, `design-critique`, `design-system`, `design-handoff`, `ux-copy`, `user-research`, `research-synthesis`                                     | accessibility, interface critique, texts, research               | 2, 3          |
| `data:analyze`, `statistical-analysis`, `validate-data`, `create-viz`                                                                                                     | process performance measurements, check result tables            | 2, 3          |
| `anthropic-skills:docx`, `pdf`, `xlsx`, `pptx`                                                                                                                            | title pages (Word), report PDFs, tables, defence slides          | 4             |
| `anthropic-skills:built-in-browser`, `chrome-browser`                                                                                                                     | work in the built-in browser and in Chrome                       | 1, 3          |
| `anthropic-skills:deep-research`, `doc-coauthoring`, `internal-comms`                                                                                                     | collect sources, co-author texts                                 | 2, 4          |
| `run`                                                                                                                                                                     | start the app and confirm a change live                          | 1             |
| `loop`, `schedule`                                                                                                                                                        | repeat checks or schedule them (on request)                      | 1             |
| `dataviz`, `artifact-design`                                                                                                                                              | result charts, report pages                                      | 2, 4          |
| `figma:*`                                                                                                                                                                 | upload 28 PNGs and mockups to Figma                              | outside tests |
| `vba-methodichka-professor`                                                                                                                                               | a separate subject (VBA), unrelated to DSLKit                    | —             |

Important: the skills in tables 4.1–4.3 must not be replaced by general reasoning. If a task fits a skill, load it as the first action, as `CLAUDE.md` requires.

### 4.4 Tools the agents use

Playwright (scripts `testing-course/full/*.py`, `docs/testing-kulikov/scripts*`), Chrome DevTools and the built-in browser (screenshots, console, network, Lighthouse), Postman (collections `postman_collection.json`), `docker compose`, `npm test` and `npx vitest run`, `node tools/build.js` and `node tools/lint-report.js`, `tools/contrast.js`, `gh` (not authorised yet: `gh auth login` by hand).

## 5. Pre-hand-in gate (S1): checks before handing in each work

Run for every branch in a separate working copy. Write the result into a table.

| No. | Check                                                                                                                | How to check (command or file)                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | Tests green, count matches README and report                                                                         | `npm test` in the work folder, compare with README and `report.md`                                                    |
| 2   | Reports built from the template, pass the linter, RU and EN exist                                                    | `node tools/build.js <folder>`, the report test                                                                       |
| 3   | No AI traces in the history messages                                                                                 | `git log <branch> --format=%B` and search for `Co-Authored-By`, `Generated with`                                      |
| 4   | No mention of AI tools in document texts                                                                             | search `README`, `report*.md`, `note*.md`                                                                             |
| 5   | No secrets and no `.env` in git                                                                                      | `git ls-files` for `.env`, search for passwords, tokens, `mongodb+srv` strings, only `.env.example` in the repository |
| 6   | Forbidden paths are not committed                                                                                    | `.claude/admin-test-account.txt`, `.claude/worktrees/`, `.playwright-mcp/`, `.accelerator/profile.user.json`          |
| 7   | Commit author is the owner, messages in English                                                                      | `git log --format='%an %s'`                                                                                           |
| 8   | Screenshots of every endpoint (Postman) and of the 500 page                                                          | `figures/` of the work, the report                                                                                    |
| 9   | Control questions n−1, n, n+1 are present (or the teacher's decision)                                                | `report.md` questions section                                                                                         |
| 10  | The branch is named as in the assignment and pushed                                                                  | `git branch -vv`, push only after her word                                                                            |
| 11  | Title page and PDF: title page, signatures ("Prepared by Khadzhinova K.A.", "Checked by Khadzhinova N.V."), contents | Word per the company standard, PDF in `E:\Downloads\`                                                                 |
| 12  | Branch link in the report, file uploaded to the LMS                                                                  | by the owner by hand                                                                                                  |

Map "what to hand in": Lab 1 `lab21`, Lab 2 `lab12`, Lab 3 `23`, Lab 4 `24`, Lab 5 `25`, Lab 6 `26`, Lab 7 `27`, Lab 8 `28`, PZ1–PZ4 `pz21`–`pz24`, course project `course-app` (note in Word, 20–30 pages), Part 1 `work/part1-finish` (the current site and test slice is in `testing-course-full`, integration branches `integration/part1` and `integration/all`). Which Part 1 branch is handed in, ask the owner.

## 6. Task template for an agent

```text
Role: <code and name from section 3>.
Context: DSLKit project, branch <branch>, working copy <path>. Read CLAUDE.md and docs/PROJECT-STATE.md.
Task: <one sentence>. Scope: <files and folders>. Out of scope: <what not to touch>.
Skills: <names from section 4>, load them before starting.
Rules: write only to <output path>. Do not commit and do not push. Do not read or print secrets.
  Do not run commands that delete Docker data. Do not invent results, write "not checked".
  Call persona and agent scores a simulation. RU and EN at the same time.
Output: <files, table, format>. Done when: <criterion from the table in section 3>.
At the end in one line: what is done, what is not checked, file paths.
```

## 7. Run order and limits

1. Stage 1 first (V1, V2 one after another, the rest one or two at a time), because stages 2–4 need its results.
2. Run stage 2 two or three tasks in parallel, read only.
3. Stage 3 after the fixes found in stages 1–2.
4. Stage 4 only after the owner's "yes": push, merge, Docker Hub, Render.
5. Before every stage `get_usage`, stop at 70% and write the state into `docs/HANDOVER-SESSION-*.md`.
6. After every stage update `00-project-checklist.en.md`, not only reply in chat.
