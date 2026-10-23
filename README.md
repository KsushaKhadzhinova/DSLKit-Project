# DSLKit

Веб-IDE для диаграмм как кода: пишите текст на DSL и сразу получайте диаграмму. Проект курса «Интернет-технологии и веб-программирование», тематика связана с дипломным проектом БГУИР.

## Для продолжения работы

Состояние проекта, правила работы, карта веток и план собраны в [`docs/PROJECT-STATE.md`](docs/PROJECT-STATE.md) (английская версия `docs/PROJECT-STATE.en.md`). Разборы работ для защиты лежат в [`docs/study/`](docs/study/README.md).

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
