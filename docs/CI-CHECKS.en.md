# Quality checks and CI

Russian version: [`CI-CHECKS.md`](CI-CHECKS.md).

Branching: GitHub Flow and trunk-based. `main` is always green, every change is a short-lived branch from `origin/main` through a pull request.

## What is checked on every push and pull request

| Check                             | Where                                      | What breaks the build                                                                                                                                                   |
| --------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint (`npm run lint`)           | job `test`                                 | undefined and unused names, `var`, loose equality, empty blocks, regular expression mistakes                                                                            |
| Prettier (`npm run format:check`) | job `test`                                 | any difference from the format                                                                                                                                          |
| Site tests (`npm test`)           | job `test`                                 | a failing test or coverage below 100% of lines, branches and functions; the coverage explicitly includes every file of `site/js` and `tools`, also those no test loaded |
| `npm audit --omit=dev`            | job `test`                                 | a high vulnerability in the libraries that reach the user                                                                                                               |
| Work folders (`part-2/*`)         | job `work-folders`, 12 folders in parallel | the tests of every lab and practical, the reports, `npm audit`                                                                                                          |
| Site build                        | job `build`                                | a build error                                                                                                                                                           |
| React app                         | job `react`                                | tests and build                                                                                                                                                         |
| Browser e2e (Playwright)          | job `e2e`                                  | any scenario not Passed, or a dirty tree after the run                                                                                                                  |
| CodeQL (`security-and-quality`)   | `security.yml`, also weekly                | static security findings                                                                                                                                                |
| Dependency review                 | `security.yml`, pull requests only         | a new dependency with a high vulnerability                                                                                                                              |

Repository guard (`guard.yml`, `npm run guard`): forbidden files (`.env`, personal files, `node_modules`, keys), strings that look like secrets (API keys, connection strings with a password), files over 5 MB (except the lab 1 captures) and tool or AI attribution in commit messages. It also checks that every workflow sets `permissions` and has no `curl | sh`. Locally the pre-push hook does the same (`npm run hooks:install`).

Auto-merge (`auto-merge.yml`): when the CI run of a work branch is green, the workflow opens a pull request and turns on auto-merge (squash); GitHub merges it into `main` only when all required checks of the branch protection ruleset pass. `wip/*` and `dependabot/*` branches are skipped.

## Extra quality gates (`quality.yml`)

Separate workflow, runs on every push and pull request.

| Check                       | Job                                                        | What breaks the build                                                                                                                                                                                                | Locally                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint of every work folder | `lint-work-folders`, 12 folders                            | any ESLint error in `part-2/<folder>` (config per folder; React folders use the recommended rules, the React plugin is not a dependency)                                                                             | `cd part-2/<folder> && npm run lint`                                                                                                                       |
| Coverage thresholds         | `npm test` of each folder (job `work-folders` of `ci.yml`) | coverage below the measured level, set in the `test` script (Node) or `vite.config.js` (Vitest)                                                                                                                      | `cd part-2/<folder> && npm test`                                                                                                                           |
| Types of `site/js`          | `typecheck`                                                | an error of `tsc --checkJs` (`tsconfig.check.json`, lenient: `strict` and `noImplicitAny` off)                                                                                                                       | `npm run typecheck` (also in `npm run verify`)                                                                                                             |
| Workflows                   | `actionlint`                                               | any actionlint finding in `.github/workflows`                                                                                                                                                                        | download actionlint, run `actionlint`                                                                                                                      |
| Accessibility               | `accessibility`                                            | axe-core serious or critical violation on index, editor, dashboard, sign-in, light and dark theme; Lighthouse CI below accessibility 0.95, best practices 0.9, performance 0.8 (desktop preset, `lighthouserc.json`) | `python testing-course/full/axe-e2e.py` with the site on :5173; `npm run build`, serve `dist` on :5174, `npx @lhci/cli autorun --config=lighthouserc.json` |
| Size budget                 | `size-budget`                                              | `dist` more than 15% over `size-budget.json` (total, gzip, JS, CSS bytes)                                                                                                                                            | `npm run build && node ci/size-budget.mjs dist`; `--update` rewrites the budget                                                                            |
| Flaky tests                 | `flaky`                                                    | `npm test` run twice (the second with the test files in shuffled order) gives different results                                                                                                                      | `node ci/flaky.mjs`                                                                                                                                        |
| Markdown links              | `markdown-links`                                           | a broken relative link or anchor in `docs/**/*.md` or a README (no external network)                                                                                                                                 | `node ci/check-links.mjs`                                                                                                                                  |

Typed-checking debt: files that fail on checker inference noise start with `// @ts-nocheck -- type-check debt`. Remove the line when the file passes `npm run typecheck`; new files are checked from the first line.

Everything locally at once: `npm run verify` (lint, format, tests).

## What is not checked automatically

Live Atlas and Gemini (secrets are needed), real Postman, Docker Desktop and devices. They stay manual and are listed in `docs/STATUS-CHECKLIST.md`.
