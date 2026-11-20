# Quality checks and CI

Russian version: [`CI-CHECKS.md`](CI-CHECKS.md).

Branching: GitHub Flow and trunk-based. `main` is always green, every change is a short-lived branch from `origin/main` through a pull request.

## What is checked on every push and pull request

| Check                             | Where                                              | What breaks the build                                                                                                                                                   |
| --------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint (`npm run lint`)           | job `test`                                         | undefined and unused names, `var`, loose equality, empty blocks, regular expression mistakes                                                                            |
| Prettier (`npm run format:check`) | job `test`                                         | any difference from the format                                                                                                                                          |
| Site tests (`npm test`)           | job `test`                                         | a failing test or coverage below 100% of lines, branches and functions; the coverage explicitly includes every file of `site/js` and `tools`, also those no test loaded |
| `npm audit --omit=dev`            | job `test`                                         | a high vulnerability in the libraries that reach the user                                                                                                               |
| Work folders (`part-2/*`)         | job `work-folders`, 12 folders in parallel         | the tests of every lab and practical, the reports, `npm audit`                                                                                                          |
| Site build                        | job `build`                                        | a build error                                                                                                                                                           |
| React app                         | job `react`                                        | tests and build                                                                                                                                                         |
| Browser e2e (Playwright)          | job `e2e`, two copies: chromium and firefox        | any scenario not Passed, or a dirty tree after the run                                                                                                                  |
| CodeQL (`security-and-quality`)   | `security.yml`, also weekly                        | static security findings                                                                                                                                                |
| Dependency review                 | `security.yml`, pull requests only                 | a new dependency with a high vulnerability                                                                                                                              |
| Secrets (gitleaks)                | `secrets.yml`, push to main, pull requests, weekly | a key or token in any commit of the whole history (`fetch-depth: 0`)                                                                                                    |
| Mutation tests (Stryker)          | `mutation.yml`, weekly and by hand only            | not a required check: counts how many mutations the tests catch in `site/js/auth` and `site/js/utils`                                                                   |

Repository guard (`guard.yml`, `npm run guard`): forbidden files (`.env`, personal files, `node_modules`, keys), strings that look like secrets (API keys, connection strings with a password), files over 5 MB (except the lab 1 captures) and tool or AI attribution in commit messages. It also checks that every workflow sets `permissions` and has no `curl | sh`. Locally the pre-push hook does the same (`npm run hooks:install`).

Auto-merge (`auto-merge.yml`): when the CI run of a work branch is green, the workflow opens a pull request and turns on auto-merge (squash); GitHub merges it into `main` only when all required checks of the branch protection ruleset pass. `wip/*` and `dependabot/*` branches are skipped.

Everything locally at once: `npm run verify` (lint, format, tests).

## New checks

- **e2e in two browsers.** The check names in GitHub are `Browser end-to-end checks (Playwright, chromium)` and `Browser end-to-end checks (Playwright, firefox)`. The old name without the brackets is no longer produced: in the required checks of `main` replace it with these two. Firefox locally: `E2E_BROWSER=firefox python testing-course/full/editor-e2e.py http://localhost:5173`. Playwright Firefox has no clipboard permissions, so `e2e_env.py` gives the pages an in-memory clipboard with the same `writeText` and `readText`. Open: `auth-e2e.py` does not finish in Firefox (pages stop loading after a service worker error), so it runs in chromium only for now.
- **Secrets.** The check is named `Secrets scan of the whole history (gitleaks)`. The default gitleaks rules plus `.gitleaks.toml`: the allowlist has two test values checked by hand (a made-up key in `part-2/lab-03-auth/tests/twofactor.test.js` and the shared secret of RFC 6238 in `labs/05-javascript-interactivity/auth-modules.test.js`). Anything else is a finding. Locally: `gitleaks git . --config .gitleaks.toml --redact`.
- **Mutation tests.** `npm run mutation` (Stryker, `stryker.config.json`) changes the sources one mutation at a time and runs the chosen `node --test` files; a surviving mutation means a weak test. The HTML report is in the artifact `mutation-report` and locally in `reports/mutation/`. The `break` threshold 65 is set in `stryker.config.json`; the measured score is 69.2% (50 minutes locally; format-code, node-position and lang are hardly covered by the chosen tests). It is not part of `npm test` or `npm run verify` and never runs on push.

## What is not checked automatically

Live Atlas and Gemini (secrets are needed), real Postman, Docker Desktop and devices. They stay manual and are listed in `docs/STATUS-CHECKLIST.md`.
