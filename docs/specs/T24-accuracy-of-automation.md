# T24 Точность автоматизации: автопостроение, экспертная система, проверка диаграмм, создание и правка / Accuracy of automation: auto-build, expert system, diagram checks, creation and editing

Состав: пять этапов, каждый в своём подчате и со своим независимым проверяющим. Ветки исполнителей: `wip/…` (автослияние их не трогает), после приёмки `feat/…`.

## RU

### Цель

Сделать автоматическое построение диаграмм, экспертную систему и проверку диаграмм заметно точнее и доказать это числами; расширить создание и правку диаграмм.

### Основа (уже в коде, не переписывать с нуля)

- Автопостроение: `site/js/automation/` (`describe.js`, `build.js`, `builders.js`, `upload.js`, `history.js`), мастер `components/automation.js`, ИИ-слой `tools/ai-*.js`.
- Экспертная система: `site/js/expert/` (`engine.js` с коэффициентами уверенности и выводом «почему», `kb-notation.js`, `kb-review.js`, `review.js`), панель `components/expert.js`.
- Проверка: `site/js/utils/diagram-review.js` (`checkCode`, `reviewCode`), `diagram-questions.js`, панели `review-panel.js`, `clarify-panel.js`, `problems-panel.js`.
- Принцип: правила работают всегда, модель только предлагает, принимается только то, что не хуже; всё объясняется.

### Этап 0. Стенд оценки точности (первым, блокирует остальные)

- Эталонный набор в `docs/eval/` (JSON, RU и EN): не менее 150 описаний на каждый язык по всем нотациям, которые строит `BUILDABLE`, с ожидаемой нотацией, элементами и связями; не менее 100 диаграмм с засеянными ошибками (категории: синтаксис, ссылки на несуществующее, недостижимое, тупики, нарушение правил нотации, баланс уровней); не менее 40 кодов Mermaid, PlantUML, DOT для проверки импорта.
- Метрики в `tools/eval/`, запуск `npm run eval`, отчёт `docs/eval/baseline.json` и `.md` (RU и EN):
  - определение нотации: top-1 и top-3, точность, полнота, F1 по классам, матрица ошибок;
  - построение: полнота и точность элементов и связей, доля синтаксически корректных результатов, повтор «построить, разобрать, сравнить», доля нужных уточняющих вопросов;
  - калибровка: совпадает ли заявленная уверенность с реальной точностью (ожидаемая ошибка калибровки);
  - проверка: полнота найденных засеянных ошибок по категориям, доля ложных срабатываний на чистых диаграммах;
  - время и стабильность (повторные прогоны дают то же).
- Детерминированность: без сети и ключа; ИИ-режим мерится отдельным опциональным набором на заглушке провайдера и вручную владельцем.
- Храповик: `npm run eval` в CI не блокирует, но сравнивает с базовой линией; ухудшение больше допуска помечается; улучшение предлагает обновить базу.
- Готово: базовая линия снята и опубликована, тесты стенда, документ RU+EN, 100% покрытия кода стенда.

### Этап 1. Точность автопостроения

- Описание словами: морфология русского и английского (основы слов, синонимы, глаголы действия), условия «если… то… иначе», параллельность («одновременно»), циклы, повторы, отрицание, роли и дорожки, хранилища данных, нумерованные шаги и списки, связки «затем», «после», «в это время», кореференция («он», «эта задача»).
- Определение нотации: признаки из текста (цель, аудитория, домен), несколько кандидатов с вероятностями, уточняющие вопросы только когда они меняют результат.
- По каждому элементу уверенность и список допущений («я предположил, что…»); неоднозначности показывать вариантами, а не молча выбирать.
- Код и файлы: проверка точности импорта (draw.io, BPMN, GraphML, DOT, Mermaid, PlantUML): сохранность подписей, направлений, вложенности.
- ИИ-режим: схемная выдача, несколько вариантов и выбор по оценке валидатора и согласованности, повторная самопроверка; результат принимается только если не хуже режима по правилам.
- Целевые пороги записываются после этапа 0 и в отчёте (ориентир: top-1 по нотации не ниже 85%, F1 по элементам и связям не ниже 0,85, 100% корректных по синтаксису); метрика не может стать хуже базовой.

### Этап 2. Экспертная система

- База знаний шире: выбор нотации по цели, аудитории, уровню детализации, домену, стандартам (блок-схема ГОСТ, IDEF0 для функций, BPMN для исполнения процессов, ERD и IDEF1X для данных, UML для ПО, DFD для потоков данных).
- Движок: приоритеты и разрешение конфликтов правил, калибровка коэффициентов уверенности по эталонному набору, режим «что если» (смена ответа и пересчёт), объяснения «почему эта, а не та» с альтернативами.
- Контроль самой базы знаний: поиск циклов, противоречий, недостижимых и дублирующих правил, покрытие вопросов; тест на каждое правило; редактор правил проверяет базу перед сохранением.
- Метрика: точность выбора нотации на эталонном наборе (из этапа 0) не ниже базовой и растёт.

### Этап 3. Точность проверки диаграмм

- Синтаксис и семантика каждой нотации по её правилам; межуровневые и межнотационные правила: баланс декомпозиции IDEF0 (A0 и A1), баланс уровней DFD, корректность BPMN (недостижимые узлы, тупики, XOR без ветки по умолчанию, смешение потоков), анализ сети Петри (достижимость, ограниченность, живость), ERD (сущность без ключа, связь многие-ко-многим без связующей, одиночные сущности), UML (циклы наследования, висячие связи), блок-схема (один старт, достижимость, у решения обе ветки).
- У каждого замечания: серьёзность, уверенность, строка, понятное объяснение, предложение исправления; безопасные исправления применяются одним кликом с предпросмотром и отменой.
- Метрика: полнота по засеянным ошибкам и доля ложных срабатываний на чистых диаграммах из этапа 0; цель: полнота не ниже 90% по критичным категориям, ложных срабатываний не более 2%.

### Этап 4. Создание и правка диаграмм

Приоритетный набор (порядок уточняется владельцем): умные значения по умолчанию при добавлении элемента и соединение перетаскиванием; правка подписи на месте; выделение нескольких элементов, выравнивание и распределение, копирование и дублирование; кнопка автораскладки и устойчивая раскладка; структура диаграммы (дерево элементов) и поиск с заменой; переименование идентификатора с обновлением всех ссылок; автодополнение и двусторонняя подсветка код ↔ холст (T12); сборка ER из таблицы (CSV); правка командой словами («добавь шаг после X») с предпросмотром и «принять / отклонить»; создание и правка только с клавиатуры; журнал отмены с просмотром. Каждая возможность с тестами и e2e, обе темы и языка.

### Этап 5. Проактивные подсказки и единая политика решений

- Подсказки при вводе без нажатия кнопки: «похоже на процесс, перейти на BPMN?», «в ERD три сущности без связей», «слишком много блоков (больше 7±2 на уровне), разбить?», «у решения нет второй ветки». Не чаще одной за раз, закрываются, отключаются в настройках, не отвлекают от набора.
- Единая политика решений (`site/js/decision-policy/`): пороги уверенности, когда модуль действует сам (безопасные правки), когда спрашивает (неоднозначность), когда только предлагает (рискованное); один источник для автопостроения, экспертной системы, проверки и подсказок; настраивается пользователем (осторожно, обычно, смело) и тестируется.
- Журнал решений: каждое решение (выбор нотации, принятое или отклонённое исправление, победитель в расчёте, принятая подсказка) сохраняется с причиной (вывод «почему»), версией диаграммы и временем; просмотр, экспорт в Markdown, очистка. На сервере (T04) привязывается к версии проекта.

### Этап 6. Обучение на выборе пользователя (по желанию, после этапа 0)

Запоминание предпочтений (какую нотацию выбирает для какого типа задач, какие подсказки отклоняет) и подстройка весов правил и порогов политики; только локально и с согласием пользователя, можно сбросить, не меняет базу знаний без показа изменений; качество измеряется стендом (улучшение не должно ухудшать эталонную точность).

### Общее

- Безопасность: всё, что строит модель и распознаёт разбор, проходит те же очистку и проверку; нет `innerHTML` с чужими данными.
- Все строки RU и EN, доступность, дизайн токенов без новых стилей.
- Каждый этап: сначала тесты, `npm run verify`, `npm run eval` не хуже базовой линии, отчёт RU и EN, независимый проверяющий, затем слияние.

### Вне задачи

Распознавание сложных рукописных схем и больших PDF, переписывание ядра на TypeScript (это архитектура диплома), серверная часть (T04).

## EN

### Goal

Make auto-build, the expert system and diagram checks measurably more accurate and prove it with numbers; extend diagram creation and editing.

### Basis (already in code, do not rewrite from scratch)

Auto-build `site/js/automation/` and the wizard `components/automation.js`, AI layer `tools/ai-*.js`; expert system `site/js/expert/` (certainty factors, "why" trace, knowledge bases); checks `site/js/utils/diagram-review.js`, `diagram-questions.js` and the review, clarify and problems panels. Principle: rules always work, the model only proposes, only what is not worse is accepted, everything is explained.

### Phase 0. Accuracy harness (first, blocks the rest)

Gold set in `docs/eval/` (RU and EN): at least 150 descriptions per language across all `BUILDABLE` notations with expected notation, elements and relations; at least 100 diagrams with seeded defects (syntax, dangling references, unreachable, dead ends, notation-rule violations, level balance); at least 40 Mermaid, PlantUML, DOT codes for import fidelity. Metrics in `tools/eval/`, `npm run eval`, baseline in `docs/eval/baseline.json` and `.md` (RU and EN): notation top-1/top-3, precision, recall, F1, confusion matrix; element and relation precision/recall, syntactic validity, round-trip fidelity, useful clarifying-question rate; calibration (expected calibration error); check recall by category and false-positive rate on clean diagrams; time and stability. Deterministic, no network or key; AI mode is measured separately on a provider stub and manually by the owner. Ratchet: `npm run eval` in CI does not block but compares with the baseline. Done: baseline published, harness tests, RU+EN doc, 100% coverage of the harness code.

### Phase 1. Auto-build accuracy

Morphology for Russian and English, conditions, parallelism, loops, negation, roles and swimlanes, data stores, numbered steps, connectives, coreference; notation detection from purpose, audience and domain with candidate probabilities and clarifying questions only when they change the result; per-element confidence and an assumptions list, ambiguities shown as variants; import fidelity for draw.io, BPMN, GraphML, DOT, Mermaid, PlantUML; AI mode with schema-constrained output, several variants chosen by validator score and consistency, self-check, accepted only if not worse than the rule mode. Targets are set after phase 0 (guide: notation top-1 at least 85%, element and relation F1 at least 0.85, 100% syntactically valid); no metric may fall below the baseline.

### Phase 2. Expert system

Wider knowledge base (purpose, audience, detail level, domain, standards: GOST flowchart, IDEF0, BPMN, ERD and IDEF1X, UML, DFD); engine with rule priorities and conflict resolution, certainty calibration on the gold set, what-if mode, "why this and not that" explanations; knowledge-base integrity checks (cycles, contradictions, unreachable and duplicate rules, question coverage), a test per rule, the rule editor validates before saving. Metric: notation choice accuracy on the gold set not below baseline and rising.

### Phase 3. Check accuracy

Per-notation syntax and semantics; cross-level and cross-notation rules (IDEF0 A0 to A1 balance, DFD level balance, BPMN soundness, Petri net reachability, boundedness and liveness, ERD keys and many-to-many, UML inheritance cycles, flowchart start, reachability and both branches); every finding has severity, confidence, line, explanation and a fix suggestion; safe fixes apply in one click with preview and undo. Metric: recall on seeded defects at least 90% for critical categories, false positives at most 2% on clean diagrams.

### Phase 4. Creation and editing

Priority set (order confirmed by the owner): smart defaults and drag-to-connect; in-place label edit; multi-select, align, distribute, copy, duplicate; auto-layout button and stable layout; outline tree and find/replace; id rename with reference updates; autocomplete and two-way code/canvas highlight (T12); ER from a CSV table; edit by instruction ("add a step after X") with accept/reject preview; keyboard-only creation and editing; undo history view. Each with tests and e2e, both themes and languages.

### Phase 5. Proactive hints and a unified decision policy

Hints while typing, with no button: "looks like a process, switch to BPMN?", "three ER entities without relations", "too many blocks per level, split?", "this decision has no second branch"; one at a time, dismissible, switchable in settings. A unified decision policy (`site/js/decision-policy/`): confidence thresholds for when a module acts by itself (safe fixes), asks (ambiguity) or only suggests (risky); one source for auto-build, the expert system, checks and hints; user-tunable (careful, normal, bold) and tested. A decision log: every decision (notation choice, accepted or rejected fix, calculation winner, accepted hint) saved with its reason (the "why" trace), the diagram version and time; view, Markdown export, clear; on the server (T04) tied to the project version.

### Phase 6. Learning from user choices (optional, after phase 0)

Remember preferences (which notation per kind of task, which hints are dismissed) and tune rule weights and policy thresholds; local only and with consent, resettable, never changes the knowledge base without showing the change; quality is measured by the harness (no regression of the gold accuracy).

### Common

Everything a model builds or the parser reads goes through the same sanitising and validation; no `innerHTML` with foreign data; RU/EN strings, accessibility, design tokens with no new styles. Each phase: tests first, `npm run verify`, `npm run eval` not below baseline, RU+EN report, independent reviewer, then merge.

### Out of scope

Complex handwritten diagrams and large PDFs, rewriting the core in TypeScript (diploma architecture), the server (T04).
