# Правила работы над проектом / Working rules

Обязательны для всех агентов и для владельца. Дополняют `CLAUDE.md`, `docs/PROJECT-STATE.md`, `docs/CI-CHECKS.md`. При конфликте приоритет у `CLAUDE.md`.

---

## RU

### 1 Ведение работы

1. Одна задача = одна спека в `docs/specs/` = один подчат = одна короткая ветка от свежего `origin/main` (`feat/…`, `fix/…`, `chore/…`, `docs/…`). Имена веток без упоминания инструментов и ИИ.
2. Задачи идут строго по очереди. Следующая начинается после приёмки предыдущей.
3. Ничего вне спеки не делать. Нашли постороннюю проблему: записать в отчёт, не чинить молча.
4. Один PR = один смысл, небольшой. Заголовок и коммиты на английском в стиле `type: summary` (`feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `ci`).
5. Коммиты только от имени владельца, без `Co-Authored-By`, без строк «generated with», без отметок инструментов (страж репозитория проверяет).
6. В `main` напрямую не пушить, `--force`, `--no-verify` и обход хуков запрещены. Слияние: зелёный CI, автослияние squash, ветка удаляется.
7. Не коммитить: секреты, `.env`, `.claude/admin-test-account.txt`, `.claude/worktrees/`, `.playwright-mcp/`, `.accelerator/profile.user.json`, большие бинарники без причины.
8. Перед удалением или перезаписью смотреть, что именно удаляется. Необратимое (удаление папок, веток, `force`) только после «да» владельца.
9. Отчёт подчата: что сделано, что проверено (команды и результат), что не проверено, открытые вопросы. Без неподтверждённых утверждений «всё работает».
10. На 40% контекста остановиться и написать передачу. Слово «стоп» останавливает всё.
11. Среда: один `npm test` за раз, один браузер, один тяжёлый агент. Выбор модели по сложности: haiku, sonnet, opus.

### 2 Правила кода

1. Стиль задают `.editorconfig` (UTF-8, LF, 2 пробела), Prettier и ESLint. Форматирование не вручную: `npm run format`.
2. Строгое сравнение, без `var`, без неиспользуемых имён, без пустых блоков. Не добавлять новые `// @ts-nocheck`; типы проверяет `npm run typecheck`.
3. Код диаграммы остаётся единственным источником правды (положение блоков `pos=XxY`, свойства блоков в коде).
4. Безопасность: вывод чужих данных через `textContent`, не `innerHTML`; чужой SVG очищать; строгая CSP; никаких внешних CDN и внешних шрифтов; service worker не кэширует чужие адреса.
5. Ввод проверяется на границе (клиент и сервер), ошибки в едином формате, без утечки внутренностей (стек, пути, SQL). Пароли только bcrypt; токены короткоживущие; секреты только из `.env`.
6. Права проверяются на сервере, не только в интерфейсе. Ответ 403/404 не раскрывает существование чужих данных.
7. Функции маленькие, одно действие, понятные имена; магические числа и пределы в конфиге (`limits.json`). Комментарии объясняют «почему», не «что».
8. Все строки интерфейса через словарь RU/EN, без литералов в коде. Доступность: подписи, фокус, клавиатура, контраст в обеих темах.
9. Новые зависимости только по необходимости: проверить лицензию, `npm audit`, размер; Dependency review должен быть зелёным.
10. Дизайн Части 2 идентичен Части 1: один пакет CSS, токены `site/css/variables.css`; новые варианты стиля не вводить.

### 3 Правила тестирования

1. Сначала тест, потом код (красный → зелёный → рефакторинг). Каждая фича и каждая исправленная ошибка получает тест; для ошибки сначала тест, который её воспроизводит.
2. Пирамида: много быстрых модульных тестов (`node --test`), интеграционные для сервера и БД, мало сквозных (e2e в Playwright/Edge, Firefox где подключён).
3. Покрытие Части 1: 100% строк, ветвей и функций (`npm test`). Для `part-2/*` у каждой папки свой порог и свой `npm test`; не понижать.
4. Проверять поведение, не реализацию. Один тест: одна причина падения, понятное имя «что при каком условии».
5. Обязательно: граничные значения, пустой ввод, неверный тип, негативные сценарии, права каждой роли, ошибки сети и сервера, повреждённое хранилище.
6. Тесты детерминированы: без реального времени и сети (подмены, фиксированные часы), без зависимости от порядка, у каждого свои данные и порты, чистка за собой.
7. Запрещено: ослаблять или удалять тест, чтобы он прошёл; `skip`/`only` в коммите; понижать пороги; ловить исключение и молчать.
8. Интерфейс проверять в настоящем браузере: консоль без ошибок, обе темы, оба языка, мобильная ширина; снимок или лог как доказательство.
9. Отчёты (`tools/lint-report.js`): после правки кода пересобрать отчёт, иначе тест отчёта падает; русская и английская версии.
10. Проверки утечек (`leaks.yml`) запускать при изменении серверных и редакторских частей; мутационные тесты (Stryker) еженедельно, не обязательные.
11. Определение «готово»: `npm run verify` зелёный, e2e пройден, проверка независимым проверяющим «принять», PR влит, `main` зелёный. Только после этого задача закрыта.

### 4 Правила проверяющего (независимого агента)

- Работает только на чтение; не видел ход работы исполнителя, исходит из спеки и диффа.
- Проверяет: соответствие спеке, нарушение правил выше, дыры в тестах (что не покрыто, что тест не поймает), безопасность, документацию RU/EN, посторонние файлы в диффе.
- Запускает проверки сам, а не верит отчёту. Вердикт «принять» или «доработать» со списком замечаний по важности и ссылками `файл:строка`.

---

## EN

### 1 Workflow

1. One task = one spec in `docs/specs/` = one sub-chat = one short branch from fresh `origin/main` (`feat/…`, `fix/…`, `chore/…`, `docs/…`); no tool or AI names in branch names.
2. Tasks run strictly in order; the next starts after the previous is accepted.
3. Do nothing outside the spec; report unrelated problems instead of silently fixing them.
4. One PR = one small purpose. English titles and commits, `type: summary`.
5. Commits only as the owner; no `Co-Authored-By`, no "generated with" lines, no tool attributions (the repo guard checks).
6. No direct pushes to `main`; no `--force`, `--no-verify` or hook bypass. Merge via green CI, squash auto-merge, branch deleted.
7. Never commit secrets, `.env`, `.claude/admin-test-account.txt`, `.claude/worktrees/`, `.playwright-mcp/`, `.accelerator/profile.user.json`, or needless large binaries.
8. Look before deleting or overwriting; irreversible actions only after the owner's yes.
9. Sub-chat report: done, verified (commands and results), not verified, open questions. No unproven "all works".
10. Stop at 40% context and write a handover; "стоп" halts everything.
11. One `npm test`, one browser, one heavy agent at a time. Pick the model by difficulty.

### 2 Code rules

1. Style from `.editorconfig` (UTF-8, LF, 2 spaces), Prettier, ESLint; run `npm run format`, do not hand-format.
2. Strict equality, no `var`, no unused names, no empty blocks; no new `// @ts-nocheck`; `npm run typecheck` must pass.
3. Diagram code stays the single source of truth (`pos=XxY`, block properties in code).
4. Security: foreign data via `textContent`, never `innerHTML`; sanitise foreign SVG; strict CSP; no external CDNs or fonts; the service worker never caches foreign origins.
5. Validate input at the boundary, uniform error format, no leaks of internals; bcrypt only; short-lived tokens; secrets only from `.env`.
6. Permissions enforced on the server; 403/404 never reveal other users' data.
7. Small single-purpose functions, clear names; limits in config; comments explain why.
8. All UI strings via the RU/EN dictionary; accessibility: labels, focus, keyboard, contrast in both themes.
9. Add dependencies only when needed: licence, `npm audit`, size; Dependency review green.
10. Part 2 design equals Part 1; same CSS package and tokens; no new style variants.

### 3 Testing rules

1. Test first, then code (red, green, refactor). Every feature and every bug fix gets a test; a bug starts with a reproducing test.
2. Pyramid: many fast unit tests (`node --test`), integration for server and DB, few e2e (Playwright/Edge, Firefox where wired).
3. Part 1 coverage 100% lines, branches, functions; each `part-2/*` folder keeps its own threshold; never lower it.
4. Test behaviour, not implementation; one failure reason per test; names say what under which condition.
5. Always cover boundaries, empty and wrong-type input, negative paths, every role's permissions, network/server errors, corrupted storage.
6. Deterministic tests: fake time and network, no order dependence, own data and ports, clean up.
7. Forbidden: weakening or deleting a test to pass; committed `skip`/`only`; lowering thresholds; swallowing exceptions.
8. Check UI in a real browser: clean console, both themes, both languages, mobile width; keep a screenshot or log as evidence.
9. Reports (`tools/lint-report.js`): rebuild after code changes; RU and EN versions.
10. Run leak checks when touching server or editor code; Stryker weekly, not required.
11. Definition of done: `npm run verify` green, e2e passed, independent reviewer "accept", PR merged, `main` green.

### 4 Reviewer rules (independent agent)

- Read-only; has not seen the executor's process, works from the spec and the diff.
- Checks spec conformance, rule violations, test gaps, security, RU/EN docs, stray files in the diff.
- Runs the checks itself instead of trusting the report. Verdict "accept" or "rework" with findings ranked by severity and `file:line` references.
