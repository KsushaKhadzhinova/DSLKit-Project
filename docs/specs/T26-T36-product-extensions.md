# T26–T36 Расширения продукта / Product extensions

Дополнительные задачи после основной цепочки. У каждой: исполнитель в подчате, ветка `wip/…`, независимый проверяющий, слияние после приёмки (процесс в `00-PROJECT-SPEC.md`, правила в `01-RULES.md`). Общие критерии для всех: сначала тесты, `npm run verify` с покрытием 100%, e2e в Edge, обе темы и языка (RU и EN), документы RU и EN, никаких `innerHTML` с чужими данными, дизайн токенов без новых стилей, `npm run eval` не хуже базовой линии (после T24 этап 0).

| №   | Задача                                          | Зависит от                       | Усилие  |
| --- | ----------------------------------------------- | -------------------------------- | ------- |
| T26 | Генерация кода из диаграмм и обратная инженерия | парсеры нотаций, экспорт         | среднее |
| T27 | Симуляция процессов                             | T24 этап 3, T25                  | среднее |
| T28 | Документация из диаграмм                        | экспорт, `tools/build-report.js` | малое   |
| T29 | Трассируемость между диаграммами                | T24 этап 3                       | среднее |
| T30 | Публикация и интеграции                         | рендер-API, T04                  | среднее |
| T31 | Сравнение версий и комментарии на холсте        | T04, совместная работа           | среднее |
| T32 | Описание для скринридеров и высокий контраст    | T11, T14                         | малое   |
| T33 | Большие диаграммы                               | собственный движок, T24 этап 0   | среднее |
| T34 | Видимая аналитика качества                      | T24 этап 0                       | малое   |
| T35 | Конфиденциальность и комплаенс                  | T04, `auth/audit.js`, `totp.js`  | малое   |
| T36 | Справка и обучающие материалы                   | тур, шаблоны, `docs.js`          | малое   |

## RU

### T26 Генерация кода из диаграмм и обратная инженерия

**Цель.** Диаграмма «как код» становится рабочим артефактом, а не картинкой.

- Вперёд: ERD в SQL (DDL для PostgreSQL и SQLite: типы, ключи, внешние ключи, индексы, ограничения) и в модели ORM (Sequelize, Prisma); UML-классы в TypeScript (интерфейсы и классы, наследование, связи, видимость); диаграмма последовательности в OpenAPI (пути, методы, схемы запросов и ответов, коды ошибок из ветвей).
- Назад: SQL (`CREATE TABLE`, ключи) в ERD; OpenAPI (YAML и JSON) в диаграмму последовательности или классов; повторное использование `tools/http-to-postman.js` для коллекций.
- Проверка перед генерацией (по правилам нотации): сущность без ключа, неизвестный тип, висячая связь дают понятное сообщение, а не битый код.
- Результат всегда проходит предпросмотр и копирование или скачивание; сгенерированный код не исполняется.
- Тесты: эталонные пары «диаграмма и ожидаемый код», круговая проверка (диаграмма, код, диаграмма совпадают), сгенерированный SQL выполняется на SQLite в тесте, OpenAPI проходит валидацию по схеме.
- Вне задачи: генерация полноценного бэкенда и миграций, поддержка всех диалектов SQL.

### T27 Симуляция процессов

**Цель.** Автоматизировать решение «что улучшить в процессе».

- Анимация токенов в BPMN и сетях Петри (шаг, пауза, скорость, запись трассы выполнения); правила ветвления из атрибутов (вероятности, условия).
- Расчёт: время цикла, ожидание, загрузка ресурсов, стоимость прохода; аналитика по многим прогонам (Монте-Карло): распределения, 95-й процентиль.
- Поиск узкого места: узел с наибольшей очередью и вкладом во время; рекомендации с объяснением «почему» (по T24 этап 5).
- Сравнение вариантов «что если»: два варианта процесса рядом, разница метрик, выбор лучшего методом из T25.
- Использует анализ корректности (недостижимое, тупики) до запуска; при зацикливании останов по лимиту шагов.
- Тесты: известные сети Петри и BPMN с эталонными метриками, детерминированность при заданном зерне, свойства (сохранение токенов). Вне задачи: полный стандарт исполнения BPMN.

### T28 Документация из диаграмм

**Цель.** Пояснительная записка из модели автоматически.

- Описание процесса или модели, таблица элементов (имя, тип, описание, связи), перечень требований и допущений из атрибутов, список проверок и найденных проблем.
- Форматы: Markdown, Word (`.docx`) и PDF; оформление по ГОСТ (поля, шрифт, нумерация рисунков «Рисунок N – …» и таблиц «Таблица N – …», как в `tools/lint-report.js`).
- Шаблоны документов (записка, спецификация, описание бизнес-процесса); вставка диаграммы как рисунка в нужной теме.
- Тесты: сборка по эталонам, структура `.docx`, линтер отчётов проходит. Вне задачи: редактор документов.

### T29 Трассируемость между диаграммами

**Цель.** Видно, что модели согласованы.

- Связи между диаграммами одного проекта: IDEF0 A0 ↔ A1, процесс ↔ данные (DFD) ↔ классы (UML) ↔ таблицы (ERD); связь по идентификатору или имени, явная и автоматически предложенная.
- Матрица трассировки (элемент × диаграмма), переход по связи двумя кликами, поиск «где используется».
- Проверки: связь на несуществующее, изменение имени ломает связь (предупреждение с предложением обновить), элемент без трассы.
- Хранение связей в проекте (код диаграммы остаётся источником правды), экспорт матрицы в Markdown и CSV. Тесты на согласованность и переименования.

### T30 Публикация и интеграции

**Цель.** Продукт живёт за пределами редактора.

- Ссылка для просмотра (только чтение, срок и отзыв ссылки), встраивание (SVG, `iframe` с политикой безопасности, oEmbed).
- Командная строка `dslkit render` (код в SVG, PNG, PDF; пакет с `bin`), действие GitHub для диаграмм в README (рендер при коммите), расширение VS Code (подсветка, предпросмотр).
- Требует сервер T04 для ссылок; права проверяются на сервере, ссылка не раскрывает чужие данные.
- Безопасность: очистка SVG, `iframe` только с `sandbox`, лимиты запросов к рендеру. Тесты и e2e. Вне задачи: публичный каталог плагинов.

### T31 Сравнение версий диаграмм и комментарии на холсте

**Цель.** Командная работа и ревью моделей.

- Визуальный diff двух версий (добавлено, удалено, изменено цветом и подписью), текстовый diff кода рядом; откат к версии.
- Комментарии, привязанные к элементу или области, ответы, статус «решено», упоминания пользователей; уведомления в приложении.
- Режим презентации (полноэкранный показ, переход по элементам, указка).
- Основа: версии и роли T04, совместная работа на Yjs (по решению об архитектуре диплома). Права: комментировать могут пользователи и выше, решать комментарии автор и редактор. Тесты на права и конфликты.

### T32 Описание для скринридеров и высокий контраст

**Цель.** Доступность, которой нет в большинстве аналогов.

- Автогенерация текстового описания диаграммы (структура, элементы, связи, число и порядок) для `aria-describedby` и экспорта alt-текста в SVG и HTML; краткий и подробный режимы, RU и EN.
- Навигация по диаграмме с клавиатуры и озвучивание элемента и его связей.
- Высококонтрастная тема (WCAG AAA для текста, границы не светлее 3:1) и учёт `prefers-contrast` и `forced-colors`.
- Проверка скринридером вручную (NVDA) и автоматикой (axe). Тесты на описание для всех нотаций.

### T33 Большие диаграммы

**Цель.** Масштаб без переписывания на C++.

- Разбор и раскладка в `WebWorker`, ввод не блокируется; виртуализация отрисовки (рисуются видимые узлы), упрощённый вид при отдалении.
- Цель: 5000 узлов без подвисания (отклик ввода меньше 100 мс, первая отрисовка не более 3 секунд на среднем ноутбуке); замеры в стенде и в отчёте метрик.
- Деградация: понятное сообщение и режим упрощения, если лимит превышен; отмена долгих расчётов.
- Тесты и замеры с эталонными большими диаграммами, проверки утечек памяти (`leaks.yml`).

### T34 Видимая аналитика качества

**Цель.** Доказательство для защиты и данные для улучшений.

- Страница «Точность автоматизации»: числа и графики из стенда T24 (определение нотации, построение, проверка), динамика между релизами, слабые места; данные из `docs/eval/baseline.json` и последнего прогона.
- Необязательная телеметрия только с явного согласия пользователя: события без содержимого диаграмм (какие подсказки приняты, ошибки), без персональных данных; отключение и удаление.
- Сбор ошибок интерфейса (без кода и текста пользователя). Тесты на согласие и отсутствие утечки содержимого.

### T35 Конфиденциальность и комплаенс

**Цель.** Требования реального продукта.

- Экспорт данных аккаунта (проекты, версии, журнал) и удаление аккаунта с подтверждением и сроком; политика конфиденциальности и пользовательское соглашение (RU и EN), согласие при регистрации.
- Двухфакторная защита на основе `auth/totp.js` (включение, коды восстановления, отключение), журнал аудита безопасных событий (вход, смена роли, экспорт, удаление).
- На сервере T04: удаление действительно удаляет, журнал не хранит секретов. Тесты на удаление и экспорт, негативные сценарии.

### T36 Справка и обучающие материалы

**Цель.** Снизить порог входа.

- Интерактивные уроки по каждой нотации (пошаговое задание и проверка результата правилами из T24), галерея примеров с пояснениями, быстрые подсказки по DSL, видео или анимации.
- Контекстная справка по нотации в редакторе (ссылка на справочник `DSL-REFERENCE`), поиск по справке.
- Тесты: каждый урок проходится, все ссылки справки рабочие; материалы RU и EN.

## EN

All eleven are extra tasks after the main chain. Each has an executor sub-chat, a `wip/…` branch, an independent reviewer and a merge after acceptance. Common criteria: tests first, `npm run verify` at 100% coverage, Edge e2e, both themes and languages, RU and EN docs, no `innerHTML` with foreign data, design tokens only, `npm run eval` not below baseline.

- **T26 Code generation and reverse engineering.** Forward: ERD to SQL DDL (PostgreSQL, SQLite) and ORM models (Sequelize, Prisma); UML classes to TypeScript; sequence diagram to OpenAPI. Backward: SQL and OpenAPI to diagrams; reuse `tools/http-to-postman.js`. Validate by notation rules before generating; preview and copy only, generated code is never executed; round-trip and executed-SQL tests.
- **T27 Process simulation.** Token animation for BPMN and Petri nets, cycle time, waiting, resource load and cost, Monte Carlo runs, bottleneck detection with a "why" explanation, side-by-side "what if" comparison with the T25 methods; correctness check first; step limit against loops.
- **T28 Documentation from diagrams.** Process description, element and requirement tables, findings; Markdown, Word and PDF in GOST layout (figure and table captions like `tools/lint-report.js`); document templates; tests against references.
- **T29 Traceability.** Links between diagrams (IDEF0 A0 to A1, process, data, classes, tables), trace matrix (Markdown, CSV), two-click navigation, "where used", broken-link and rename warnings; code stays the source of truth.
- **T30 Publishing and integrations.** View links (read-only, expiry, revoke), embedding (SVG, sandboxed `iframe`, oEmbed), CLI `dslkit render`, GitHub Action for README diagrams, VS Code extension; server-side rights (T04); sanitised SVG and request limits.
- **T31 Version diff and comments.** Visual and text diff of versions with rollback, comments on elements and areas with replies, resolved state and mentions, presentation mode; based on T04 versions and roles and Yjs collaboration.
- **T32 Screen-reader description and high contrast.** Generated text description (short and detailed, RU and EN) for `aria-describedby` and alt text, keyboard navigation with announcements, a high-contrast theme (AAA text, 3:1 borders) honouring `prefers-contrast` and `forced-colors`; NVDA and axe checks.
- **T33 Large diagrams.** `WebWorker` parsing and layout, render virtualisation and a simplified far view; target 5000 nodes with input response under 100 ms and first paint within 3 seconds; graceful degradation; leak checks.
- **T34 Quality analytics.** An "Automation accuracy" page from the T24 harness (numbers, trends, weak spots); optional consent-based telemetry without diagram content or personal data; UI error reporting; consent and no-leak tests.
- **T35 Privacy and compliance.** Account data export and deletion, privacy policy and terms (RU and EN) with consent, two-factor authentication on `auth/totp.js` with recovery codes, a security audit log; deletion really deletes; no secrets in logs.
- **T36 Help and learning.** Interactive lessons per notation checked by the T24 rules, an examples gallery with explanations, contextual notation help linked to `DSL-REFERENCE`, searchable help; every lesson passes and every link works; RU and EN.
