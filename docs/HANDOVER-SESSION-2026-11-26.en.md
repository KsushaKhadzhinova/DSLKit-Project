# Handover, 26.11.2026

Russian version: [`HANDOVER-SESSION-2026-11-26.md`](HANDOVER-SESSION-2026-11-26.md). Read `CLAUDE.md`, `docs/PROJECT-STATE.en.md`, `docs/BRANCHES.en.md`, `docs/CI-CHECKS.en.md` and `docs/STATUS-CHECKLIST.en.md` first.

## Owner rules (short)

- Commits only as the owner, in English, with no tool or AI attribution (the repository guard checks it).
- GitHub Flow and trunk-based: a short branch from the latest `origin/main`, a green CI run on the branch, auto-merge (squash), and the branch is deleted. Do not push to `main` directly unless the owner asks.
- Secrets only in `.env` on the owner's machine. Reports and READMEs in Russian and English together.
- Agents: different cost by importance and difficulty (simple: haiku, ordinary: sonnet, hard or risky: opus or the main agent itself). On "стоп" stop all of them. At 40% of the context stop and write a handover.
- Never run two `npm test` at once; keep to one browser and one heavy agent at a time (the machine gets overloaded).

## What is done

- `main` is protected by the ruleset `main protection` (17 required checks, no deletion, no force push, bypass for the admin role). All new checks are green on GitHub: CI, Guard, Quality, Security (CodeQL), Secrets (gitleaks), Deploy site.
- Auto-merge works end to end. A merge made by the bot does not start the workflows of `main`, so `auto-merge.yml` starts CI, Quality and the deploy itself after the merge.
- Merged: advanced authentication of the site and lab 3, the audits (RT, UX, UI), real importer and AI checks, screen rotation, Firefox in e2e, memory leak checks, practical 3 on React Router v7.
- The repository is tidy: 90 branches deleted (list with SHAs in `docs/BRANCHES.en.md`), Dependabot pull requests closed, local agent worktrees removed.
- On drive E: removed the nested old clone `E:\DSLKit-Project\DSLKit-Project`, `E:\DSLKit-part-2-old-copy`, `E:\tmp-dslkit`, `E:\tmp-lab6`, `E:\tmp_audit*`, `E:\tmp_t4.out`; `paper-its` moved to `E:\Статьи\paper-its`.

## What is open

1. Drive E:, to finish: old versions of the project, each with its own GitHub repository: `E:\VisualDSL-Platform`, `E:\VisualDSL_Project`, `E:\visual-dsl-modeler`, `E:\visualdsl-modeling-service` (and `.worktrees`), `E:\NotaCode`, `E:\VisualDSL_Tools`, `E:\VisualDSL_Env`. The owner asked to delete "old folders with old versions of the project". Before deleting, check each for unpushed commits, uncommitted changes and stashes. That check was started and not finished; if it is unclear what counts as an old version, ask the owner.
2. `E:\integration-all`: the worktree of branch `integration/all`; remove it with `git worktree remove`, keep the branch unless the owner decides otherwise.
3. Features in order (the owner said to start after the cleanup): full localisation in English and Russian across the project and "add AI" (ask the owner what the AI part includes), an editor server with accounts and roles in a database, the block properties panel, PlantUML and Mermaid export, a Gantt chart, custom fonts.
4. Status review: compare `docs/STATUS-CHECKLIST.en.md` and `C:\Users\zheny\dslkit-dashboard\tasks.json` with reality. Not done: the screenshots of Postman, DevTools, React DevTools, Docker and the DB structure; a Firefox and Edge rerun for part 1; audit findings beyond the ones already fixed; coverage thresholds for 10 `part-2` folders.
5. Check debt: 50 files with `// @ts-nocheck`, Firefox is not a required check yet, branches not fully merged: `design/*`, `docs/*`, `feature/*`, `feat/lab3-advanced-auth`, `lab12-hardening` (the owner decides).
6. For the owner: the course project in Word, the questions to the teacher, the course administrator on Render, the thesis topic.

## How to continue

Start with `git fetch` and `git status`, read this file and open the dashboard (`dashboard` in a terminal). Then items 1 and 2, then 4, then the features of item 3, each in its own branch and with tests.
