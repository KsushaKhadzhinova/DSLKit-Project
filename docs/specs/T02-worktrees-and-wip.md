# T02 Рабочие деревья и перенос wip / Worktrees and wip transfer

Агент: haiku. Ветка: `chore/worktree-cleanup` (если нужны правки документов).

## RU

**Цель.** Убрать лишние рабочие деревья и подготовить ветку для T03.

**Шаги.**

1. `git worktree list`; убрать `E:\integration-all` командой `git worktree remove` (ветку `integration/all` не удалять без решения владельца).
2. Убрать `E:\DSLKit-Project\.claude\worktrees\feat-props-export` после проверки, что в нём нет несохранённого.
3. Создать `feat/properties-panel-and-export` от свежего `origin/main`, перенести коммит `1c97b807` из `wip/properties-panel-and-export` (cherry-pick), решить конфликты, запушить.
4. Записать результат в `docs/BRANCHES.md` (RU и EN).

**Критерии готовности.** `git worktree list` без лишнего; ветка `feat/…` содержит 11 файлов wip и собирается; `wip/…` не удалена до слияния T03.

## EN

**Goal.** Remove stray worktrees and prepare the branch for T03.

**Steps.** (1) Remove `E:\integration-all` via `git worktree remove`; keep branch `integration/all`. (2) Remove the stopped agent's worktree after checking for unsaved work. (3) Create `feat/properties-panel-and-export` from fresh `origin/main`, cherry-pick `1c97b807`, resolve conflicts, push. (4) Update `docs/BRANCHES.md` in RU and EN.

**Done.** Clean worktree list; the new branch holds the 11 wip files and builds; `wip/…` kept until T03 merges.
