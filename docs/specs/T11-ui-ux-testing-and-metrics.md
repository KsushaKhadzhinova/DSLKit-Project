# T11 Тестирование, валидация и исправление интерфейса (UI/UX/IxD) и метрики / UI/UX/IxD testing, validation, fixes and metrics

Состав: один исполнитель (исправления) и четыре независимых агента, которые только читают, мерят и ищут ошибки, исправлений не делают: метрики дизайна, метрики тестирования, визуальная проверка и поиск ошибок, проверки адаптивности. Ветка исполнителя: `wip/ui-ux-fixes`, затем `feat/ui-ux-fixes` после приёмки.

## RU

### Цель

Найти, измерить и исправить проблемы интерфейса и взаимодействия редактора и сайта; задать числовые пороги качества дизайна и тестирования и проверять их при каждом изменении.

### Основа

Уже есть: аудиты `docs/audit/ui-2026-11` и `docs/audit/ux-2026-11` (находки за пределами исправленных остаются открытыми), `docs/ux/` (метод, правила, отчёты), `docs/metrics/` (Lighthouse, валидатор CSS, браузеры), `docs/testing/TEST-TYPES.md`, проверки `Quality` в CI (axe-core, Lighthouse-бюджеты, flaky-прогон), мутационные тесты Stryker (раз в неделю), проверки утечек памяти.

### Агент 1. Исполнитель UI/UX/IxD (sonnet)

1. Инвентаризация: открытые находки аудитов UI и UX, сгруппировать по серьёзности (блокирует задачу, мешает, косметика) и по экранам (лендинг, редактор, дашборд, вход, ошибки, пустые состояния).
2. Валидация интерфейса: проход по эвристикам Нильсена, WCAG 2.2 AA (контраст, фокус, цели касания 24 px и больше, клавиатура, подписи, `aria-live`), состояния (загрузка, ошибка, пусто, офлайн), обратная связь действий, отмена и возврат, тексты ошибок, согласованность токенов `site/css/variables.css`, обе темы, оба языка, адаптив (320, 768, 1024, 1440 px), поворот экрана.
3. Исправления по приоритету, каждое с тестом (модульный или e2e) и снимком до/после. Один PR на группу экранов, маленькие.
4. Взаимодействия (IxD): время реакции (отклик меньше 100 мс, отрисовка не блокирует ввод), анимации не дольше 300 мс и с учётом `prefers-reduced-motion`, перетаскивание, горячие клавиши, тур редактора.
5. Дизайн Части 2 идентичен Части 1: новые стили не вводить.

### Агент 2. Метрики дизайна (независимый, только чтение, sonnet)

Измеряет до и после, пишет отчёт `docs/metrics/design-<дата>.md` (RU и EN) и таблицу в JSON:

- Lighthouse: доступность, лучшие практики, производительность, SEO по основным страницам, обе темы; LCP, CLS, INP, TBT.
- axe-core: число нарушений по серьёзности на каждой странице и теме (цель: 0 critical и serious).
- Контраст: доля пар текст/фон с AA и AAA (`tools/contrast.js`), цель 100% AA.
- Эвристическая оценка по Нильсену: балл 0-4 по каждой из 10 эвристик и экрану, средний балл, список нарушений.
- Сценарные метрики (скриптами Playwright): число кликов и шагов, время выполнения ключевых задач (создать диаграмму, переименовать блок, экспортировать, сменить язык), доля успешных выполнений, число ошибок; закон Фитса и Хика: размер и расстояние главных целей, число пунктов в меню.
- Согласованность: число уникальных цветов, шрифтов, отступов, радиусов вне токенов; размер CSS и бюджет бандла.
- Пороги: любое ухудшение относительно базовой линии — замечание; цель по каждой метрике записана в отчёте.

### Агент 3. Метрики тестирования (независимый, только чтение, sonnet)

Измеряет, пишет `docs/metrics/testing-<дата>.md` (RU и EN) и таблицу в JSON:

- Покрытие строк, ветвей, функций (Часть 1 цель 100%; `part-2/*` по папкам и новая `server/`).
- Мутационный индекс Stryker по `site/js/auth`, `site/js/utils` и новым модулям, выжившие мутанты по важности.
- Доля нестабильных тестов: два прогона, второй в случайном порядке; число перезапусков до зелёного.
- Результаты e2e: прошло/всего, по браузерам (Edge, chromium, firefox), время прогона.
- Пирамида: число модульных, интеграционных, e2e тестов и их доля; время `npm test`.
- Плотность дефектов: найденные и исправленные дефекты на 1000 строк, повторно открытые; находки аудитов по статусам.
- Утечки памяти (`leaks.yml`): рост кучи, число узлов DOM и слушателей против пределов.
- Трассируемость: у каждого требования спеки есть тест; список требований без теста.

### Агент 4. Визуальная проверка и поиск ошибок (независимый, только чтение, sonnet)

Проходит сайт и редактор в настоящих браузерах (Edge, затем Chromium и Firefox; один браузер за раз), как пользователь, и ищет ошибки. Отчёт `docs/audit/visual-<дата>.md` (RU и EN), у каждой находки: экран, шаги, ожидаемое и фактическое, серьёзность, снимок.

- Визуальные дефекты: наезжающие и обрезанные тексты, сломанная вёрстка, неверные отступы и выравнивание, мерцание и скачки макета, битые изображения, шрифты, иконки, различия светлой и тёмной тем, русского и английского вариантов.
- Функциональные ошибки: каждый пункт меню и кнопка, все 33 нотации (отрисовка, ошибки в коде, экспорт), диалоги, тур, импорт и экспорт, автосохранение, сброс и очистка хранилища, офлайн, повреждённые данные.
- Консоль и сеть: ошибки и предупреждения консоли, неудачные запросы, медленные ответы, утечки (рост узлов DOM).
- Страницы ошибок и пустые состояния: 404, 500, пустой список проектов, недоступный сервис отрисовки.
- Сравнение с макетами (`docs/design-contest/`) и с токенами: расхождения по цвету, размеру, радиусам.
- Снимки до и после исправлений, сравнение попиксельно с допуском для регрессий.

### Агент 5. Проверки адаптивности (независимый, только чтение, sonnet)

Проверяет все основные страницы и редактор на ширинах 320, 375, 414, 768, 1024, 1280, 1440, 1920 px, в книжной и альбомной ориентации, при увеличении текста до 200% и масштабе страницы 400% (WCAG reflow), в обеих темах и языках. Отчёт `docs/audit/responsive-<дата>.md` (RU и EN) и таблица «страница × ширина × результат».

- Нет горизонтальной прокрутки (кроме намеренных областей), ничего не обрезается и не перекрывается.
- Цели касания не меньше 24 px (рекомендуется 44 px), расстояние между ними достаточное, нижние панели не закрывают контент (в том числе экранная клавиатура).
- Редактор: панели, палитра, панель свойств, меню экспорта, диалоги и холст пригодны на узких экранах; жесты (щипок, перетаскивание) и поворот экрана.
- Навигация: меню, фокус и порядок табуляции, `viewport`, `safe-area`, `hover` не единственный способ.
- Изображения и диаграммы масштабируются, `srcset` и размеры, печать (`@media print`).
- Эмуляция устройств (мобильный, планшет, ноутбук) и реальный телефон, если владелец подключит; что не проверено, указать.

### Порядок и критерии готовности

1. Сначала измерители и проверяющие агенты 2–5 снимают базовую линию (параллельно, только чтение, не больше одного браузера за раз: если браузер один, по очереди).
2. Исполнитель исправляет по приоритету (находки агентов 4 и 5, затем аудиты), не ухудшая метрики.
3. Измерители и проверяющие агенты 2–5 повторяют замеры и проход, пишут разницу «до → после».
4. Независимый проверяющий (отдельный от измерителей и исполнителя) принимает работу.
5. Готово: `npm run verify` зелёный; нет открытых находок серьёзности «блокирует» и «мешает» от агентов 4 и 5; на ширинах 320–1920 px нет горизонтальной прокрутки и обрезания; 0 critical и serious в axe; AA по контрасту 100%; Lighthouse доступность не ниже 95 (цель 100) на основных страницах; ни одна метрика не хуже базовой линии; все исправления с тестами; отчёты метрик RU и EN в `docs/metrics/`; пороги внесены в `docs/CI-CHECKS.md` как предложение (обязательные проверки меняет только владелец).

### Вне задачи

Новый визуальный стиль, новые нотации, серверная часть (T04), локализация всех строк (T07; здесь только то, что мешает UX).

## EN

### Goal

Find, measure and fix UI and interaction problems in the editor and site; set numeric quality thresholds for design and testing and check them on every change.

### Basis

Existing: UI and UX audits (`docs/audit/ui-2026-11`, `docs/audit/ux-2026-11`; open findings remain), `docs/ux/`, `docs/metrics/`, `docs/testing/TEST-TYPES.md`, CI `Quality` checks (axe-core, Lighthouse budgets, flaky run), weekly Stryker mutation tests, memory-leak checks.

### Agent 1. UI/UX/IxD fixer (sonnet)

Inventory open audit findings by severity and screen; validate against Nielsen heuristics and WCAG 2.2 AA (contrast, focus, 24 px targets, keyboard, labels, `aria-live`), states (loading, error, empty, offline), feedback, undo, error texts, token consistency, both themes and languages, responsive widths (320, 768, 1024, 1440) and rotation; fix by priority, each with a test and before/after screenshots, small PRs; interaction timing (response under 100 ms, animations up to 300 ms honouring `prefers-reduced-motion`), drag, shortcuts, tour. Part 2 design equals Part 1: no new styles.

### Agent 2. Design metrics (independent, read-only, sonnet)

Report `docs/metrics/design-<date>.md` (RU and EN) plus JSON: Lighthouse (accessibility, best practices, performance, SEO; LCP, CLS, INP, TBT) in both themes; axe violations by severity (target 0 critical/serious); contrast AA/AAA share (target 100% AA); Nielsen heuristic scores 0-4 per heuristic and screen; scripted scenario metrics (clicks, steps, time, success rate, errors; Fitts and Hick inputs); consistency (colours, fonts, spacing, radii outside tokens; CSS and bundle size). Any regression against the baseline is a finding.

### Agent 3. Testing metrics (independent, read-only, sonnet)

Report `docs/metrics/testing-<date>.md` (RU and EN) plus JSON: line/branch/function coverage (Part 1 target 100%, per-folder for `part-2/*` and `server/`); Stryker mutation score and surviving mutants; flaky rate (two runs, second shuffled); e2e pass/total per browser and duration; test pyramid counts and `npm test` time; defect density and reopened defects, audit findings by status; memory-leak growth vs limits; requirement-to-test traceability with the list of untested requirements.

### Agent 4. Visual inspection and bug hunting (independent, read-only, sonnet)

Walks the site and editor in real browsers (Edge, then Chromium and Firefox; one at a time) as a user and hunts bugs. Report `docs/audit/visual-<date>.md` (RU and EN); each finding has screen, steps, expected vs actual, severity, screenshot. Covers visual defects (overlap, clipping, layout shifts, broken images, fonts, icons, theme and language differences), functional errors (every menu item and button, all 33 notations including render errors and export, dialogs, tour, import/export, autosave, storage reset, offline, corrupted data), console and network errors, error pages and empty states, comparison with the mockups and tokens, and before/after screenshot regression with a tolerance.

### Agent 5. Responsive checks (independent, read-only, sonnet)

Checks all main pages and the editor at 320, 375, 414, 768, 1024, 1280, 1440 and 1920 px, portrait and landscape, with text zoom to 200% and page zoom to 400% (WCAG reflow), in both themes and languages. Report `docs/audit/responsive-<date>.md` (RU and EN) plus a page × width × result table. Checks: no horizontal scroll or clipping, touch targets at least 24 px (44 px recommended), bottom bars and the on-screen keyboard do not cover content, editor panels/palette/properties/export menu/dialogs/canvas usable on narrow screens, gestures and rotation, navigation and tab order, `viewport` and `safe-area`, hover never the only path, images and diagrams scale, print styles; device emulation and a real phone if the owner connects one; state what was not checked.

### Order and definition of done

1. Agents 2–5 take a baseline first (parallel, read-only, one browser at a time: take turns if there is a single browser).
2. The fixer works by priority (findings of agents 4 and 5 first, then audits) without regressing metrics.
3. Agents 2–5 repeat their runs and report before to after.
4. An independent reviewer (different from measurers and fixer) accepts.
5. Done: `npm run verify` green; no open blocker or annoying findings from agents 4 and 5; no horizontal scroll or clipping from 320 to 1920 px; 0 critical/serious in axe; 100% AA contrast; Lighthouse accessibility at least 95 (goal 100) on main pages; no metric worse than baseline; every fix has a test; metric reports in RU and EN in `docs/metrics/`; thresholds proposed in `docs/CI-CHECKS.md` (only the owner changes required checks).

### Out of scope

New visual style, new notations, the server (T04), full string localization (T07; only what blocks UX here).
