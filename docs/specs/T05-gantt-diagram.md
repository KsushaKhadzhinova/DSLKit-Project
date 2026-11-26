# T05 Диаграмма Ганта / Gantt chart

Агент: sonnet. Ветка: `feat/gantt`. Начинать после слияния T03 (общие файлы редактора).

## RU

**Цель.** Новая нотация «Гант» в редакторе.

**Требования.**

- Синтаксис DSL (по образцу `docs/DSL-REFERENCE.md`): задачи, даты начала и конца или длительность, зависимости, вехи, группы.
- Отрисовка собственным движком в браузере (без внешнего сервиса): шкала времени, полосы, стрелки зависимостей, светлая и тёмная темы.
- Проверка ввода: цикл зависимостей, конец раньше начала, неизвестная задача дают понятную ошибку со строкой.
- Пример в шаблонах, пункт в списке нотаций, экспорт SVG/PNG как у остальных; RU/EN подписи.

**Тесты.** Разбор DSL, раскладка, ошибки, 100% покрытия; e2e в Edge.

**Критерии готовности.** `verify` зелёный; описание в `docs/DSL-REFERENCE.md` и `.en.md`; число нотаций в документах обновлено; PR влит.

## EN

**Goal.** A new "Gantt" notation.

**Requirements.** DSL syntax (tasks, start/end or duration, dependencies, milestones, groups); in-browser render engine with timeline, bars, dependency arrows, both themes; validation errors with line numbers (cycles, end before start, unknown task); template, notation list entry, SVG/PNG export, RU/EN labels.

**Tests.** Parser, layout, errors at 100% coverage; e2e in Edge.

**Done.** `verify` green; `DSL-REFERENCE` (both languages) updated; notation counts updated; PR merged.
