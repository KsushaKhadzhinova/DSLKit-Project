# T03 Панель свойств блока и экспорт PlantUML/Mermaid / Block properties panel and text export

Агент: sonnet. Ветка: `feat/properties-panel-and-export` (из T02). Основа: коммит `1c97b807`.

## RU
**Цель.** Редактировать свойства выбранного блока в боковой панели, а диаграмму экспортировать в PlantUML и Mermaid.

**Требования.**
- Панель (`site/js/components/editor-properties.js`, `site/js/utils/node-properties.js`): выбор блока показывает название, тип, цвет, позицию `pos=XxY`; правка меняет код диаграммы (код остаётся единственным источником правды).
- Экспорт (`site/js/export/text-formats.js`): пункты меню «PlantUML» и «Mermaid»; для нотаций без соответствия понятное сообщение.
- Вывод через `textContent`, без `innerHTML` с чужими данными (строгая CSP).
- RU и EN строки интерфейса, клавиатурный доступ, подписи для скринридера.

**Тесты.** Модульные для утилит и экспорта (`labs/05-javascript-interactivity/export-text-formats.test.js` дополнить), покрытие 100%, e2e в Edge: выбрать блок, изменить цвет, экспортировать.

**Критерии готовности.** `npm run verify` зелёный; e2e пройден; описание в `docs/study/34-EDITOR-FEATURES.md` (RU и EN); PR влит; ветка `wip/…` затем удалена с согласия владельца.

**Вне задачи.** Импорт из PlantUML/Mermaid, новые нотации.

## EN
**Goal.** Edit the selected block's properties in a side panel and export diagrams to PlantUML and Mermaid.

**Requirements.** Panel changes the diagram code (code stays the single source of truth); export menu entries with a clear message for notations with no mapping; `textContent` output only; RU/EN strings, keyboard access, screen-reader labels.

**Tests.** Unit tests for utils and export, 100% coverage, e2e in Edge (select block, change colour, export).

**Done.** `verify` green; e2e passed; `docs/study/34-EDITOR-FEATURES.md` updated in RU and EN; PR merged; `wip/…` deleted only with the owner's consent.

**Out of scope.** Import from PlantUML/Mermaid, new notations.
