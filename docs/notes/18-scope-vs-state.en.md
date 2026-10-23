# Project scope and how much of it is done (as of 23 October 2026)

Source of the scope: the summary document [`../project/PROJECT-OVERVIEW.md`](../project/PROJECT-OVERVIEW.md) (requirements, the owner's rules, the "What is left" list) and [`../project/TODO.md`](../project/TODO.md). Russian version: [`18-scope-vs-state.md`](18-scope-vs-state.md).

An important line between two goals:
- **The course goal (done)**: 16 labs, 4 practicals and a course project for ITiVP, all on the DSLKit theme. The site in `site/` is HTML, CSS and JavaScript without a build, and the editor lives in it.
- **The diploma goal (not started as code)**: the scope names React 19, TypeScript, Vite, Monaco, a C++ core in WASM, a backend, login through Google, GitHub and others, plans, collaboration, Git and integrations. The diploma defence is planned for June 2027. This code has not been written yet: mockups and requirements are ready, the monorepo implementation is still ahead.

Marks: done, partly, not started, the owner's decision.

## 1 Product

| Requirement in the scope | State |
| --- | --- |
| A web editor of "diagrams as code" with the diagram right beside the text | done as a prototype: DSL text, 27 notations, four rendering engines |
| IDEF0, ERD, BPMN, Petri nets, UML, DFD | done: all of them plus IDEF1, IDEF1X, IDEF3, IDEF4, IDEF5, graph, DAG and others, 27 in all |
| One DSL syntax (one grammar instead of three earlier ones) | partly: one parser in `site/js/notations/`, a shared header and checks, the grammar is not written down as a document |
| The stack React 19, TypeScript, Vite, Monaco, elkjs, C++ in WASM | not started (the site uses HTML and JS, an own layout instead of elkjs, a JS parser) |
| A "My projects" dashboard, a welcome screen, settings | done as prototype screens (`site/app/*.html`) |
| Editor: tabs, templates, problems, a status bar, breadcrumbs | done as a prototype |
| Canvas: zoom, fit, dragging with `pos` written into the code, a properties inspector | partly: zoom and fit exist, dragging and the inspector are not done |
| Run, autosave, undo and redo | partly: Run, Undo, Redo and Save exist, an autosave indicator is shown, the one-second autosave mechanism itself was not checked |
| Export to SVG, PNG, PlantUML, Mermaid, draw.io and others | not started as an export feature (the PlantUML and Mermaid generators exist as rendering engines) |
| Import of PlantUML and Mermaid | not started |
| An AI panel, "Fix with AI" | not started (a button is in the mockups) |
| Login (email, guest, external providers), limits and plans | partly: a daily beta limit is shown in the interface, there is no real login in the prototype (login is implemented in the Part 2 course works) |
| Collaboration, Git, versions | not started |
| PWA and offline | partly: an offline diagram cache exists, there is no manifest or service worker |
| Responsive layout and a mobile version | done as layout (three widths, a bottom navigation) |
| A five-step onboarding tour | not started |
| Loading code or a repository and drawing automatically, Image → DSL | not started |
| A public API, SDK, plugins | not started |

## 2 Design

| Requirement | State |
| --- | --- |
| The light theme first, the dark one second | done |
| The golden ratio in tokens, 60-30-10, `rem` | done (tokens in `site/css/variables.css`) |
| Minimalism, little rounding, air | done |
| Do not copy draw.io and VS Code directly, own fonts | partly: own styles exist, own fonts are not created (Inter and JetBrains Mono are used) |
| Minimal icons, Tabler outline | done |
| Mockups in Figma as native objects | partly: mockups and SVG are ready in the repository, uploading them to the file `bsuir-diploma` waits for the owner's sign-in |
| Mockups of all notations and engines, RU and EN | done: 432 frames, the Mermaid frames were re-shot on 23 October |
| WCAG accessibility: `aria-label`, focus, target sizes | partly: labels on icons and the Tab order exist, a full keyboard audit of the canvas is not done |

## 3 The owner's rules

| Rule | State |
| --- | --- |
| No mentions of AI or co-authors in commits, code, documents | done: the history is cleaned, documents rewritten, service branches deleted; in the already published `main` the old records remain in its history |
| Clean code and architecture, minimal point changes | done for the course works: architecture paragraphs in the reports of labs 1–3, refactoring round 2; further as needed |
| An independent check of every stage | done as consilia and audits (`../reviews/`, `../study/02-SECURITY-AUDIT.md`) |
| Sources for all parts of the product | partly: a list for the course works exists, a structured document by diploma sections is not assembled |
| Documents and copyright for going to market | not started (a licence and a privacy policy exist as a site page, SRS, ADR and name and domain checks do not) |
| Any action on GitHub and Figma only with permission | kept |

## 4 Course works (ITiVP)

| Work | State |
| --- | --- |
| Part 1, labs 1–8 | done, 526 tests, 100% coverage |
| Part 2, labs 1–8, practicals 1–4 | done, each with reports in RU and EN, negative tests and a guide |
| Course project | the note and diagrams are ready, the title page, assignment, cloud deployment, current screenshots and agreeing the topic remain |

Detailed state: [`../PROJECT-STATE.md`](../PROJECT-STATE.md).

## 5 The "What is left" list from the scope document, item by item

- Merge the branch `docs/overview-and-ab-tests`: its content was moved to `docs/project`, the branch can be deleted on GitHub (the owner's decision).
- Go through the 100 A/B tests yourself: results are in `../project/ab-results/`, part of the answers were given by the owner, the contradictions (section 9 of the document) stay open and are listed in the questions to the owner.
- Mobile and tablet mockups: done as layout and Part 2 screens, separate tablet mockups are not uploaded to Figma.
- Empty state with templates, autocomplete, two-way highlighting code ↔ canvas, an IDEF0 hint: partly (templates and hints exist, autocomplete and two-way highlighting do not).
- Own fonts, the final palette, radii: wait for the owner's decision.
- Building the diploma from scratch (monorepo, the C++ and WASM core, backend, login, plans, Git, collaboration, integrations): not started.
- Law and quality (SRS, ADR, licence, user agreement, name check, a usability test with 3–5 people, CI): not started.
