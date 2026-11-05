# Report: checking the project with Accelerator

Date: 5 November 2026. Branch: `testing-course-full`. Russian version: [`accelerator-check-2026-11-05.md`](accelerator-check-2026-11-05.md).

## 1 Summary

- Accelerator is fully installed: catalog `v1.4.1`, 18 project skills and 4 personal ones. Nothing in the catalog that fits a web project is left out.
- The skills are adapted to DSLKit: a "Project context" section (commands, paths, the owner's rules) was added to 18 project `SKILL.md` files.
- Checking through the skills found three groups of problems: a red format check, lab reports that lag behind the code, and failing site tests caused by work that is under way in `site/`.
- The changes are committed on `testing-course-full` (not pushed): skill adaptation, ignore rules, formatting, the `package-lock.json` fix.

## 2 What was done

| Step                              | Result                                                                               | How it was checked                     |
| --------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------- |
| Install Accelerator               | Already there (v1.4.1, command 0.18.0)                                               | Profile and registry read              |
| Project scan                      | javascript, npm, a single project, GitHub Actions, agent claude-code                 | `accelerator scan` was run             |
| Adapt the skills                  | 18 files in `.claude/skills/` extended, no lines removed, one marker pair each       | Diff, marker count, `prettier --check` |
| Fix the Docker blocks             | Three blocks rewritten: Docker lives on other branches (`course-app`, `lab12`, `25`) | `git ls-tree` per branch               |
| Section in `docs/ACCELERATOR*.md` | Section 7 added about the adaptation and what it means for the installer             | Read, `prettier --check`               |
| Lab 2 report                      | Rebuilt with `node tools/build.js labs/02-environment`; lab 2 tests: 17 of 17        | Command and tests were run             |

## 3 What the check found

### 3.1 Scanner and profile

- The scanner sees Docker because of the `.claude/worktrees/` folder, which holds other branches. This branch has no Dockerfile.
- The scanner does not see React in `react-app/` because the folder is nested. The catalog has no React skills, so the selection does not change.
- The scanner reports the test runner as `null`, although `node:test` is used. The profile can be corrected by hand.

### 3.2 Tests (`npm test`)

Two runs in one session:

| Run                     | Tests | Passed | Failed | Coverage (lines / branches / functions) |
| ----------------------- | ----- | ------ | ------ | --------------------------------------- |
| First, before rebuild   | 969   | 967    | 2      | 100 / 100 / 100                         |
| Last, after the rebuild | 982   | 976    | 6      | 98.94 / 99.80 / 98.60                   |

- The two failures of the first run (lab 2 reports not rebuilt for the server code) are gone after the rebuild.
- The last run fails these tests: the list of site pages, the stylesheet imports in `style.css`, "every class used has a CSS rule", the lab 5 reports (RU and EN), "the dashboard, the settings and the editor start their own components".
- Between the runs the number of tests grew and `site/` got new files (`site/app/decision.html`, `site/app/expert.html`, `site/js/automation/`, `site/js/decision/`, `site/js/expert/`). The failures and the lower coverage most likely belong to this unfinished work. I did not diagnose the causes.
- In this state the 100% coverage gate is not met, so CI would be red.

### 3.3 Format (`npm run format:check`)

- Red on 459 files. 274 of them are committed and would fail without our edits (mostly `docs/` and `testing-course/`); the other 185 are not tracked yet (`part-2/`, `paper-its/`, `workspace/` and others).
- The files we changed (18 skills and the two ACCELERATOR documents) pass the check.
- In CI this step comes before the tests, so the branch will not pass CI until the format is fixed or the folders are listed in `.prettierignore`.

### 3.4 Review of the uncommitted changes

- Dozens of files in `site/`, `tools/` and `labs/` are changed; there are new files (`tools/ai-api.js`, `.env.example`, `decision` and `expert-engine` tests).
- The application pages changed in RU and EN pairs, which is right.
- Must not be committed: `.claude/admin-test-account.txt`, `.playwright-mcp/`. The script `.claude/cleanup-e-drive.ps1` deserves a look.
- `.env.example` needs a check that it holds no real secrets (I did not open it).
- `package-lock.json` has +486 lines for one line in `package.json`. Confirm that it is an expected dependency.
- Git warns about CRLF in `tools/server.js` and in the lab 2 reports, while `.gitattributes` requires LF.
- The lab 5 report (`report.md`, `report.en.md`) does not match its template. Rebuild it when the site work is finished: `node tools/build.js labs/05-javascript-interactivity`.

## 4 Not verified

- The commands in the "Project context" blocks were read from configuration. Only `npm test`, `npm run format:check`, `accelerator scan` and the lab 2 report build were run.
- End-to-end tests (`npm run tc:full`), the build (`npm run build`) and `npm audit` were not run.
- The failing site tests (section 3.2) are not diagnosed.
- The `react-app/` tests (`npm run react:test`) were not run.

## 5 Next steps

1. Wait until the work in `site/` is finished and run `npm test` again. If it is still red, diagnose it with the `ERROR-DIAGNOSIS` skill.
2. Rebuild the lab 5 report and repeat `npm test` to bring coverage back to 100%.
3. Fix the format: run `npm run format` or list the folders that must not be formatted in `.prettierignore`.
4. Keep the files from section 3.4 out of the commit.
5. When updating skills from the catalog, remember that `accelerator update -Force` and a repeated `accelerator install` erase the "Project context" section and the adaptation has to be run again.

## 6 Re-check after the fixes

The same commands as in the first check, run after the edits. All of them were executed.

| Check                                     | Before                  | After                              |
| ----------------------------------------- | ----------------------- | ---------------------------------- |
| `npm test`                                | 976 of 982, 6 failed    | 1026 of 1026, none failed          |
| Coverage (lines, branches, functions)     | 98.94 / 99.80 / 98.60   | 100 / 100 / 100                    |
| `npm run format:check`                    | 459 files fail          | passes                             |
| `npm run build`                           | not run                 | built (`dist/js/script.js` 781 KB) |
| `npm audit --omit=dev --audit-level=high` | not run                 | 0 vulnerabilities                  |
| `npm run react:test`                      | not run                 | 7 suites, 55 tests, all passed     |
| `accelerator scan`                        | javascript, npm, docker | same result                        |
| "Project context" section                 | 18 skills               | 18 skills, one marker pair each    |

What changed and why:

- The site test failures went away with the site work: a parallel session committed it (`3cf2132`, `d314923`) and fixed the expectation in `labs/05-javascript-interactivity/script.test.js`. I did not change the site code.
- Format: `DSLKit-Project/`, `.playwright-mcp/`, `.accelerator/`, `paper-its/` and the JSON data in `docs/` and `testing-course/` were added to `.prettierignore`, then `prettier --write .` was run for the remaining files (mostly `docs/` and `testing-course/`).
- `.gitignore` now lists `.playwright-mcp/`, `.claude/admin-test-account.txt`, `.accelerator/profile.user.json` and `.accelerator/registry.user.json`.
- Checked before the commit: `.env.example` holds only empty keys (no secrets); the growth of `package-lock.json` is the esbuild 0.28.2 platform packages; `tools/server.js` already has LF line endings.

What is left:

- End-to-end tests `npm run tc:full` were not run (they need Python and a browser).
- `.claude/cleanup-e-drive.ps1` is not part of the project: it deletes folders on drive E: (up to 100 GB). Do not commit it; run it only by hand after reading it.
- The nested folder `DSLKit-Project/` holds an untracked copy of the project (141 files). Decide whether it is needed.
- Prettier reformatted some JSON data files of the checks in `docs/` (the diff grew by tens of thousands of lines). They can be restored with `git checkout -- <file>`; the formatting does not affect anything.

## 7 Commits and a check of the committed state

Commits (branch `testing-course-full`, not pushed): skill adaptation and the report, the `.gitignore` and `.prettierignore` rules, formatting of `docs/` and `testing-course/` (226 files), the `package-lock.json` fix.

Check on a copy of HEAD exported with `git archive`: `prettier --check` passes, `npm test` 1026 of 1026 with 100% coverage, `node testing-course/full/static-sec-perf.js` 41 of 41, `npm ci --dry-run` passes.

Found during this check: the committed `package.json` listed `esbuild` but `package-lock.json` did not, so `npm ci` would have failed in CI. Fixed in a separate commit.

Not committed: other work in `docs/testing-kulikov/`, the reformatted JSON data of the checks, the untracked `DSLKit-Project/`, `paper-its/`, `part-2/`, `workspace/` and `.claude/cleanup-e-drive.ps1`. The end-to-end tests on Python and Edge were not run.
