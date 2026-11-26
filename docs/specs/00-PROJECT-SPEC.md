# Спецификация проекта DSLKit и план задач / Project spec and task plan

Дата: 26.11.2026. Источник: `PROJECT-STATE.md`, `HANDOVER-SESSION-2026-11-26.md`. Спеки задач лежат рядом: `T01-…` … `T11-…`. Каждый файл двуязычный: сначала русский, затем английский.

---

## RU

### 1 Продукт

DSLKit: веб-редактор диаграмм «как код» (33 нотации, 4 движка отрисовки, RU/EN, светлая и тёмная темы, офлайн-кэш). Сайт в `site/`, лабораторные Части 1 в `labs/`, работы Части 2 в `part-2/`, курсовой в ветке `course-project`. `main` защищён правилом `main protection` (17 обязательных проверок).

### 2 Роли

**Люди и агенты процесса**

| Роль                      | Кто               | Что делает                                                                                                              |
| ------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Владелец                  | студентка         | ставит приоритеты, решает про слияния и удаления, даёт секреты и скриншоты, отвечает на вопросы номерами                |
| Ведущий агент             | этот чат          | держит план и спеки, запускает подчаты, проверяет их результат по диффу, ведёт статус; сам делает сложное и рискованное |
| Агент задачи              | подчат            | выполняет одну спеку в своей ветке и рабочем дереве, пишет тесты, отчитывается                                          |
| Агент-проверяющий         | субагент (sonnet) | ревью диффа, прогон проверок, без правок                                                                                |
| Агент метрик дизайна      | подчат (sonnet)   | Lighthouse, axe, контраст, эвристики Нильсена, сценарные метрики; только чтение (T11)                                   |
| Агент метрик тестирования | подчат (sonnet)   | покрытие, мутации, нестабильность, e2e по браузерам, пирамида, трассируемость; только чтение (T11)                      |
| Агент визуальной проверки | подчат (sonnet)   | проход по сайту и редактору в браузерах, поиск визуальных и функциональных ошибок; только чтение (T11)                  |
| Агент адаптивности        | подчат (sonnet)   | проверка ширин 320-1920 px, ориентации, масштаба, касаний; только чтение (T11)                                          |
| CI                        | GitHub            | 17 обязательных проверок, автослияние (squash)                                                                          |

**Роли внутри продукта (для T04)**

| Роль          | Права                                                       |
| ------------- | ----------------------------------------------------------- |
| Гость         | редактор в браузере, локальное хранилище, без сервера       |
| Пользователь  | свои проекты на сервере: создать, читать, править, удалять  |
| Редактор      | пользователь + доступ к общим проектам на запись            |
| Администратор | всё + управление пользователями и ролями, снятие блокировки |

### 3 Процесс (флоу)

1. `git fetch`, короткая ветка от свежего `origin/main` (`feat/…`, `chore/…`, `docs/…`), своё рабочее дерево.
2. Работа по спеке: сначала тест, затем код. Отчёты и README сразу на RU и EN.
3. `npm run verify` локально (по одному прогону на машине), e2e в Edge для UI.
4. Коммиты от имени владельца, на английском, без подписей инструментов и ИИ.
5. Пуш ветки, PR, зелёный CI, автослияние squash, ветка удаляется. В `main` напрямую не пушить.
6. Подчат пишет отчёт: что сделано, что проверено, что не проверено. Ведущий агент сверяет с диффом и обновляет статус.
7. Остановка: слово «стоп» останавливает всех; на 40% контекста подчат пишет передачу.
8. Приёмка: после отчёта подчата ведущий агент запускает **независимого проверяющего** (новый подчат, другой агент, не видевший работу исполнителя; только чтение). Проверяющий сверяет дифф со спекой, гоняет проверки, ищет дыры в тестах и безопасности, пишет вердикт «принять / доработать» со списком замечаний.
9. Ведущий агент даёт исполнителю обратную связь (замечания проверяющего и свои), исполнитель дорабатывает, цикл повторяется до «принять». Следующая задача стартует только после приёмки предыдущей. Задачи выполняются строго по очереди, каждая в новом подчате.

### 4 Правила стоимости агентов

Простое (чистка, переименования, пересъёмка): haiku. Обычное (фичи по спеке, тесты): sonnet. Сложное и рискованное (сервер, БД, роли, права, ИИ): opus или ведущий агент. Один тяжёлый агент и один браузер одновременно, два `npm test` одновременно запрещены.

### 5 Карта задач и порядок

| №   | Задача                                                                                        | Тип      | Сложность               | Зависит от                          | Порядок             |
| --- | --------------------------------------------------------------------------------------------- | -------- | ----------------------- | ----------------------------------- | ------------------- |
| T01 | Чистка диска E: (старые версии проекта)                                                       | операции | простая, но риск потери | решение владельца по списку         | 1                   |
| T02 | Рабочие деревья и перенос `wip`                                                               | операции | простая                 | нет                                 | 1 (параллельно T01) |
| T03 | Панель свойств блока и экспорт PlantUML/Mermaid                                               | фича     | обычная                 | T02                                 | 2                   |
| T04 | Сервер редактора: аккаунты и роли в БД                                                        | фича     | сложная                 | нет                                 | 2                   |
| T05 | Диаграмма Ганта                                                                               | фича     | обычная                 | нет                                 | 3                   |
| T06 | Собственные шрифты                                                                            | фича     | простая                 | нет                                 | 3                   |
| T07 | Полная локализация RU/EN                                                                      | фича     | обычная, широкая        | желательно после T03, T05, T06      | 4                   |
| T08 | «Добавить ИИ»                                                                                 | фича     | сложная                 | уточнение объёма у владельца        | 4                   |
| T09 | Сверка статусов с реальностью                                                                 | проверка | обычная                 | нет                                 | 2                   |
| T10 | Долг по проверкам и веткам                                                                    | качество | обычная                 | решения владельца                   | 3                   |
| T11 | Тестирование, валидация и исправление UI/UX/IxD, метрики (4 независимых агента + исполнитель) | качество | обычная, широкая        | после T03; базовая линия до T05-T07 | 3-4                 |

Задачи, меняющие одни и те же файлы (`site/js/…` в T03, T05, T06, T07), идут по одной; параллельно только независимые области (операции, сервер, проверки).

### 6 Общие критерии готовности

- `npm run verify` зелёный, покрытие Части 1 не ниже 100%.
- Новый код покрыт тестами, UI проверен в Edge (Firefox, где подключён).
- RU и EN версии документов, описание в `docs/` обновлено.
- PR влит автослиянием, `main` зелёный, ветка удалена.
- Секретов, `.claude/admin-test-account.txt`, `.claude/worktrees/`, `.playwright-mcp/`, `.accelerator/profile.user.json` в коммите нет.

---

## EN

### 1 Product

DSLKit is a web diagram-as-code editor (33 notations, 4 render engines, RU/EN, light/dark themes, offline cache). Site in `site/`, Part 1 labs in `labs/`, Part 2 work in `part-2/`, coursework on branch `course-project`. `main` is protected by the `main protection` ruleset (17 required checks).

### 2 Roles

**Process roles**

| Role                    | Who               | Duties                                                                                                                                |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Owner                   | the student       | sets priorities, decides merges and deletions, supplies secrets and screenshots, answers by number                                    |
| Lead agent              | this chat         | owns plan and specs, starts sub-chats, verifies their results against the diff, tracks status; does the complex and risky work itself |
| Task agent              | sub-chat          | executes one spec in its own branch and worktree, writes tests, reports                                                               |
| Reviewer agent          | subagent (sonnet) | diff review and check runs, no edits                                                                                                  |
| Design metrics agent    | sub-chat (sonnet) | Lighthouse, axe, contrast, Nielsen heuristics, scenario metrics; read-only (T11)                                                      |
| Testing metrics agent   | sub-chat (sonnet) | coverage, mutation score, flakiness, e2e per browser, pyramid, traceability; read-only (T11)                                          |
| Visual inspection agent | sub-chat (sonnet) | walks the site and editor in browsers hunting visual and functional bugs; read-only (T11)                                             |
| Responsive agent        | sub-chat (sonnet) | widths 320-1920 px, orientation, zoom, touch targets; read-only (T11)                                                                 |
| CI                      | GitHub            | 17 required checks, squash auto-merge                                                                                                 |

**Product roles (for T04)**

| Role   | Rights                                            |
| ------ | ------------------------------------------------- |
| Guest  | browser editor, local storage, no server          |
| User   | own server projects: create, read, update, delete |
| Editor | user + write access to shared projects            |
| Admin  | all + manage users and roles, unlock accounts     |

### 3 Flow

1. `git fetch`, short branch from fresh `origin/main` (`feat/…`, `chore/…`, `docs/…`), own worktree.
2. Work per spec: test first, then code. Reports and READMEs in RU and EN together.
3. `npm run verify` locally (one run at a time), e2e in Edge for UI.
4. Commits as the owner, in English, no tool or AI attributions.
5. Push, PR, green CI, squash auto-merge, branch deleted. No direct pushes to `main`.
6. The sub-chat writes a report: done, verified, not verified. The lead agent checks it against the diff and updates status.
7. Stop: the word "стоп" halts everyone; at 40% context a sub-chat writes a handover.
8. Acceptance: after the sub-chat reports, the lead starts an **independent reviewer** (a new sub-chat, a different agent that has not seen the executor's work; read-only). It checks the diff against the spec, runs the checks, hunts for test and security gaps, and returns "accept / rework" with findings.
9. The lead gives the executor feedback (reviewer's plus its own); the executor reworks; repeat until "accept". The next task starts only after acceptance. Tasks run strictly one after another, each in a new sub-chat.

### 4 Agent cost tiers

Simple (cleanup, renames, re-shooting): haiku. Ordinary (spec features, tests): sonnet. Complex or risky (server, DB, roles, permissions, AI): opus or the lead agent. One heavy agent and one browser at a time; never two `npm test` runs at once.

### 5 Task map and order

See the RU table above (identical IDs T01–T11, same dependencies and order). Tasks touching the same files (`site/js/…` in T03, T05, T06, T07) run one at a time; only independent areas (operations, server, checks) run in parallel.

### 6 Common definition of done

- `npm run verify` green, Part 1 coverage at 100%.
- New code has tests, UI checked in Edge (Firefox where wired).
- RU and EN docs, `docs/` updated.
- PR auto-merged, `main` green, branch deleted.
- No secrets, `.claude/admin-test-account.txt`, `.claude/worktrees/`, `.playwright-mcp/`, `.accelerator/profile.user.json` in the commit.
