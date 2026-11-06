# Test plan and checklist: functional testing (lead QA)

Version 1.0, date 06.11.2026, subject: the DSLKit site from `site/` on branch `testing-course-full`, plus the course work of Part 1 (`labs/`), Part 2 (`part-2/` in branches 21…28, pz21…pz24) and the course project (branch `course-app`, folder `course-project/app`). This document adds to the finished set in `docs/testing-kulikov/` what is missing there and does not repeat it. All checkboxes are empty: no run has been made against this plan yet. Russian version: `01-qa-functional.md`.

IDs referenced: `TC-001…TC-224` (13-test-cases.md), `CL-<screen>-<number>` (11-checklists.md), `REQ-001…REQ-214` (01-requirements.md), `UC-01…UC-23` (02-use-cases.md), `EX-1…EX-6` (10-test-plan.md, section 8), `BUG-N01…N21`, `M-01…M-18`, `BUG-CB-01…08`, `B-01…B-18` (reports 42, 51, 71, 80), `BUG-01…16` (31-api-bug-reports.md). New items of this document look like `QF-<section>-<number>`.

## 1. Role and scope

The lead QA is responsible for the product doing what the requirements promise and never losing user data. The scope: functional testing through the interface and through the own rendering API, smoke checks of every build, the critical path, regression after fixes, exploratory sessions, acceptance checks (UAT) on the owner's scenarios, boundary values and negative scenarios. Outside the role (separate specialists exist): security, load, accessibility, the cross-browser matrix, document layout. They appear here only where a function cannot be checked without them.

What exists before this plan: 224 cases, 100 % coverage of 102 requirements (14-traceability-matrix.md, section 5), runs 20, 30, 41, 50, 70, 80, the e2e scripts `testing-course/full/*.py`. This plan closes four kinds of gaps: functions that appeared after the matrix (section 3.3), outdated expectations in cases, the order and priorities of a run, entry and exit criteria for a release.

## 2. What the specialist checks (priorities)

| Priority | Meaning                                           | What it contains                                                                                                            |
| -------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| P0       | Blocks the release, data loss, work is impossible | Smoke set, the critical path (register, diagram, save, sign out, sign in), separate storage per user, `/api/render` answers |
| P1       | A main function is broken, a workaround exists    | Trash and restore, quota, templates, export and import, autosave, problems and run, settings, ru/en                         |
| P2       | A minor function, a rare scenario                 | Filters and sorting, hotkeys, editor panels, the help pages, the expert system, decision support, offline PWA               |
| P3       | Cosmetics, convenience, optional scenarios        | Captions, empty states, printing, hints, rare formats, course materials                                                     |

## 3. Plan

### 3.1 Goals

Confirm in 15 minutes that a build is fit for testing (smoke). Confirm the end-to-end scenarios: `testing-course/documents/05-business-critical-path.md` plus UC-01, UC-02, UC-04, UC-06, UC-12, UC-19. Close the gaps of section 3.3 and update cases with an outdated expectation. Make sure closed defects did not return (4.K). Take the decision "release / do not release" by the criteria of section 3.7.

### 3.2 In scope and out of scope

In scope: the landing page `/` and `/en/`, `privacy.html`, `thanks.html`, `/app/login|register|welcome|dashboard|editor|settings|docs|expert|decision.html` and their copies in `/en/app/`, the pages in `site/errors/` (400, 403, 404, 405, 431, 500), `sw.js`, `manifest.webmanifest`, `/api/*`, and also starting and the content of the labs and the course project at the level "works as the README says".

Out of scope (handed to other roles or recorded as a limitation): the internals of the notation parsers (covered by `npm test` with 100 % coverage thresholds), real server authentication (there is none, R-05 in 10-test-plan.md), the public Kroki service (only the behaviour when it is unavailable, TC-155, TC-218), load and security in depth (reports 61, 80), layout against the mockup (report 95).

### 3.3 What is not covered yet or is outdated (the basis of the new items)

| Gap                                                                                                                      | Evidence                                                                                                        | Checklist section |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------- |
| The landing form (`#waitlist-form`), `thanks.html`, `privacy.html`, `robots.txt`, `sitemap.xml` are not in 13 and 11     | a search of 13-test-cases.md and 11-checklists.md finds no `waitlist`, `thanks`, `privacy`, `sitemap`, `robots` | C                 |
| Pages `docs.html`, `expert.html`, `decision.html`: only a walk-through in 40, 41, 50, no functional cases                | `site/js/components/docs.js`, `expert.js`, `decision.js`, `site/js/decision/*`, `site/js/expert/*`              | J                 |
| Automatic diagram building in the editor and `/api/ai/status`, `/api/ai/generate`                                        | `site/js/components/automation.js`, `tools/ai-api.js`, start with `npm run start:ai`                            | J, I              |
| Endpoints `GET /api/engines` and `/api/external/<type>`                                                                  | `tools/render-api.js` (lines with `/api/engines`, `EXTERNAL_TYPES`)                                             | I                 |
| Editor panels: search and replace (Ctrl+F), version history and commits, the "Share" link, tabs "Output", "Expert"       | `site/js/components/editor-tools.js`, `editor-actions.js`, `editor.html` (`data-panel`, `data-problems-tab`)    | F                 |
| Roles "developer" and "admin" (no daily limit) and documentation edited only by a developer                              | `site/js/config/roles.js`, `site/js/components/docs.js`, `auth.js`                                              | E, J              |
| The quota now limits creation (commit 3bb2482, BUG-N19), while TC-069…TC-073 and R-08 describe "only displayed"          | `site/js/storage/projects.js` (`DAILY_LIMIT`, refusal `null`), 42-bug-reports.md                                | E                 |
| Open defects without a re-check: BUG-N07, N08, N09, N12…N17, the M series                                                | 42-bug-reports.md (column "Status"), 51-manual-bugs.md                                                          | K                 |
| Part 1 and Part 2 labs and the course project have their own tests, but no single pass of "builds and starts per README" | `package.json` in `part-2/lab-*`, `course-project/app/{server,client}`                                          | O                 |

### 3.4 Approach

- Order of layers: smoke, critical path, then P1 by section, then P2/P3, then exploratory sessions, then regression 4.K, then UAT.
- Automation is used where it already exists: `npm test` (unit), `npm run tc:full` (static analysis, e2e of the editor and sign-in, report build), single `testing-course/full/*-e2e.py` scripts. New items are run by hand and become automation candidates once passed twice.
- Every defect found is written by the fields of 10-test-plan.md (section 11) and takes the next number in a new run report file, old reports are not edited.

### 3.5 Environment and data

- Server: `npm start` (port 5173, `tools/serve.js site 5173`). Older documents say 5190, before a run bring them to one port and write it into the protocol.
- Browsers: Chrome and Edge (main), Firefox, WebKit (selective, details with the compatibility specialist). Windows: 375, 768, 1366 px. Themes: light, dark. Languages: ru, en.
- Data: an empty profile (`localStorage.clear()`), users A and B from 13-test-cases.md (test values), the DSL set from 12-test-design.md, an account with the admin role: its data is in the owner's local file and never enters the repository.
- Time: the daily quota and the 30-day trash are checked by shifting the fields `created`, `trashedAt` in the key `projects.<id>`.
- Automatic building needs a key in the owner's `.env` and the command `npm run start:ai`. Without a key only the fallback mode "by rules" is checked. The key never goes into the chat or the repository.

### 3.6 Entry criteria

- [ ] The working tree is clean with respect to the site code, the build version is recorded (commit hash).
- [ ] `npm test` in the root ends with code 0 (coverage thresholds 100 % for lines, branches, functions).
- [ ] `npm run format:check` does not fail on the files that were changed.
- [ ] The server answers 200 on `/` and `/app/dashboard.html`, the browser profile is empty.
- [ ] The list of open defects of the previous run is current (4.K).

### 3.7 Exit criteria

- [ ] 100 % of P0 items passed, 100 % of P1 passed or defects opened with the owner's decision, at least 90 % of P2 and P3.
- [ ] No open Critical or High defects, at most three Medium ones with an agreed workaround (10-test-plan.md, section 6).
- [ ] Smoke and the critical path passed in Chrome or Edge and in Firefox.
- [ ] Every owner decision on items marked "clarify" is written into the protocol.
- [ ] The protocol, the defect report and the final summary are published (section 6).

Suspension: the server or any `/app/*` page does not open, smoke fails, a leak of data between users is found. Resumption: after the fix and a repeated smoke.

### 3.8 Risks

| ID    | Risk                                                                                                      | Measure                                                                                            |
| ----- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| RF-01 | Old cases with an outdated expectation (quota, fixed defects) give false failures                         | Before a run compare TC-069…TC-073, TC-101, TC-104, TC-105 with the current code                   |
| RF-02 | Data lives only in the browser, a tester error wipes other test data                                      | A separate browser profile per user, `localStorage.clear()` only in the test profile               |
| RF-03 | Time and quota depend on the computer clock                                                               | Shift the data, not the system clock, record the run time                                          |
| RF-04 | The external rendering service or the network is down and hides defects, old reports name different ports | The engine "in the browser" as the main one, the external one as a separate item, one port per run |

## 4. Checklist

Format: `QF-<section>-<number>`, priority in brackets, a reference to a screen, a file or an ID. Each item is passed or failed. The mark "clarify" means that the expected behaviour needs the owner's decision.

### A. Smoke (15 minutes, every build)

- [ ] QF-SMK-01 (P0) `npm start` brings the server up, `/` and `/en/` answer 200 without console errors (CL-GEN-08, TC-170).
- [ ] QF-SMK-02 (P0) Nine pages `/app/*.html` open, "My projects" sends a guest to sign-in, guest access to `docs`, `expert`, `decision` to check (TC-004, TC-005, TC-006, TC-054).
- [ ] QF-SMK-03 (P0) Registering a new user leads to `welcome.html`, the session is created (CL-REG-02, TC-022).
- [ ] QF-SMK-04 (P0) Signing in with correct data leads to "My projects", signing out returns to the landing page (TC-007, TC-165).
- [ ] QF-SMK-05 (P0) The first visit to "My projects" shows 6 starter diagrams (CL-DASH-03, TC-056).
- [ ] QF-SMK-06 (P0) The editor draws a diagram from the template `?template=idef0` on the "Run" button (TC-116).
- [ ] QF-SMK-07 (P0) A DSL error gives a line in the problems panel and blocks the run (CL-ED-04, TC-118).
- [ ] QF-SMK-08 (P0) A change of the code is saved automatically and survives a reload (TC-123).
- [ ] QF-SMK-09 (P0) `POST /api/render` with a valid source answers 200 with the field `svg` (CL-API-04, TC-174).
- [ ] QF-SMK-10 (P0) `GET /api/notations` returns 33 notations (CL-API-01, TC-171).
- [ ] QF-SMK-11 (P0) An unknown address gives the 404 page (CL-GEN-05, TC-168).
- [ ] QF-SMK-12 (P0) The data of user A is not visible to user B in the same profile (CL-DASH-16, TC-074).

### B. Critical path and end-to-end scenarios

- [ ] QF-CRP-01 (P0) Register, create a diagram, edit, sign out, sign in, the diagram is in place with the last edit (UC-01, UC-02, UC-06, TC-200).
- [ ] QF-CRP-02 (P0) Create, rename, move to trash, restore, open the project (UC-08, UC-09, TC-207).
- [ ] QF-CRP-03 (P0) Export a finished diagram to SVG and import the code again, the result matches (UC-19, UC-20, TC-142, TC-147).
- [ ] QF-CRP-04 (P1) Like a shared example, a copy in "My projects", open the copy, edit it (UC-11, TC-104, TC-079).
- [ ] QF-CRP-05 (P1) Save a project as a template and a new diagram from the template (UC-10, TC-101, TC-217).
- [ ] QF-CRP-06 (P1) Switching the language ru to en in the middle of work keeps the screen and the project (UC-21, TC-141, TC-221).
- [ ] QF-CRP-07 (P1) Guest scenario: a diagram without registration, then registration, clarify the fate of the guest's work (BUG-N17, TC-075).
- [ ] QF-CRP-08 (P1) A full cycle on a phone, 375 px: sign in, project, tabs "Code" and "Diagram" (CL-ED-21, TC-136).

### C. Landing page ru/en and supporting pages (new)

- [ ] QF-LND-01 (P1) Landing page `/`: anchors `#notations`, `#how`, `#audience`, `#pricing`, `#faq`, `#waitlist` lead to their blocks, the menu works, the CTAs lead to sign-in and registration (TC-003).
- [ ] QF-LND-02 (P1) Form `#waitlist-form`, empty submit: errors on the required fields name, email, notation, team size, consent (`validateWaitlist`, `site/js/utils/validation.js`).
- [ ] QF-LND-03 (P1) The form with valid data leads to `thanks.html` or shows a confirmation, clarify the behaviour and what exactly is sent (`waitlist-form.js`).
- [ ] QF-LND-04 (P2) Boundary values of the form fields: name, email 120/121, comment, team size, a notation outside the list (12-test-design.md, section 1.4 as a model).
- [ ] QF-LND-05 (P2) The consent box is required, without it the submit is blocked, the error is tied to the field (`#consent-error`).
- [ ] QF-LND-06 (P2) The same set on `/en/`: error texts and captions in English, links do not lead to the Russian version (CL-LOGIN-14, TC-140, TC-141).
- [ ] QF-LND-07 (P3) `privacy.html` and `en/privacy.html` open, the links to them from the form and the footer are not broken.

### D. Sign-in, registration, welcome: only what the TC set lacks

- [ ] QF-AUT-01 (P1) Notes after signing in, signing out and registration are shown and do not block the transition (commit 78731a2, `toast.js`).
- [ ] QF-AUT-02 (P1) Signing out in another tab closes the "My projects" page in the first one (BUG-N01, TC-167), re-check after changes to auth-gate.
- [ ] QF-AUT-03 (P2) Turning on the roles "developer" and "admin" with a code: wrong code, empty code, leaving the role, signing in without an account (texts `roleWrong`, `roleSignIn` in `auth.js`).
- [ ] QF-AUT-04 (P2) The tour of `welcome.html` and of the editor is not shown again after closing, key `dslkit.tour-done` (CL-REG-20, TC-053, TC-216).

### E. "My projects": trash, templates, quota, seeds

- [ ] QF-PRJ-01 (P0) Quota: the sixth new diagram of a day is not created, the user sees a clear message (BUG-N19, `projects.js` refusal `null`, `quota.js`).
- [ ] QF-PRJ-02 (P1) Quota at exactly 4, 5 and 6 of 5: the indicator, the caption "Beta: N of 5 created today" and the block agree on every page of the app (QF-PRJ-01, CL-DASH-12).
- [ ] QF-PRJ-03 (P1) The roles "developer" and "admin" create more than five, the caption says "no daily limit" (`quotaLabel`, `unlimited`).
- [ ] QF-PRJ-04 (P1) What counts as creation: a copy of a shared example, import, new from a template, duplicate. What does not: seeds, templates, edits (CL-DASH-05, CL-TPL-07, TC-109), bring TC-069…TC-073 up to date.
- [ ] QF-PRJ-05 (P1) Quota and trash together: items moved to trash stay in the count, restoring does not bypass the limit (CL-DASH-15, TC-073).
- [ ] QF-PRJ-06 (P1) Quota and two tabs: two quick creations at the border of 4 and 5 do not give a sixth project (R-07, TC-203).
- [ ] QF-PRJ-07 (P1) Trash auto-cleaning: at 29 days the project is there, at 30 days it is erased, a future date does not extend the term (BUG-N20, TC-097, TC-098, TC-205).
- [ ] QF-PRJ-08 (P1) Trash: restore, delete forever, "Empty trash" with a number, an empty trash hides the button (CL-PRJ-08…CL-PRJ-10).
- [ ] QF-PRJ-09 (P1) Six seeds are created once, deleted ones do not return on a repeated sign-in or a language switch (CL-DASH-03, CL-DASH-04, TC-056…TC-058).
- [ ] QF-PRJ-10 (P1) A repeated "Like" creates no new copies, removing the mark does not delete the copy (BUG-N18, CL-TPL-02, CL-TPL-03).
- [ ] QF-PRJ-11 (P1) A template deleted in another tab does not come back on autosave and Ctrl+S (BUG-N02, `?tpl=`).
- [ ] QF-PRJ-12 (P2) Section "My templates": create, rename, edit, delete with a warning (CL-TPL-08, CL-TPL-11, TC-110…TC-112, TC-224).
- [ ] QF-PRJ-13 (P2) Search from the top bar on other pages (`dashboard.html?q=`) and the remembered search that hides all projects (BUG-N16, TC-211, `app-search.js`).

### F. Editor

- [ ] QF-EDT-01 (P0) DSL input: typing on the keyboard does not pile up indentation, Tab, Enter, `}` behave as described (M-16, `code-input.js`).
- [ ] QF-EDT-02 (P0) All 33 notations are drawn from templates and survive a notation change in the header (CL-ED-07, CL-ED-08, TC-121, TC-122).
- [ ] QF-EDT-03 (P0) Changing the notation over hand-typed code warns or keeps the code (BUG-N15, clarify).
- [ ] QF-EDT-04 (P0) Autosave: on, off, the last second of typing on a language switch and on sign-out (BUG-N03, CL-ED-09, TC-123, TC-124).
- [ ] QF-EDT-05 (P1) A full storage reports the refusal instead of "Saved" (B-06, TC-051, commit 70878fe).
- [ ] QF-EDT-06 (P1) Palette: adding a node of each notation, identifiers without a case clash `T1` and `t1` (CL-ED-19, M-09, TC-154).
- [ ] QF-EDT-07 (P1) Connecting blocks, Escape cancels, Delete and Backspace remove the selected block (M-06, CL-ED-19, TC-154, TC-214).
- [ ] QF-EDT-08 (P1) Dragging a block with the mouse inside the board and beyond it (M-04, M-05, TC-153) and with a finger on a phone (BUG-CB-01, `canvas-drag.js`).
- [ ] QF-EDT-09 (P1) Export SVG, PNG, JPEG, draw.io, HTML: the file opens, the file name, an empty diagram is not exported silently (BUG-N14, CL-ED-14, TC-142…TC-146).
- [ ] QF-EDT-10 (P1) Import from a file and from the clipboard: flowchart, sequence, states, DSL code, a foreign and a large file (CL-ED-15, TC-147…TC-149, B-10).
- [ ] QF-EDT-11 (P1) Problems panel: switching the tabs "Problems", "Output", "Versions", "Expert", the counter in the button is right, a click on a problem leads to the line (CL-ED-04, TC-213, `problems-panel.js`).
- [ ] QF-EDT-12 (P1) The file name in the problems panel and in the tab matches the open project (M-03).
- [ ] QF-EDT-13 (P1) Opening a project and a template shows its code, not the default code (M-02, CL-PRJ-01, CL-TPL-01).
- [ ] QF-EDT-14 (P1) The button "Empty file" gives an empty file (M-01).
- [ ] QF-EDT-15 (P1) The "Share" link opens the same code for the recipient, a damaged link does not break the editor (`shareLink`, `codeFromHash` in `editor-actions.js`).
- [ ] QF-EDT-16 (P2) Hotkeys: Ctrl+S, Ctrl+Enter, Ctrl+K (in the editor too), Ctrl+F, Escape in panels, Ctrl+Z and Ctrl+Y, Cmd on Mac (CL-ED-12, CL-ED-23, BUG-N12).
- [ ] QF-EDT-17 (P2) Search and replace (Ctrl+F): find, "Match case", "Replace all", counters "Found" and "Replaced" (`editor-tools.js`).
- [ ] QF-EDT-18 (P2) Version history: a commit with a message, "No changes", compare, restore, copy the diff, autosave leaves versions (`editor-tools.js`).
- [ ] QF-EDT-19 (P2) Tour: the order of steps, closing with Escape, highlighting of existing elements, not cut off at 375 px (BUG-CB-03, TC-216, `tour.js`).
- [ ] QF-EDT-20 (P2) A large diagram: 30, 80, 150 blocks, acceptable response, the tab does not hang (21-bug-reports.md BUG-01, B-01, B-09, REQ-209).
- [ ] QF-EDT-21 (P2) Element names in Russian: identifiers, attributes and values (commit 3a215e3), new elements get names in the language of the page.

### G. Settings

- [ ] QF-SET-01 (P1) Every option is saved and applied in the editor: font, line numbers, wrapping, grid, guides, autocomplete (CL-SET-01…CL-SET-03, M-10, BUG-N08).
- [ ] QF-SET-02 (P1) The items of the left settings menu do what they promise or are hidden (BUG-N07, M-17).
- [ ] QF-SET-03 (P1) Choosing the engine "in the browser" and the external one: the caption in the status bar and work offline (CL-SET-05, CL-ED-20, TC-155, TC-161).

### H. Error pages and PWA

- [ ] QF-ERR-01 (P1) Pages 400, 403, 404, 405, 431, 500 exist, the links to the home page and into the app lead to the right language (`site/errors/*.html`, BUG-N09, BUG-N11).
- [ ] QF-ERR-02 (P2) 404 for `/en/...` addresses shows an English page (BUG-N09, open).
- [ ] QF-ERR-03 (P2) Addresses `/app/Dashboard.html`, `/app/dashboard.html/`, `//app/dashboard.html` do not bypass the guard and do not give a page without styles (BUG-N05).
- [ ] QF-ERR-04 (P1) First visit online, then offline: the landing page, sign-in, editor and "My projects" open from the cache (`sw.js` `SHELL`, CL-GEN-06, TC-169).
- [ ] QF-ERR-05 (P2) Installing as an app: `manifest.webmanifest` (`start_url`, icons 192, 512, maskable) is right and served with the type `application/manifest+json` (BUG-N10, TC-220).

### I. The own API (`/api/*`), new only

- [ ] QF-API-01 (P1) `GET /api/engines` returns the engine `dslkit` with `endpoint` and the number of notations (`render-api.js`).
- [ ] QF-API-02 (P1) `POST /api/external/<type>` for one allowed type from `EXTERNAL_TYPES` and for a disallowed type (404 or 400, clarify), a body over the limit (413).
- [ ] QF-API-03 (P1) An external answer with `<script>`, `on...=` or `javascript:` is rejected (`UNSAFE_SVG`), the 10 s timeout gives a clear error (BUG-07, BUG-08 in 31).
- [ ] QF-API-04 (P1) `GET /api/ai/status` without a key reports that the mode is unavailable and does not leak the key, `POST /api/ai/generate` without a key and with a body above `MAX_TEXT` (20000) (`tools/ai-api.js`).
- [ ] QF-API-05 (P1) A source with more lines than `MAX_LINES` (2000) is refused with a clear error, independent of the 100000 character limit (`render-api.js`).
- [ ] QF-API-06 (P2) `HEAD` on the GET endpoints, type 415 for a foreign `Content-Type`, text without the `diagram` header, the CR line break (BUG-10, 11, 12, 13 in 31, re-check the status).
- [ ] QF-API-07 (P2) The keys `diagram constructor` and `diagram __proto__` do not give 500 (BUG-05 in 31).
- [ ] QF-API-08 (P2) The path `/api/../index.html` answers instead of hanging (BUG-02 in 31).
- [ ] QF-API-09 (P2) Every `/api/*` answer carries the security headers and `Cache-Control: no-store` (CL-API-21, BUG-06 in 31).

### J. Help, expert system, decision support, automatic building pages (new)

- [ ] QF-NEW-01 (P2) `docs.html`: sections `project`, `guides`, `code` open, search and markdown are shown, inner links work (`docs.js`, `content.ru.js`, `content.en.js`).
- [ ] QF-NEW-02 (P2) `docs.html`: editing only in the developer role, an ordinary user gets a refusal (`forbidden`), the edit is saved and marked "Changed by a developer" (`storage/docs.js`).
- [ ] QF-NEW-03 (P2) `expert.html`: a survey over the knowledge bases (`BASES`), questions go until a conclusion, an answer changes the conclusion, going back to the previous question (`expert/engine.js`).
- [ ] QF-NEW-04 (P2) `expert.html`: a diagram described in words becomes facts and a review, an empty description does not crash (`factsFromDescription`, `reviewDiagram`).
- [ ] QF-NEW-05 (P2) The review from the editor ("Review the diagram", tab "Expert") matches the number of remarks with the output on `expert.html` (`expert-panel.js`).
- [ ] QF-NEW-06 (P2) `decision.html`: choose a task, enter criteria and scores, the result and its explanation (`decision/tasks.js`, `methods.js`).
- [ ] QF-NEW-07 (P2) `decision.html`: boundary values of scores and weights, zero criteria, one alternative, inconsistent pairwise comparisons on the Saaty scale (`problemErrors`, `taskProblem`).
- [ ] QF-NEW-08 (P2) `decision.html`: the report in DSL and Markdown, reopening a saved task, separate storage per user (`decision/report.js`, `store.js`).
- [ ] QF-NEW-09 (P2) Automatic building "by rules" without a key: idea, code and file, inserting into the editor, the request history and its clearing (`automation.js`, `automation/*`).
- [ ] QF-NEW-10 (P3) Automatic building with a key: a picture of a scheme, a wrong file format, too large a picture, a cut answer, done by the owner on her machine.

### K. Regression over closed and open defects

- [ ] QF-REG-01 (P0) Repeat the cases of all fixed defects BUG-N01…N06, N10, N11, N18…N21 (42-bug-reports.md).
- [ ] QF-REG-02 (P1) Re-check the open BUG-N07, N08, N09, N12…N17, record the current status in the new protocol.
- [ ] QF-REG-03 (P1) A storage damaged in one value does not crash "My projects" (BUG-03 in 21-bug-reports.md, TC-076, TC-077).
- [ ] QF-REG-04 (P1) A damaged session and a damaged list of accounts (CL-X-05, CL-X-06, TC-201, TC-202).
- [ ] QF-REG-05 (P1) The character U+2028 and thousands of vertices in a graph do not crash the editor (B-03, B-01).
- [ ] QF-REG-06 (P1) The 201st project and the limit of 200 (B-05, TC-078).
- [ ] QF-REG-07 (P1) A closed tab, denied access to `localStorage`, registration under the denial (B-07, B-08, TC-204).
- [ ] QF-REG-08 (P2) Update the cases whose expectation is outdated and record it in the protocol (QF-PRJ-04, RF-01).

### L. Boundary values and negative scenarios (additions)

- [ ] QF-NEG-01 (P1) Project title of 200 and 201 characters, 1000 characters, only spaces, only emoji, clarify the upper limit (R-10, TC-085…TC-087).
- [ ] QF-NEG-02 (P1) Quota at the day border: 23:59 and 00:01 by the device clock (TC-072, 12-test-design.md, section 1.7).
- [ ] QF-NEG-03 (P1) A DSL source of 99999, 100000, 100001 characters in the editor and in the API alike (CL-API-09, TC-150, TC-181, TC-182).
- [ ] QF-NEG-04 (P2) An import file of zero length, 30 MB, with a BOM, in a non UTF-8 encoding (B-10, TC-148, TC-149).
- [ ] QF-NEG-05 (P2) Double and triple quick clicks: "Run", "Save", "To trash", "Restore", "Like" (TC-099, TC-015, TC-047).
- [ ] QF-NEG-06 (P2) The address `?template=` with an unknown key, `__proto__`, `constructor` (BUG-N04, TC-212).

### M. Exploratory sessions (45 minutes, new charters next to EX-1…EX-6)

- [ ] QF-EXP-01 (P2) EX-7: "User without hints" goes from the landing page to export using only the interface and records the difficulties.
- [ ] QF-EXP-02 (P2) EX-8: break the quota and the trash together (shifted dates, two tabs, roles).
- [ ] QF-EXP-03 (P2) EX-9: the help, expert system and decision support pages: unusual input, a language switch in the middle of work.

### N. Acceptance checks (UAT, done by the owner or her representative)

- [ ] QF-UAT-01 (P0) A student creates the first diagram without instructions in 5 minutes (UC-06, persona 90).
- [ ] QF-UAT-02 (P1) An analyst builds BPMN or IDEF0 from a template and exports to SVG and draw.io (persona 91, UC-19).
- [ ] QF-UAT-03 (P1) A teacher opens a shared link and sees the student's code (QF-EDT-15, persona 90).
- [ ] QF-UAT-04 (P1) A phone user views and edits a diagram (persona 92).
- [ ] QF-UAT-05 (P1) The owner confirms decisions on the "clarify" items: title limit, fate of the guest's work, quota behaviour, form format.
- [ ] QF-UAT-06 (P2) The final acceptance sheet is signed with the date, the build version and the list of accepted deviations.

### O. Course work of Part 1 and 2 and the course project

- [ ] QF-EDU-01 (P1) `npm test` passes in the root, the Part 1 reports `lab1:report` … `lab8:report` build (commands in section 5).
- [ ] QF-EDU-02 (P1) `npm run react:test` passes (`react-app/`).
- [ ] QF-EDU-03 (P1) Each folder `part-2/lab-*` in its branch: `npm install`, `npm test`, start per README, the entry point answers (branches 21…28, check the table in HANDOVER-SESSION-2026-10-28.md).
- [ ] QF-EDU-04 (P1) Labs 2 and 3 with the database: migrations `db:migrate`, `db:seed`, calls to protected addresses with and without an access token (`part-2/lab-03-auth`, check that Docker is present).
- [ ] QF-EDU-05 (P2) Lab 5: the client `npm run dev` talks to the server, loading states and errors are shown (`part-2/lab-05-react-api`).
- [ ] QF-EDU-06 (P2) The course project (branch `course-app`, `course-project/app`): `server` (`npm test`, `db:migrate`, `db:seed`), `client` (`npm test`, `npm run dev`), scenarios of sign-in, list, adding, error (five entities, see the course README).

Total checklist items in section 4: 121.

## 5. How to run

All commands come from the root `package.json` unless noted. The site server is started in a separate terminal window.

```bash
npm install                      # once
npm start                        # the site on http://localhost:5173 (tools/serve.js site 5173)
npm run dev                      # the same with a restart on edits
npm run start:ai                 # with the .env file, needed for automatic building (QF-NEW-10)
npm run build && npm run start:prod   # check the built version from dist/
npm test                         # unit tests of labs and tools, coverage thresholds 100 %
npm run format:check             # formatting check
npm run react:test               # tests of react-app
npm run tc:lab2                  # cases of the request form (QF-LND-02…05)
npm run tc:lab3                  # smoke (8) and critical path (36) checklists
npm run tc:full                  # static analysis, e2e of editor and sign-in, report build
python testing-course/full/critical-path-e2e.py   # critical path (QF-CRP)
python testing-course/full/editor-e2e.py          # editor (QF-EDT)
python testing-course/full/auth-e2e.py            # sign-in and registration (QF-AUT)
python testing-course/full/palette-e2e.py         # palette (QF-EDT-06, 07)
python testing-course/full/scenarios-e2e.py       # scenarios, part was red in the last known run, check
python testing-course/full/extra-e2e.py          # also click-everything.py, node static-sec-perf.js
npm run lab1:report ... npm run lab8:report       # build the reports of labs 1…8 of Part 1
```

For the API: `curl -s http://localhost:5173/api/notations`, `curl -s -X POST -H "Content-Type: application/json" -d "{\"source\":\"diagram idef0\"}" http://localhost:5173/api/render` (clarify the sample source with `npm run dsl:reference`). The DSL reference: `npm run dsl:reference`. Part 2 labs and the course project: in the working copy of the needed branch (`E:\DSLKit-Project\.claude\worktrees\`) run `npm install`, then `npm test` and `npm start` or `npm run dev` in the lab folder. The e2e scripts need Python 3.10+ with Playwright and an installed Edge browser (a requirement of `testing-course/full/*.py`).

Run order: A, then B, C and D, E, F, G, H, I, J, then K and L, then M, then N, then O (in parallel with the rest, a separate tester).

## 6. Output artifacts

- The run protocol `docs/test-plans/runs/<date>-qa-functional.md` and `.en.md`: the filled checklist of section 4 with the build version, browsers and port (created at the first run, not created by this plan).
- The defect report in the format of 10-test-plan.md, section 11, numbering continues from BUG-N21.
- Case updates: the list of changed TCs (at least QF-PRJ-04, QF-REG-08) and new TCs numbered after TC-224.
- An updated traceability matrix: new rows for the REQs of the docs, expert, decision pages, the landing page and the API (engines, external, ai).
- Notes of the exploratory sessions EX-1…EX-9.
- The UAT acceptance sheet (QF-UAT-06).
- The final summary: items done, passed, failed, blocked by priority, the decision "release / do not release".
