# Specialist 08: acceptance of documentation and conformance to the assignments

Plan version 1.0, date 2026-11-06. Russian version: `08-docs-acceptance.md`, equal content. All "- [ ]" fields are empty at the time of writing, a status is set only after a check on the acceptance day. Earlier ratings are not carried over, only linked: `docs/ITIVP-AUDIT-2026-10-29.md` (audit, 195 items, 59 discrepancies, sections 5 and 6), `docs/ITIVP-CHECK.md`, `docs/study/33-QUESTIONS.md`, `docs/notes/06-teacher-requirements.md`, `docs/PROGRESS-AND-HANDOVER.md`. Abbreviations: LR is a laboratory work, PZ is a practical session, STP is the Enterprise Standard (2024 edition), LMS is the university learning management system (СЭО).

## 1 Role and scope

Role: specialist in acceptance of coursework and documentation. Checks that the result matches the teacher's assignment and the Enterprise Standard formatting (2024 edition), that reports are built from templates, that numbers, links and paths in documents are not stale, and that the Russian and English versions are equal.

In scope:

- Part 1: `labs/01-network` ... `labs/08-frontend-testing` (repository root, branch `testing-course-full`), reports `report.md`, `report.en.md` built from `report.tpl.md`, `report.en.tpl.md`.
- Part 2: LR1-8 in branches `lab21`, `lab12`, `23`, `24`, `25`, `26`, `27`, `28`, PZ1-4 in branches `pz21`, `pz22`, `pz23`, `pz24`, PDF reports for LR2-8 and PZ1 in `E:\Downloads`.
- Course project: branch `course-app` (`course-project/note.md`, `note.en.md`, `defence-cards.md`, `cheat-sheet.md`).
- MBP LR1 and LR2 (`E:\ИИТ\МБП_ЛР1`, `E:\ИИТ\МБП_ЛР2`), ITS-2026 papers (`paper-its`, Overleaf).
- Site testing documentation: `docs/testing-kulikov`, `testing-course`.
- Assignments: `materials/text/part-1`, `materials/text/part-2`, file list `materials/files.tsv`.

Out of scope: fixing code, layout in Word and PDF (done by the owner), uploading to the LMS, publishing branches, merging into `main`. This plan makes no commits and no pushes.

## 2 What is checked (priorities)

| Priority | What is checked                     | Examples                                                                                                                                                                                                                                                   |
| -------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | The work is not accepted without it | no answers to control questions in the required volume, no title page and no "Checked by" line, red report build test, report differs from the branch code, breach of a direct ban in the assignment (Part 1 LR7: `useState`, `useEffect`), no branch link |
| P1       | Noticeable grade loss               | required screenshots missing, broken links and figure numbers, stale test counts, RU and EN differ, breach of the formatting rules from `06-teacher-requirements.md`, `[TODO]` in the course project note                                                  |
| P2       | Formatting remarks                  | figure captions, quotation marks, filler words, numerals, long appendices, line spacing                                                                                                                                                                    |
| P3       | Minor and convenience               | typos, file order, README wording, unused files in a work folder                                                                                                                                                                                           |

## 3 Plan

### 3.1 Goals

1. For each work obtain a filled table "requirement, evidence, status" following section 4.
2. Confirm that reports rebuild from templates and pass the linter without errors.
3. Compare test and coverage numbers in README files, reports and notes with the actual run.
4. Collect the open questions to the teacher into one list with the date of the answer.

### 3.2 Scope

All works from section 1. The unit of checking for each work is a requirement from `materials/text`, the matching report file, a screenshot, a command or a branch.

### 3.3 Approach

- Read the assignment, then look for evidence in the report and in a repository file (path from the root or from the working copy `.claude/worktrees/<name>`).
- Automatic part: report builds, the formatting linter, report tests, format check (commands in section 5).
- Manual part: title page, table of contents, page numbering, volume in Word, match of screenshots to text, acceptance in the LMS.
- Links and paths are checked by searching `report.md` and README files, then by opening the file or running `git branch --list`.
- Statuses: "- [x]" only when evidence is found, the path is written next to it. If there is no evidence the item stays "- [ ]" with a note in the remarks column of the acceptance report.

### 3.4 Entry criteria

- A working copy and branch are chosen, `git status` is understood, other people's changes are untouched.
- Dependencies are installed (`npm ci` or `npm install`) in the checked folder.
- The machine is free of heavy processes: the audit of 2026-10-29 recorded worker timeouts under load, so run checks one at a time.
- The assignments in `materials/text` and the file `variant.json` (variant 26) are available.
- Local `.env` files are filled (do not copy values into reports or chat), or the tests run in a clean environment.

### 3.5 Exit criteria

- All P0 and P1 items are closed with "- [x]" or listed among the open questions with an owner and a deadline.
- `npm test` in the root passes, the Part 1 and Part 2 reports match their templates, the linter reports no errors for ru and en.
- Test numbers in README files and reports match the run of that day.
- The list of questions to the teacher (section 4.14) is sent by the owner, the answers are recorded in `docs/PROJECT-STATE.md`.
- The final acceptance report is saved together with the date and commit hash of every checked branch.

### 3.6 Risks

| Risk                                                                                                                                                                              | Mitigation                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| The answer rule "variant minus one, variant, plus one" (25-27 of 30, 9-11 of 16, 5-7 of 10) is confirmed only by the owner's retelling, while the assignment says "all questions" | question to the teacher Q-01, do not treat the item as closed until answered          |
| For Part 1 `06-teacher-requirements.md` says answers are not needed, while the audit reads the assignment as "all questions"                                                      | question Q-02, compare with the assignment text in `materials/text/part-1`            |
| Part 2 branches live in different working copies, some are not pushed                                                                                                             | before checking record `git rev-parse --short HEAD` and `git status -sb` of each copy |
| Tests depend on a filled `.env`, on PostgreSQL and MongoDB, load tests are unstable                                                                                               | run in a clean environment, record red load tests apart from functional ones          |
| Stale texts in templates (browsers, listings)                                                                                                                                     | compare `report.md` with the build result, never edit `report.md` by hand             |
| The scan "Procedure for preparing, performing, formatting and defending labs" has no text layer                                                                                   | check rules against `06-teacher-requirements.md` and against the scan by hand         |
| The course project volume (20-30 pages) is visible only in Word                                                                                                                   | count pages after the transfer, an estimate by words is unreliable                    |

## 4 Checklist

Line format: the item, then in parentheses where to look for evidence. "A-N" means a section of the audit of 2026-10-29.

### 4.1 General requirements for every report

- [ ] The title page per STP-2024 exists (faculty, department, topic, "Performed by Khadzhinova K.A.", a "Checked by" line). Made in Word, it is not in `report.md`.
- [ ] A table of contents exists, sections are numbered consecutively, appendices carry the section of the reference (for example "to subsection 3.2").
- [ ] The section is named "1 Purpose of the Work", the final section "Conclusion", the word "Conclusions" is absent (linter).
- [ ] A list of references exists, sources are recent, formatting follows STP.
- [ ] A page with text is filled at least 25 %, no empty sheets and no detached headings.
- [ ] Every figure: caption "Figure N – Description" starting with a capital, number and figure on one line, caption not narrower than the figure, no frame.
- [ ] A figure sits in the text, not in an appendix. A description with a worded reference above it, no "(see fig. 1)", a sentence does not start with a figure reference.
- [ ] Every table has a caption "Table N – Description", the table is mentioned before the figure if references go in a row.
- [ ] Only guillemets «», the words "also" and "were" are absent, no semicolons in prose.
- [ ] Ordinal numerals with suffixes ("2-м разделе"), cardinal numbers up to ten in words, above ten in digits.
- [ ] One line spacing (1 or 1.15) for the whole document.
- [ ] Code in the main text takes at most one A4 page in total, the rest is in appendices. At least one appendix exists.
- [ ] An appendix is named "Appendix A (mandatory) Meaningful title", the title matches the content.
- [ ] The headings "Contents" and "Conclusion" are centred without a paragraph indent.
- [ ] Hyperlinks are not highlighted in blue.
- [ ] The blocks "page 500" (in detail) and "form" (which checks of entered values) are described if the work has them.
- [ ] The branch and commit link is exact, as in the assignment (A section 6, item 20).
- [ ] Control questions: the volume of answers is agreed with the teacher (Q-01, Q-02), the required numbers are present in full.
- [ ] Every statement of the report (test count, version, port, path) matches the branch code on the acceptance date.

### 4.2 Part 1: LR1-LR8 (root, branch `testing-course-full`)

LR1 Network protocol analysis (`labs/01-network`, assignment has 16 questions):

- [ ] Three requests of different types, each with at least 5 request headers and 5 response headers (tables in `report.md`).
- [ ] Caching, Cookie, security, Timing, slow network emulation: screenshots in `labs/01-network/figures`.
- [ ] Files `data/draw-io-normal.har`, `data/draw-io-fast3g.har` are in place, `npm run lab1:report` reproduces the report.
- [ ] Answers to the 16 control questions (per Q-01, Q-02).

LR2 Working environment (`labs/02-environment`, 10 questions):

- [ ] Screenshot of the terminal with Node, npm, Git versions, VS Code with extensions, explorer, Source Control (A section 6, item 18).
- [ ] Figma: palette, typography, moodboard, prototype, link in `site/design/figma-link.txt`, five SVG files in `site/design/figma`.
- [ ] `generated/check.ru.md` and `check.en.md` are fresh, `npm run lab2:report` passes.
- [ ] Answers to 10 questions, README with links to Figma and the repository.

LR3 Semantic markup (`labs/03-semantic-markup`, 10 questions):

- [ ] Branch `feature/semantic-markup` exists locally and on origin, the commit link is in the report.
- [ ] At least 8 different semantic tags, alt on all images, a single `<h1>`, skip-link (`site/index.html`).
- [ ] Screenshots of W3C Validator and Rich Results Test (`figures`, `docs/evidence`), Schema.org is present.
- [ ] Answers to 10 questions.

LR4 Responsive layout (`labs/04-responsive-css`, 12 or more questions):

- [ ] Files `variables base header main footer adaptive` and `style.css` with imports, three breakpoints (`site/css`).
- [ ] Screenshots at three resolutions, Firefox and Edge, the wording about browsers matches LR5-LR8.
- [ ] Headings `step-1..6` in `variables.css` match the report description (latest commit before acceptance).
- [ ] Answers to the questions.

LR5 JavaScript and DOM (`labs/05-javascript-interactivity`, 18 questions):

- [ ] At least 3 event types and 2 components, state in LocalStorage, form validation, try/catch.
- [ ] The `script.js` listing in the report matches `site/js/script.js` (report test).
- [ ] Code screenshot in VS Code, console, Event Listeners, the wording about Firefox and Edge has no "remains a task".
- [ ] Answers to 18 questions.

LR6 Asynchrony and storage (`labs/06-async-api-storage`, 30 questions):

- [ ] A keyless API (Kroki), `README` with a description, structure `api storage utils`, AbortController and retry.
- [ ] Screenshots of Network, Application, offline mode, console with logs.
- [ ] Answers to 30 questions.

LR7 React components (`react-app/`, `labs/07-react-components`, 20 questions):

- [ ] No `useState` and `useEffect` in `react-app/src` (a direct ban in the assignment), README matches the code.
- [ ] At least 5 components, props, key, children, mocks of at least 5 records.
- [ ] Screenshots at different resolutions and DevTools, answers to 20 questions.

LR8 Testing (`react-app/`, `labs/08-frontend-testing`, 15 questions):

- [ ] `jest.config.js` with thresholds, scripts `test`, `test:watch`, `test:coverage`, `npm run react:test` is green.
- [ ] Screenshots of Console, Sources, Network, React DevTools, Lighthouse before and after, coverage.
- [ ] A section about `npm test`, `npm run test:coverage` and Lighthouse exists in `react-app/README.md`.
- [ ] Answers to 15 questions.

### 4.3 Part 2: laboratory works LR1-LR8

For every work the common items: answers to control questions (16 questions, LR2 has 10), the branch is named correctly in the report, `README.md` says what was done, how to run and the branch name, `.env.example` exists, `.env` is not in the repository, report tests are green.

- [ ] LR1 (`lab21`, `part-2/lab-01-node-server`): routes GET, GET by id, POST, PUT, DELETE, 404 and 400 in JSON, screenshots of every endpoint, `postman_collection.json`.
- [ ] LR1: the decision "data in an array or in a DB" for an even variant is received (Q-03), report and code match it.
- [ ] LR1: `npm test` and `npm run lint`, the red load test `spike` is separated from functional ones.
- [ ] LR2 (`lab12`, `part-2/lab-02-sequelize`): PostgreSQL, migration with `addColumn`, seed, DB structure screenshots (`figures-pg`), 10 questions.
- [ ] LR2: `docker compose up -d`, `npm run db:migrate`, `npm run db:seed` run from scratch following the README.
- [ ] LR3 (`23`, `part-2/lab-03-auth`): registration 201 and 409, login, JWT, `GET /profile` with and without a token, RBAC, screenshots `figures-pg`.
- [ ] LR3: the lockout duration in the report matches the value in `limits.json` (the mechanism catalogue says 5 minutes).
- [ ] LR3: the report does not claim "SQLite by default" or "not run on PostgreSQL" unless that is true.
- [ ] LR4 (`24`, `part-2/lab-04-react-state`): `useState`, `useEffect` for localStorage, filter and sort, screenshots before and after reload, listing in an appendix.
- [ ] LR5 (`25`, `part-2/lab-05-react-api`): `api.js` with a token, loading, error with "Retry", optimistic update with rollback, check against the real LR3 server.
- [ ] LR6 (`26`, `part-2/lab-06-mongodb`): Atlas cluster screenshots, `.env` without a password, Compass or Data Explorer, nested documents, an empty `MONGODB_URI` does not break the README.
- [ ] LR7 (`27`, `part-2/lab-07-websocket`): Express and Socket.IO, two-window screenshots, ten figures inserted into RU and EN, a note about the client without React in the report.
- [ ] LR8 (`28`, `part-2/lab-08-docker`): server Dockerfile and multi-stage client, `docker-compose.yml`, `docker ps`, ports 80 and 5000 described through `.env`.
- [ ] LR8: the rerun on a fresh volume is described, the warning about an old volume with another password is present (`figures-rerun/README.md`).
- [ ] For LR2-LR8 the PDF in `E:\Downloads` (`ЛР2_отчёт_Хаджинова_К.А.pdf` ... `ЛР8_отчёт_Хаджинова_К.А.pdf`) is built from the current `report.md`, not from an earlier version (compare file dates with the commit).

### 4.4 Part 2: practical sessions PZ1-PZ4

- [ ] PZ1 (`pz21`, `pz-01-middleware-ejs`, 30 questions): EJS, request logging into a DB table for an even variant, `?auth=1`, 404 and 500 as separate pages, `limits.json`.
- [ ] PZ1: `report.md` matches the template, the PDF `ПЗ1_Middleware_EJS_отчет_v2.pdf` matches the current version.
- [ ] PZ2 (`pz22`, `pz-02-rest-api`, 30 questions): at least 3 resources, validation, `API.md`, OpenAPI, documentation screenshot and at least 5 requests.
- [ ] PZ3 (`pz23`): the React Router version in the assignment and in the code is the same or agreed (Q-04), the branch has no extra folder.
- [ ] PZ3: at least 4 pages, a dynamic route, `NavLink`, 404, a protected route, `useParams`.
- [ ] PZ4 (`pz24`, `pz-04-context-reducer`): prop drilling, ThemeProvider, language, a reducer for favourites, theme switching screenshots.
- [ ] In all PZ the answers to questions are in the required volume, the branch is named `pz21` ... `pz24`.

### 4.5 Course project (branch `course-app`)

- [ ] The topic is agreed (the generator for variant 26 gives professional retraining courses, DSLKit was chosen), the date and name of the approver are written in `docs/PROJECT-STATE.md` (Q-05).
- [ ] No `[TODO]` in `note.md` and `note.en.md` (search for the string `TODO`), including the title page, assignment, contents, cloud address, tests, reference 20, appendices C and G.
- [ ] Five ER entities, at least 3 modules, FR and NFR, Use Case, C4, endpoint table match `server/src`.
- [ ] References number 15 to 20, include books not older than 5 years and articles, STP format.
- [ ] The main part is 20-30 pages in Word, appendices A-G are named in the "(mandatory)" pattern.
- [ ] Server and client test numbers in 3.2 and appendix G match the `npm test` run (in `server` and `client`).
- [ ] NFR6 and NFR8 measurements are made, values and date are in the note.
- [ ] Cloud deployment: address, check date, `render.yaml` (if Render is chosen), section 2.4.3.
- [ ] Screenshots from `course-project/screenshots` and `diagrams` are inserted, captions follow the rules, the "all screens" appendix is filled.
- [ ] `note.md` and `note.en.md` are equal in structure and number of appendices (compare headings and line counts).
- [ ] `defence-cards.md` (32 cards, 6 blocks and "numbers for answers") matches the code and the note, numbers agree.
- [ ] `cheat-sheet.md` (5 sheets) can be reproduced by its instruction in 2 minutes (`docker compose up --build`, `http://localhost:8080`).
- [ ] Branch `course-app` is on origin, the application version (5 entities) is in it and not only in `course-project`.

### 4.6 MBP LR1 and LR2

- [ ] LR1: `Отчет_ЛР1_МБП.docx` and `.pdf`, five diagrams (A-0, A0, A2, node tree, organisational structure) match the assignment from Drive.
- [ ] LR2: `Отчет_ЛР2_МБП.docx` and `.pdf`, two BPMN diagrams, the subprocess "Check the code".
- [ ] The author "Khadzhinova K.A.", teacher "Rusak T.V.", the department of digital competences are written identically in both reports.
- [ ] Branches `docs/mbp-lr1`, `docs/mbp-lr2` hold the copies, no data is invented (unknown values are marked).

### 4.7 ITS-2026 papers

- [ ] Four documents (two papers, RU and EN): `paper-its/articles/a1-representation/khadzhynava-repr-ru.tex`, `...-en.tex`, `a2-spatial/khadzhynava-spatial-ru.tex`, `...-en.tex`, 2 pages each.
- [ ] Numbers in tables and figures match `paper-its/bench/results*.csv`.
- [ ] Nothing unmeasured is claimed (SVG and Canvas FPS, edge add and remove cost), references are verified.
- [ ] The Overleaf project compiles with the right file open, the template `its_conf.sty` is unchanged.

### 4.8 RU and EN consistency

- [ ] Every work has the pair `report.md` and `report.en.md`, `README.md` and `README.en.md` (where a pair is intended).
- [ ] The number of sections, figures, tables and appendices is the same in RU and EN (`grep -c "^!\["`).
- [ ] Figure numbers and captions correspond, the same screenshot file.
- [ ] Numbers (tests, coverage, sizes, time) are the same in RU and EN.
- [ ] English headings: "1 Purpose of the Work", "Conclusion", "Appendix A – ...".
- [ ] Links to branches and paths are neither translated nor changed.
- [ ] `docs/PROJECT-STATE.md` and `PROJECT-STATE.en.md`, `HANDOVER.md` and `HANDOVER.en.md`, `docs/study/*.md` and `*.en.md` have equal content.

### 4.9 Report rebuild and report tests

- [ ] `npm run lab1:report` ... `npm run lab8:report` do not change `report.md` and `report.en.md` (`git diff` is empty after the build).
- [ ] `node --test "labs/**/report.test.js"` passes for the eight works.
- [ ] The linter `tools/lint-report.js` returns `[]` for ru and en on every report.
- [ ] `npm run format:check` passes.
- [ ] In every Part 2 working copy `node --test report.test.mjs` passes (LR1-8, PZ1-4).
- [ ] The Part 2 build `node tools/build.js part-2/<folder>` does not change the reports.
- [ ] The `{{answers}}` block in the template holds all numbered answers, the build keeps the numbers required by `pickQuestions(26, N)`.
- [ ] The tests `tools/lint-report.test.js` and `tools/build-report.test.js` are green.

### 4.10 Currency of test numbers

- [ ] The root test count (`npm test`) matches README, `docs/PROJECT-STATE.md`, `docs/HANDOVER*.md`, the LR8 report.
- [ ] Root coverage is 100 % for lines, branches, functions (the threshold in the `npm test` command).
- [ ] The `react-app` numbers (`npm run react:test`) match README and the LR8 report.
- [ ] The numbers of each Part 2 work in `README.md`, `report.md` and `docs/study/*` match the run.
- [ ] Course project numbers (server, client, coverage) in `note.md`, `note.en.md`, `defence-cards.md`.
- [ ] Red tests of a run are split into functional, `.env` dependent, load (`spike`).

### 4.11 Links and paths

- [ ] All relative links in `report.md`, `README.md` lead to existing files.
- [ ] All `figures/*` screenshots from the template exist, there are no extra files.
- [ ] The branches named in reports (`lab21`, `lab12`, `23`, `24`, `25`, `26`, `27`, `28`, `pz21` ... `pz24`, `course-app`) exist: `git branch --list` and `git ls-remote --heads origin`.
- [ ] The repository link `https://github.com/KsushaKhadzhinova/DSLKit-Project` is correct, external links open.
- [ ] Paths in documents are given from the root or from the working copy, drive letters and user folders did not leak into reports.
- [ ] No secrets, tokens, passwords or `.env` in the repository, `.env.example` exists. Not committed: `.claude/admin-test-account.txt`, `.claude/worktrees/`, `.playwright-mcp/`, `.accelerator/profile.user.json`.

### 4.12 Teacher requirements for practical sessions and code (`06-teacher-requirements.md`)

- [ ] Page 500 is triggered by a real failure (DB stopped, file read denied), not by a button. The way to reproduce it is described in the report and confirmed by a screenshot.
- [ ] Pages 404 and 500 are styled like the site, not a default stub.
- [ ] The handler order is such that an error opens the styled 500 page.
- [ ] Even variant: the request log is written to a DB table, a write failure shows 500.
- [ ] Form checks: a non-empty field (including whitespace only), length limits, numeric fields not less than 0, identical on client and server.
- [ ] Huge numbers and strings do not crash the site.
- [ ] Limits are placed in a separate file (`limits.json`), not scattered through the code.
- [ ] Every record has a unique "creation time" field.
- [ ] The Part 1 site header is fixed (`position: sticky` or `fixed`).
- [ ] The report describes page 500 and the form checks, every error and function has a figure.
- [ ] The server starts from scratch by the README, tests are green on a clean machine.

### 4.13 Defence

- [ ] For every work answers to the variant's questions are prepared (25-27 of 30, 9-11 of 16, 5-7 of 10) and to the rest per the decision Q-01.
- [ ] The walkthroughs `docs/study/10..25-*.md` match the current branch code (file names, commands, ports).
- [ ] The owner can explain the code and write a small part of it in front of the examiner.
- [ ] The course project cards and cheat sheet are checked against the note and code (section 4.5), the demo runs by the README without editing files.
- [ ] The "numbers for answers" list (cards) matches the test run.

### 4.14 Open questions to the teacher (the answer and date go to `docs/PROJECT-STATE.md`)

- [ ] Q-01. Is it enough to answer questions n-1, n, n+1 of the variant (Part 2) or are all required (A section 5, item 1).
- [ ] Q-02. Are answers to control questions needed in Part 1.
- [ ] Q-03. For an even variant, LR1 data in a DB or in an array (33-QUESTIONS, question 31).
- [ ] Q-04. PZ3: is React Router v7 acceptable instead of v6 (question 32).
- [ ] Q-05. Is the DSLKit topic agreed instead of the topic of variant 26.
- [ ] Q-06. How to show page 500 where a real failure is impossible (question 33).
- [ ] Q-07. Is SQLite acceptable instead of PostgreSQL in LR2 and LR3 (question 34).
- [ ] Q-08. Are screenshots of every endpoint needed or one per operation (question 35).
- [ ] Q-09. Are "Faculty", "Department" and "List of references" needed in the lab formatting.
- [ ] Q-10. Two-line figure captions (the basis of the requirements: STP or personal).
- [ ] Q-11. Confirm that a PDF formatted per STP-2024 is uploaded to the LMS (assignment: "the report (PDF) is uploaded to the LMS") and who performs the transfer from Markdown to Word.

### 4.15 Testing documentation: traceability, versions, date

- [ ] In `docs/testing-kulikov/14-traceability-matrix.md` every requirement REQ-xxx is linked to a UC and a test case, no orphans.
- [ ] Every test case from `13-test-cases.md` has a REQ and a result in `20-ui-test-run.md`, every defect from `21-bug-reports.md` is linked to a case and a requirement.
- [ ] Every testing document states a version, a date and the branch with a commit hash, dates do not contradict `git log`.
- [ ] The requirements in `01-requirements.md` match the current site (registration, login, projects, templates).
- [ ] The plan `10-test-plan.md` and the checklists `11-checklists.md` refer to current commands (`npm test`, `npm run tc:full`).
- [ ] The number of scenarios and screenshots in `testing-course` and `docs/evidence/ui` matches the description.

## 5 How to run

Repository root (branch `testing-course-full`), commands from `package.json`:

```
npm ci
npm test
npm run format:check
npm run lab5:report
npm run react:test
git status --short labs
node --test labs/05-javascript-interactivity/report.test.js
node -e "import('./tools/lint-report.js').then(m=>console.log(JSON.stringify(m.lintReport(require('fs').readFileSync('labs/05-javascript-interactivity/report.md','utf8'),'ru'))))"
```

Build the other reports with `npm run lab1:report`, `lab2:report`, `lab3:report`, `lab4:report`, `lab6:report`, `lab7:report`, `lab8:report`. The last two commands of the block run the report test of one work and print the linter result (an empty array means "no remarks", language `ru` or `en`).

Part 2, in the folder `.claude/worktrees/<name>/part-2/<folder>`, and the report build from the working copy root:

```
npm ci
npm test
npm run lint
node --test report.test.mjs
node tools/build.js part-2/lab-01-node-server
```

There is no `lint` script in LR4-LR8, PZ3, PZ4. In LR4, LR5, PZ3, PZ4 `npm test` runs `vitest run`, then `node --test report.test.mjs`. LR8 tests: `node --test docker.test.mjs hardening.test.mjs report.test.mjs`.

Course project (working copy of branch `course-app`), search for RU and EN discrepancies, branch check:

```
cd course-project/app/server && npm test
cd ../client && npm test
git grep -n "TODO" -- course-project/note.md course-project/note.en.md
git grep -c "^!\[" -- "labs/*/report.tpl.md" "labs/*/report.en.tpl.md"
git branch --list lab21 lab12 23 24 25 26 27 28 pz21 pz22 pz23 pz24 course-app
git ls-remote --heads origin
```

Order: root, then the Part 2 working copies one at a time, then the course project. Run heavy checks (PostgreSQL, MongoDB, load tests) separately. Do not copy `.env` values into reports.

Branch names follow the table in `docs/HANDOVER-SESSION-2026-10-28.md`: LR1 `lab21` (`w-lab21`), LR2 `lab12` (`check-lab12`), LR3 `23` (`part2-server-labs-87ed8e`), LR4 `24` (`lab24-fix`), LR5 `25` (`lab25`), LR6 `26` (`part2-mongo-work-6cc76b`), LR7 `27` (`part2-ws-work-ee9b7b`), LR8 `28` (`lab28`), PZ1 `pz21` (`w-pz21`), PZ2 `pz22` (`check-pz22`), PZ3 `pz23` (`check-pz23`), PZ4 `pz24` (`w-pz24`), course project `course-app` (`angry-goldberg-bca72d`).

## 6 Artifacts

- The filled checklist: a copy of section 4 with "- [x]" marks and evidence paths, the date and commit hash of every branch.
- Tables "requirement, evidence, status" per work: `docs/ITIVP-AUDIT-<date>.md` in a new edition, the earlier audit of 2026-10-29 stays untouched.
- The run log (command, date, test count, red count, cause of red) and the list of report discrepancies against templates and code, with an owner and a deadline.
- The list of questions to the teacher Q-01 ... Q-11 with the date of the answer.
- Linter results of `tools/lint-report.js` for every ru and en report and the RU and EN comparison (number of sections, figures, tables, appendices).
- Updated `docs/ITIVP-CHECK.md`, `docs/PROJECT-STATE.md` (teacher decisions, dates) and the traceability matrix `docs/testing-kulikov/14-traceability-matrix.md` with a version and date.
- This file and the Russian version `08-docs-acceptance.md` (`docs/test-plans/specialists`).
