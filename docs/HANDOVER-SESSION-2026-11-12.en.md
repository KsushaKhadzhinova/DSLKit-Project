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
2. `testing-course/full/scenarios-e2e.py`: the script is not part of `tc:full` and has fallen behind the app: the 7 November record shows 2 failures of 14 (S1, S13), a 12 November run on a fresh site shows 7 of 14 (S1, S3, S7, S8, S11, S13, S14) with different causes (palette, the projects panel `[data-section=shared]`, a sign-in page before the editor in S11). These look like stale selectors and scenarios rather than certain app bugs; go through one scenario at a time. The S13 error step is already made robust (it clicks the link of the right error), but the scenario still fails later. `npm test` on this branch on 12 November: 1026 of 1026.
3. Seeds for labs 2, 3 and 6 (chosen by the owner, not done).
4. `render.yaml` and the `course-app` deploy (waits for the owner to say so).
5. Red GitHub checks on branches 25, 28, pz21 and `testing-course-full`: needs the error text from the Actions tab or `gh auth login`.
6. The `part-2/` directory in the working tree is untracked (only `lab-02-sequelize/package-lock.json` and the ignored `pz-02-rest-api`): do not commit it to this branch; Part 2 works live in their own branches.

## Open for the owner

Unchanged from section 3 of the 28 October file: fill `.env` (labs 2, 3, 6), Postman screenshots, Atlas, Docker Hub (only after an explicit go-ahead), upload the PDFs, the decision on merging into `main`, pushes only on an explicit request.
