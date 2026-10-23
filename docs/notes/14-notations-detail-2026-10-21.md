# Подробности по нотациям редактора (приложение к `13-handover-2026-10-21.md`)

Состояние: ветка `work/part1-finish`, `npm test` зелёный, 525 тестов, покрытие 100 %.

## 1 Архитектура

Поток данных: исходный текст из редактора → `parseDiagram(source)` (`site/js/notations/index.js`) → модель `{ notation, kind, title, problems[], ... }` → (а) панель проблем (`problems-panel.js`, тексты из `messages.js`, RU и EN), (б) генератор текста `generate(model, format)` для Kroki и других движков, (в) локальный SVG-рендерер `renderNotation(model)` (его вызывает `site/js/engines/local-engine.js`).

- **Заголовок.** Первая значащая строка: `diagram <нотация> ["Заголовок"]`; для UML вид идёт вторым словом (`diagram uml class "Shop"`) или одним ключом (`diagram uml-class`). Ошибки заголовка: `header-unknown`, `header-kind`, `header-kind-unknown`, `header-extra` (лишнее слово). Без заголовка источник читается как IDEF0 с предупреждением `no-header`; старый разбор `parseDsl` в `dataParser.js` не менялся (добавлены только `boxLines` и `arrowLines`).
- **Реестр.** Объект `NOTATIONS` в `index.js`: ключ → `{ short, name{ru,en}, parse, generators{graphviz|mermaid|plantuml}, render }`. Ключи (27): `idef0 idef1 idef1x idef3 idef4 idef5 dfd erd bpmn petri gost graph dag uml-class uml-object uml-component uml-composite uml-deployment uml-package uml-profile uml-usecase uml-activity uml-state uml-sequence uml-communication uml-timing uml-overview`.
- **Формат вывода.** `pickFormat(model, wanted)`: нужный формат, а если нотация его не умеет, первый из `plantuml`, `mermaid`, `graphviz`, который она поддерживает (так тайминг уходит на PlantUML, а графы только на DOT и Mermaid).
- **Общие функции** (`common.js`): `sourceLines` (номера строк, пропуск пустых и `//`), `parseHeader`, `problem(line, severity, code, params)`, `parseAttrs` (`key=value` и флаги), `findCycle`, `wrap`, `escapeXml` (вырезает управляющие символы, включая NUL), `quoteDot`.
- **Серьёзность.** `error` блокирует Run; `warning` и `info` показываются, но не блокируют. Проблемы сортируются по номеру строки.
- **Ключевые слова** для подсветки: `KEYWORDS` в `templates.js` (около 100 слов). Образцы-шаблоны на каждую нотацию: `TEMPLATES` там же, все без ошибок.
- **Файлы** (строк): `specs.js` 465 (activity, bpmn, dfd, gostFlow, idef3, petri, state, usecase), `specs-uml.js` 334 (communication, component, composite, deployment, idef5, object, overview, packages, profile), `graphs.js` 364 (graph, dag, Дейкстра, остов, топологический порядок, критический путь), `er.js` 339 (erd, idef1, idef1x), `class.js` 228 (UML class и IDEF4), `sequence.js` 106, `timing.js` 82, `idef0.js` 45, `idef0-render.js` 108, `svg.js` 231 (общие примитивы рисования), `templates.js` 352, `messages.js` 267.

## 2 Грамматика и проверки по нотациям

Образцы с точным синтаксисом: `site/js/notations/templates.js`. Ниже краткая сводка того, что читают разборщики, и что они проверяют (это описание по коду и отчёту помощника, полный аудит по стандартам не завершён).

- **IDEF0:** `box A1 "Имя" { input|control|output|mechanism: Текст }`, `arrow A1.output -> A2.input`. Номер блока `A-0` или `A1…`. Проверки: `idef0-id`, `idef0-arrow-from` (стрелка выходит только из output), `idef0-arrow-to` (входит в input, control или mechanism), `idef0-no-output`, `idef0-no-control`, `idef0-context` (в A-0 один блок), `idef0-count` (на декомпозиции от 3 до 6 блоков, предупреждение).
- **IDEF1 и ERD:** `entity X { поле: тип pk|fk|unique [-> Y] }`, `relationship A 1:N B "глагол"` (`1:1`, `1:N`, `N:M`). Проверки: сущность без первичного ключа, ссылки FK и связей на несуществующие сущности, дубликаты, изолированные сущности.
- **IDEF1X:** то же плюс `entity X dependent {…}`, `identifying A -> B "имя" [P]`, `nonidentifying`, `nonspecific`, `category Родитель complete|incomplete дискриминатор: Потомок1, Потомок2`. Проверки: миграция FK в зависимую сущность, у зависимой должен быть идентифицирующий родитель, категории ссылаются на существующие сущности.
- **IDEF3:** `uob id "Имя"`, `and|or|xor id` (соединители), `referent id "Имя"`, `precedence A -> B`, `relational A -> B`, `objectflow`. Проверки: парность соединителей (разветвление и слияние), достижимость, висячие элементы.
- **IDEF4:** разбор UML class с предупреждениями `idef4-construct` для интерфейсов и реализации. **IDEF5:** `kind`, `individual`, `process`, `isa`, `partof`, `instanceof`, `relation A -> B "имя"`; проверка циклов в `isa` и `partof`.
- **DFD:** `entity`, `process N "Имя"`, `store Dn "Имя"`, `flow A -> B "метка"`. Проверки: `dfd-no-process` (хотя бы один конец потока процесс), `dfd-unlabelled`, `dfd-miracle` и чёрная дыра (процесс только со входами или только с выходами).
- **BPMN:** `start`, `end`, `intermediate`, `task`, `exclusive|parallel id ["Имя"]`, `flow A -> B ["метка"]`. Проверки: ровно один старт, минимум один конец, недостижимые узлы, поток из конечного события, шлюзы. Пулы и дорожки не реализованы.
- **Сети Петри:** `place`, `transition`, `arc a -> b [weight=N]`. Проверка двудольности (дуга только место и переход). Игра фишек: `initialMarking`, `enabledTransitions`, `fire`, `isDeadlock` экспортируются из `index.js` и покрыты тестами, в интерфейсе пока не вызываются.
- **Блок-схемы ГОСТ 19.701-90 и 19.003-90:** символы терминатор, процесс, решение, предопределённый процесс, ввод-вывод, подготовка, ручной ввод, документ, соединитель, межстраничный соединитель, носитель данных, комментарий; рёбра `flow`. Проверки: один старт, минимум один конец, у решения не меньше двух подписанных ветвей (Да и Нет), нет тупиков и недостижимых блоков, соединители парные. Стрелки рисуются только на обратных потоках, как требует ГОСТ. Отдельный символ данных не реализован.
- **Графы:** режим ориентированный или неориентированный, `vertex id ["имя"]`, `edge A -> B [weight=N]`. В панель проблем выводятся: число вершин и рёбер, степени, компоненты связности, циклы, дерево, DAG, двудольность, матрица смежности, кратчайший путь (Дейкстра), остов, топологический порядок. Проверки: концы рёбер существуют, веса числовые.
- **DAG:** узлы с длительностью, рёбра зависимостей. Проверка ацикличности с выводом пути цикла и номерами строк; вывод: топологический порядок, слои, корни, листья, критический путь и его длина, избыточные транзитивные рёбра.
- **UML, все 14 видов.** Class: `class X { +поле: Тип / +метод(арг): Тип }`, связи в стиле PlantUML (`--|>` обобщение, `..|>` реализация, `*--` композиция, `o--` агрегация, `-->` ассоциация, `..>` зависимость, кратности `A "1" --> "*" B : метка`). Sequence: `participant`, `actor`, `A -> B : текст`. Timing: `mode`, `at`. Остальные виды через свои ключевые слова: `usecase include extend generalize`; `action decision merge fork join initial final`; `state`; `object`; `component provide require delegate`; `classifier part port connect`; `node device environment artifact deploy communicate`; `package element contains import access`; `profile metaclass stereotype`; `interaction lifeline message`. Проверки ссылок и допустимых видов связей по виду диаграммы.

## 3 Экспорт

Нативный синтаксис: Mermaid `classDiagram`, `erDiagram`, `stateDiagram-v2`, `sequenceDiagram`; PlantUML class, entity, state, sequence. Приближение через flowchart или DOT: BPMN, activity, use case, component, deployment, package, IDEF3, DFD, сети Петри. Только PlantUML: timing. Только DOT и Mermaid: graph. Готовых генераторов BPMN XML, XMI и SQL DDL нет (в `docs/project/PROJECT-OVERVIEW.md` они названы целью экспорта MVP).

## 4 Что изменено в остальном коде

- `site/app/editor.html` и `site/en/app/editor.html`: `<select>` выбора нотации с шаблоном на каждую из 27; три прежние кнопки шаблонов остались. `site/css/editor.css`: одно небольшое правило.
- `site/js/components/editor.js`, `diagram-runner.js`: переведены на `parseDiagram`; панель проблем, строка статуса, мобильный баннер, счётчики, маркеры ошибок в тексте, блокировка Run при ошибках. B2: при непригодном SVG локального движка показывается сообщение.
- `site/js/storage/localStorage.js` (B3, B4), `site/js/api/apiService.js` (B5), `site/js/utils/dataParser.js` (B1 и защита от квадратичного разбора).
- `site/js/engines/engines.js`: автоматический откат между Kroki-движками, если нотацию не поддерживает выбранный формат.

## 5 Тесты

`npm test` в корне: 525 тестов, покрытие 100 % строк, ветвей и функций. Файлы в `labs/06-async-api-storage/`: `notations-core` (заголовок, IDEF0, графы), `notations-validate` (правила проверок), `notations-output` (генераторы и рендереры), `notations-extra`, `notations-icom` (стрелки ICOM), `negative` (53 «ломающих» случая: пустой ввод, 1 МБ, управляющие символы, `__proto__`, XSS в названиях, битый JSON в хранилище, сбои сети), старые `api-service`, `diagram-runner`, `engines`, `i18n`, `storage-parser`, `report`. Отчёты ЛР3, ЛР5 и ЛР6 встраивают исходники как листинги: после правки кода пересобирать `node tools/build.js labs/<папка>`, иначе падают тесты отчётов.

## 6 Как работали в этой сессии

- Рутинную работу владелец просит поручать лёгким помощникам, по одному, результат проверять самому.
- Агенты нотаций и аудита остановлены по просьбе владельца; аудит результата не вернул.
- Требование владельца: коммитить после каждого завершённого блока при зелёных тестах.
- Правило «показать изменения интерфейса скриншотами на трёх размерах и получить согласие» в этой сессии не выполнено: селектор нотаций в редакторе добавлен без показа, его нужно показать владельцу.

## 7 Известные дефекты и риски

- Простая послойная раскладка: длинные рёбра могут проходить через узлы, на больших графах и DAG возможны наложения.
- Кратности классов UML слиты с подписью ребра, а не нарисованы у концов.
- Составная структура и пакеты плоские: владение выражено атрибутами `of=`, `in=`, `contains`, вложенность не рисуется.
- Мобильная раскладка списка проблем при множестве ошибок глазами не проверялась; отрисовка нотаций проверена только тестами.
- Подсветка и автодополнение для 27 нотаций сводятся к общему списку ключевых слов.
- Лендинг: заголовок «Шесть нотаций в одном редакторе», карточки только шести нотаций и список нотаций в `validation.js` (форма бета-листа) не обновлены и теперь неточны.
- Английский редактор: ссылки ведут на русские страницы, нет переключателя языка.
- `hawkscan` не запускался (нет `HAWK_API_KEY`). Внешних движков с отправкой кода третьим сторонам пока нет; при добавлении нужно показать явное предупреждение.

## 8 Первые команды следующего диалога

```bash
git status --short
git log --oneline -8
npm test
node tools/serve.js site 5173
```

Дальше по порядку из раздела 6 файла `13`: довести ICOM, добавить движки, обновить лендинг, дорожки BPMN и вложенность UML, независимый аудит нотаций и дотошный проход по всему приложению, скриншоты на трёх размерах владельцу, слияние и push только после её «да».
