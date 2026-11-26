# T01 Чистка диска E: / Disk E: cleanup

Агент: haiku/sonnet, осторожно. Ветка: не нужна (операции вне репозитория), отчёт в `docs/` через `chore/disk-cleanup-report`.

## RU

**Цель.** Удалить старые версии проекта на диске E:, не потеряв ни одного неотправленного коммита.

**Объекты.** `E:\VisualDSL-Platform`, `E:\VisualDSL_Project`, `E:\visual-dsl-modeler`, `E:\visualdsl-modeling-service` (и `.worktrees`), `E:\NotaCode`, `E:\VisualDSL_Tools`, `E:\VisualDSL_Env`.

**Шаги.**

1. Для каждой папки: `git status`, `git stash list`, `git log @{u}..` по всем веткам, `git remote -v`, размер.
2. Таблица: папка, remote, неотправленные коммиты, несохранённые изменения, stash, размер, вердикт (удалить / спросить).
3. Если есть что терять: показать владельцу, спросить. Если сомнение, что считать старой версией, спросить.
4. Удалять только после «да» владельца по таблице. Предпочесть корзину, если возможно.
5. Отчёт RU и EN в `docs/notes/` со списком удалённого.

**Критерии готовности.** Таблица проверки есть; удалены только подтверждённые папки; отчёт закоммичен через PR; ничего за пределами списка не тронуто.

**Вне задачи.** Репозиторий `E:\DSLKit-Project`, ветки GitHub.

## EN

**Goal.** Delete old project versions on drive E: without losing any unpushed commit.

**Targets.** The seven folders listed above.

**Steps.** (1) Per folder: status, stash, unpushed commits on all branches, remotes, size. (2) Table with a verdict per folder. (3) Show anything at risk to the owner; ask when unsure what counts as old. (4) Delete only after the owner's yes; prefer the recycle bin. (5) RU+EN report in `docs/notes/`.

**Done.** Check table exists; only confirmed folders removed; report merged via PR; nothing outside the list touched.
