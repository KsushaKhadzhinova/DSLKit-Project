# DSLKit: instructions for an AI agent / инструкции для ИИ-агента

Read first / прочитайте сначала:

1. `docs/PROJECT-STATE.md` (EN: `docs/PROJECT-STATE.en.md`): goal, owner rules, branch map, commands, decisions, plan.
2. `docs/ACCELERATOR.md` (EN: `docs/ACCELERATOR.en.md`): which Accelerator skills are installed in `.claude/skills/`, why, and how to reproduce.
3. `docs/HANDOVER.md` and the latest `docs/HANDOVER-SESSION-*.md`: what was done last and what is open.

Owner rules (short version, full text in section 2 of `docs/PROJECT-STATE.md`):

- Commits only as the owner, messages in English, no tool or AI attributions anywhere (no `Co-Authored-By`, no generated-with lines).
- Nothing is merged into `main` without the owner's decision. Publish work on its own branch, open a pull request.
- Secrets only in `.env` on the owner's machine, never in the chat or the repository.
- Reports and READMEs in Markdown, Russian and English versions at the same time.
- Do not commit `.claude/admin-test-account.txt`, `.claude/worktrees/`, `.playwright-mcp/`, or `.accelerator/profile.user.json`.
- Use the installed skills in `.claude/skills/` when the task matches (plan, review, debugging, verification before reporting done).
