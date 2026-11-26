# T25 Поддержка решений: таблицы решений (DMN) и методы выбора / Decision support: decision tables (DMN) and choice methods

Ветка исполнителя: `wip/decision-support`, затем `feat/decision-support` после приёмки. Работает после этапа 0 задачи T24 (стенд) и независимо от него по файлам: `site/js/decision/`, новая нотация таблиц решений.

## RU

### Цель

Расширить модуль поддержки решений (`site/js/decision/`: взвешенная сумма, AHP, TOPSIS, чувствительность) и добавить таблицы решений (DMN) как нотацию редактора с проверкой правильности.

### 1. Таблицы решений (DMN)

- Нотация «Таблица решений»: условия (входы), действия (выходы), правила в строках, политика срабатывания (единственное, первое, приоритет, любое, собрать), значения с диапазонами и перечислениями.
- Проверка: полнота (все сочетания входов покрыты), пересечения (два правила срабатывают на одни входы при политике «единственное»), противоречия, избыточные и недостижимые правила, неверные типы и диапазоны; у каждого замечания строка и предложение исправления.
- Вычисление: подставить входы и получить результат с объяснением, какое правило сработало.
- Связи: вывод таблицы из базы знаний экспертной системы (`site/js/expert/`) и обратно; экспорт в DMN XML и Markdown, импорт простого DMN XML; вставка таблицы как узла решения в BPMN (связь по имени).
- Отрисовка собственным движком, обе темы и языка.

### 2. Больше методов выбора

- ELECTRE или PROMETHEE (outranking), граница Парето (какие варианты не доминируются), максимин и ожидаемая ценность для дерева решений.
- Устойчивость рейтинга при неопределённости весов: Монте-Карло по диапазонам весов, доля прогонов, где побеждает каждый вариант, диаграмма устойчивости.
- Групповой AHP: несколько экспертов (на сервере T04 или ввод нескольких матриц), агрегирование среднее геометрическое, согласованность группы и по каждому эксперту.
- Рекомендация метода по задаче (число критериев, тип оценок, неопределённость) с объяснением «почему этот метод».
- Каждый метод проверяется на известных примерах из литературы (эталонные значения в тестах) и свойствами (нормировка, инвариантность к масштабу).

### 3. Интеграция

Результат любого метода можно вставить в диаграмму или дерево решений (`toDsl`), записать в журнал решений (T24, этап 5), экспортировать в Markdown; все строки RU и EN.

### Тесты и готовность

Сначала тесты; эталонные примеры по каждому методу; `npm run verify` с покрытием 100%; e2e в Edge; документы RU и EN (справочник DSL, разбор); независимый проверяющий; PR после приёмки.

### Вне задачи

Полный стандарт DMN (FEEL-выражения), сервер совместной оценки (T04 даёт хранение).

## EN

### Goal

Extend the decision support module (weighted sum, AHP, TOPSIS, sensitivity) and add decision tables (DMN) as an editor notation with correctness checks.

### 1. Decision tables (DMN)

A "Decision table" notation: conditions (inputs), actions (outputs), rules as rows, hit policy (unique, first, priority, any, collect), ranges and enumerations. Checks: completeness, overlaps under the unique policy, contradictions, redundant and unreachable rules, wrong types and ranges; each finding has a line and a fix suggestion. Evaluation with an explanation of which rule fired. Links: derive a table from the expert-system knowledge base and back; export DMN XML and Markdown, import simple DMN XML; place a table as a decision node in BPMN. Own render engine, both themes and languages.

### 2. More choice methods

ELECTRE or PROMETHEE, Pareto front, maximin and expected value for decision trees; rank robustness under weight uncertainty (Monte Carlo over weight ranges, share of runs each alternative wins, a stability chart); group AHP (several experts, geometric-mean aggregation, group and per-expert consistency); a method recommendation by task with a "why this method" explanation. Each method is tested on known textbook examples and by properties (normalisation, scale invariance).

### 3. Integration

Any result can be inserted into a diagram or decision tree (`toDsl`), logged in the decision log (T24 phase 5), exported to Markdown; all strings in RU and EN.

### Tests and done

Tests first; reference examples per method; `npm run verify` at 100% coverage; e2e in Edge; RU and EN docs; independent reviewer; PR after acceptance. **Out of scope:** the full DMN standard (FEEL), a server for joint scoring (T04 provides storage).
