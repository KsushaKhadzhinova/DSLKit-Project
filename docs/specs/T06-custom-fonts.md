# T06 Собственные шрифты / Custom fonts

Агент: sonnet. Ветка: `feat/custom-fonts`.

## RU
**Цель.** Выбор шрифта для диаграмм и интерфейса, плюс загрузка собственного шрифта.

**Требования.**
- Список встроенных шрифтов (локальные файлы, без внешних CDN: строгая CSP и офлайн-кэш).
- Загрузка своего файла (`woff2`, `woff`, `ttf`, `otf`) с проверкой типа и размера, хранение в IndexedDB; удаление; применение к диаграмме и в экспорте SVG/PNG (встраивание в SVG).
- Service worker кэширует локальные шрифты, не чужие адреса.
- Учесть лицензии: список встроенных шрифтов с лицензией в `docs/`; предупреждение при загрузке чужого файла.
- RU/EN интерфейс, откат к шрифту по умолчанию при ошибке файла.

**Тесты.** Валидация файла, хранение, применение, экспорт; 100% покрытия; e2e в Edge.

**Критерии готовности.** `verify` зелёный; экспорт содержит шрифт; PR влит.

## EN
**Goal.** Pick a font for diagrams and UI, and upload a custom font.

**Requirements.** Built-in local fonts (no external CDNs); upload `woff2/woff/ttf/otf` with type and size checks, stored in IndexedDB, deletable, applied to the canvas and embedded in SVG/PNG export; service worker caches local fonts only; licence list in `docs/`; RU/EN UI; fallback to default on a bad file.

**Tests.** File validation, storage, application, export; 100% coverage; e2e in Edge.

**Done.** `verify` green; export carries the font; PR merged.
