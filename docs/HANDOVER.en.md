# Project handover: where to start

A document for whoever continues DSLKit: the owner herself some time later or another person. Everything important is here, the details are behind the links. Updated 23 October 2026. Russian version: [`HANDOVER.md`](HANDOVER.md).

## 1 What the project is

DSLKit is a web editor for diagrams as code: text on the left, the diagram on the right. The work has two levels.

- **Study.** The Part 1 site (HTML, CSS, JavaScript without a build, labs 1–8), Part 2 (labs 1–8, practicals 1–4, a course project) for the course "Internet technologies and web programming", variant 26 (even).
- **Diploma.** Defence in June 2027. Not started as code, only the scope document and the mockups exist ([`notes/18-scope-vs-state.en.md`](notes/18-scope-vs-state.en.md)).

Detailed state of every work: [`PROJECT-STATE.en.md`](PROJECT-STATE.en.md).

## 2 Owner's rules (mandatory)

1. Commits, documents and code carry no AI marks and no `Co-Authored-By` lines. Commits are made only as the owner.
2. Documents are written as for a person and from a person, short and to the point.
3. Every work lives in its own branch and is pushed separately. Merging into `main` only after the owner checks and says "yes".
4. Part 1 tests run with a 100% coverage threshold (lines, branches, functions). Reports in Russian and English are built from templates with `node tools/build.js <folder>` and must be rebuilt after every code change.
5. Ask before anything irreversible (rewriting history on the server, deleting branches, sending someone's data to Figma).

## 3 Quick start in five minutes

```bash
git clone https://github.com/KsushaKhadzhinova/DSLKit-Project
cd DSLKit-Project
git checkout work/part1-finish        # Part 1: the site and labs 1–8
npm install
npm test                              # 608 tests, 100% coverage
npm start                             # the site at http://localhost:5173
```

The Part 2 works live in their own branches (`lab21`, `lab12`, `23`, `24`, `25`, `26`, `27`, `28`, `pz21`, `pz22`, `pz23`, `pz24`, `course-project`), the table is in [`PROJECT-STATE.en.md`](PROJECT-STATE.en.md). Separate working folders are handy: `git worktree add ../dslkit-lab25 25`.

## 4 What the last session did (22–23 October)

**Part 1, the editor** (guide: [`study/34-EDITOR-FEATURES.en.md`](study/34-EDITOR-FEATURES.en.md)):

- autosave of the code after 1 second, "Saved 22:30", restore on open;
- export to SVG, PNG, JPEG, `.drawio` and a self-contained `.html`;
- import of Mermaid and PlantUML (flowcharts, sequence and state diagrams) from a file or the clipboard;
- a 5-step tour (once, then from the "Show tour" menu item);
- PWA: manifest, icons, service worker;
- dragging of blocks (mouse, finger, arrows): the place is written to the code as `pos=XxY`;
- six new notations (33 in all): mind map, org chart, C4, network, decision tree, eEPC.

**Part 2:** all 13 works were re-run one by one, 0 failures; PostgreSQL is the default in lab 2 and lab 3 (SQLite only for tests); the copies of labs 1–3 in branches 25, 26, 28 are updated; the branches are pushed.

**Course project:** the note is updated (PostgreSQL, test numbers 136 and 100, access dates, a hook fragment, demo data), defence cards and a five-sheet cheat sheet are ready (`course-project/defence-cards.md`, `cheat-sheet.md`).

**Brand:** the site logo and favicon are the "smiling block", the editor logo is the "cursor drags a block" (see [`design-contest/logos/README.md`](design-contest/logos/README.md)). On 24 October a pinwheel (indigo with amber) was tried, then the blue mark came back: commit `758ee55`. The loader is a blue ring again. The cat mascot stays on the error pages and in the empty project list (`site/images/mascot.svg`). PWA icons are rebuilt with `tools/make-icons.mjs`. Variants and surveys are in `design-contest/logos/` (`final-v2` … `final-v7`, `survey`, `test-round-*`); the plan for testing the mark on a metric is `AB-TEST-PLAN.md`.

**Figma:** all 432 mockups are in the file "DSLKit editor mockups" (the owner's drafts): [link](https://www.figma.com/design/75BRJFWfvp6VGatVKIqFoV/DSLKit-editor-mockups). The six new notations and the frames of the new features (`design-contest/editor-features`) are not in Figma.

## 5 What is left

### Only the owner

- Postman screenshots (labs 1–3, practical 2) and database structure screenshots from PostgreSQL; Atlas for lab 6; Docker Hub images for lab 8.
- A check in Firefox and Edge; installing the PWA in a real Chrome (the service worker cannot register in the app pane).
- React Router 7 in practical 3 is approved by the owner (settled, v7 stays). Questions to the teacher: an admin screen, the rest in [`study/33-QUESTIONS.en.md`](study/33-QUESTIONS.en.md).
- The course project in Word: title page, assignment, table of contents, 1–2 books and articles in the sources, final screenshots of the screens.
- Decisions on the course project: a fourth entity "Comment" (the assignment asks for 4–6, there are three), React Router in the client, an admin screen, cloud deployment.
- Merging the branches into `main` and cleaning the history of AI traces with a force push. Do not do it without her "yes".

### Can go on without her

- Rebuild the lab 3 reports in branches 25 and 28 (they still say "SQLite by default").
- A block properties panel; export of PlantUML and Mermaid code as a file; a Gantt chart and other kinds with their own drawing.
- Uploading the new notations and the feature frames to Figma (the way is in section 7).
- Own fonts: waiting for the owner's decision.
- After her agreement: the fourth entity and the routes in the course project.

### Diploma

First agree the topic and scope with the supervisor. Then: the new stack (React 19, TypeScript, Vite, Monaco, a C++ core in WASM), a real backend with login and plans, collaboration, Git, integrations, documents (SRS, ADR, licence, name check, usability test, CI).

## 6 Where things are

| What                                               | Where                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| The Part 1 site (RU at the root, EN in `site/en/`) | `site/`                                                                                       |
| The editor and its modules                         | `site/js/components/`, `site/js/utils/`, `site/js/notations/`                                 |
| Part 1 labs and tests                              | `labs/01-network` … `labs/08-frontend-testing`                                                |
| Part 2 works                                       | `part-2/<folder>/`, each in its own branch                                                    |
| The course project                                 | branch `course-project`, folder `course-project/`                                             |
| Mockups, logos, screenshot scripts                 | `docs/design-contest/`                                                                        |
| Defence guides                                     | `docs/study/` (index: [`study/README.md`](study/README.md))                                   |
| Notes, teacher requirements, plans                 | `docs/notes/`                                                                                 |
| State, log, context                                | `docs/PROJECT-STATE.en.md`, `docs/SESSION-LOG.md`, `docs/CONTEXT.md`, `docs/HANDOVER-LABS.md` |
| Assignments                                        | `materials/`                                                                                  |

## 7 Traps and tricks

- **Backslashes.** In shell commands and one of the editors `\u…`, `\d`, `\b` get lost or turn into characters. Create files with regular expressions using the file-writing tool, not a command.
- **Two test runs at once disturb each other** (shared ports and temporary databases). Run them one by one.
- **The editor tour** opens with an empty storage. Screenshot scripts must first write the key `dslkit.tour-done`.
- **Dragging** works only with the "Own engine (in the browser)" and for notations with the shared layout (BPMN, DAG and similar).
- **Logo galleries** must stay outside `site/`: the page checks of the site count every HTML page in that folder.
- **Figma.** Loading frames: open the file, press Ctrl+Shift+K (a file input appears), pass up to 10 MB of files at a time, click "Place all", wrap the selection in auto layout (Shift+A), set the "Grid" flow to 4 columns and gaps of 40. It needs the Claude in Chrome extension and the owner signed in to Figma.
- **The Kroki service** sometimes answers with errors. Mermaid mockups are re-shot with the command in `PROJECT-STATE.en.md`, section 7.
- **Docker Desktop** starts slowly. Port 5432 on this computer is taken by PostgreSQL from WSL, so Compose reads the database port from `POSTGRES_PORT` (the check ran on 55432).

## 8 Suggested order from here

1. Settle the four course project questions with the owner and close the remaining `TODO` in the note.
2. Rebuild the lab 3 reports in branches 25 and 28 if those branches are handed in.
3. After her check merge the branches into `main`, then (with a separate "yes") clean the history.
4. Optional: the properties panel, fonts, the Gantt chart, uploading the new frames to Figma.
5. Diploma: a meeting with the supervisor, then a plan and the first branches.
