# Handover: state on 12 November 2026

Russian version: [`HANDOVER-SESSION-2026-11-12.md`](HANDOVER-SESSION-2026-11-12.md). Read together with [`HANDOVER-SESSION-2026-10-28.md`](HANDOVER-SESSION-2026-10-28.md) (Russian): it holds the rules, the branch map and the owner's list. This file only covers what changed after 28 October.

## Done since 28 October (branch `testing-course-full`)

- 30 October: daily limit of five diagrams, toasts, Share with a link, save versions, print styles, Russian element names, touch and accessibility fixes (44 px targets).
- 4 November: Accelerator skills installed (`docs/ACCELERATOR.en.md`).
- 5 November: automatic diagram building through the Claude API with a rules fallback, an expert system, a decision support system; hardening (sign-out in another tab, a deleted template is not revived); end-to-end checks brought up to date (`testing-course/full/`), full `tc:full` run.
- 6 November: fluid heading sizes (`step-1`…`step-6`), lab 4 report rebuilt.
- 7 November: UI, navigation, sequence and cross-browser runs with device screenshots.
- 12 November: stale guides fixed (labs 2 and 3 run on PostgreSQL, not SQLite; ports 3001/5433 and 3000/5434).

## Open for the agent

1. Confirm `npm test` and `npm run format:check` are green on this branch (a run was started on 12 November; the result is in the session message).
2. `testing-course/full/scenarios-e2e.py`: fixed on 12 November, 14 of 14 scenarios pass. The script had fallen behind the app (sign-in is required, the palette is in the "Element" menu, starter projects), it now signs in with a test account. A real defect was found and fixed: after pressing a block on the board Delete did nothing because the focus stayed in the code field (`editor-palette.js`, test added, coverage still 100%). The script is still not part of `tc:full`.
3. `click-everything.py` (12 November): 17 of 496 elements show no reaction; the real placeholders without a handler are on `settings.html` the buttons "Canvas", "Keyboard shortcuts", "AI and integrations", "Account and plan" (no sections with such ids, only `#editor-settings` and `#theme` exist) and on `welcome.html` the buttons "Import PlantUML / Mermaid" and "Tour · 5 steps" (the tour only runs on the editor page). "Import from a file" in the editor opens a file chooser and the radio "light" is already checked: the detector counts them as dead, they are not defects. Decision: remove the placeholders or make them work.
4. Seeds for labs 2, 3 and 6 (chosen by the owner, not done).
5. `render.yaml` and the `course-app` deploy (waits for the owner to say so).
6. Red GitHub checks on branches 25, 28, pz21 and `testing-course-full`: needs the error text from the Actions tab or `gh auth login`.
7. The `part-2/` directory in the working tree is untracked (only `lab-02-sequelize/package-lock.json` and the ignored `pz-02-rest-api`): do not commit it to this branch; Part 2 works live in their own branches.

## Open for the owner

Unchanged from section 3 of the 28 October file: fill `.env` (labs 2, 3, 6), Postman screenshots, Atlas, Docker Hub (only after an explicit go-ahead), upload the PDFs, the decision on merging into `main`, pushes only on an explicit request.

## State on 14 November 2026

- The `main` branch on GitHub holds everything: part 1, the site and editor with the new features (import of files and pictures, check and fix of a diagram, clarifying questions, multilingual support), labs 1-8, practicals 1-4 and the course project (`course-project/`, `render.yaml`). CI and the GitHub Pages deploy are green: https://ksushakhadzhinova.github.io/DSLKit-Project/.
- The branches of the works stay separate; their copies inside `main` were combined like this: own files come from the branch of the work, lab 3 comes from branch `23` with CORS and search from branch `25`.
- Part 2 has its own report linter `tools/part2/lint-report.js` (appendices "Приложение А (обязательное)"), part 1 keeps `tools/lint-report.js`.
- Lab 8: the backend image installs `sequelize-cli` itself (it is a dev dependency of lab 3). `npm run smoke` passed on 14 November: three containers healthy, `/api/health` answers 200. With an old volume and another password use another `COMPOSE_PROJECT_NAME` or `docker compose down -v`.
- Open for the owner: Postman and database screenshots, the Atlas string in the `.env` of lab 6, a Render service from `render.yaml`, Docker Hub images, the course project in Word, the Anthropic API key in `.env`, the Firefox and Edge confirmation for labs 5-8, the thesis.
