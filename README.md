# DSLKit

Веб-IDE для диаграмм как кода: пишите текст на DSL и сразу получайте диаграмму. Проект курса «Интернет-технологии и веб-программирование», тематика связана с дипломным проектом БГУИР.

## Для продолжения работы

Новому ИИ-ассистенту: сначала [`docs/AI-INSTRUCTIONS.md`](docs/AI-INSTRUCTIONS.md) и [`docs/SESSION-LOG.md`](docs/SESSION-LOG.md). Затем [`docs/CONTEXT.md`](docs/CONTEXT.md) (правила, договорённости, ловушки среды), затем [`docs/HANDOVER-LABS.md`](docs/HANDOVER-LABS.md) (статус всех лабораторных и практических, что осталось, следующий шаг). Условия работ лежат в [`materials/`](materials/README.md), архив по дизайну в [`docs/project/`](docs/project/). Актуальная ветка `main`; незавершённая работа в ветках `feature/*`.

## Технологии

- HTML5, CSS3 (БЭМ, CSS-переменные, Flexbox, Grid), JavaScript ES2022
- Node.js 24, npm, nodemon, Prettier
- Тесты: встроенный раннер Node.js, jsdom, html-validate, stylelint, Playwright
- Макеты: Figma

## Ссылки

- Репозиторий: https://github.com/KsushaKhadzhinova/DSLKit-Project
- Макет Figma: https://www.figma.com/design/HYmcqqGdcszOt7dGnKrvZg/bsuir-diploma

## Запуск

```bash
npm install
npm run dev
npm test
npm run check:env
```

Сайт открывается на http://localhost:5173, при изменении файлов в `site/` сервер перезапускает nodemon.

## Структура

- `site/` сайт (`index.html`, `css/`, `js/`, `assets/`, `images/`, `design/`)
- `labs/` лабораторные работы с отчётами на русском и английском языках
- `tools/` статический сервер, сборка и проверка отчётов

## Project

DSLKit is a web IDE for diagrams as code. See the Russian sections above for commands: `npm install`, `npm run dev`, `npm test`.
