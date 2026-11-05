# DSLKit

Веб-IDE для диаграмм как кода: пишите текст на DSL и сразу получайте диаграмму. Проект курса «Интернет-технологии и веб-программирование», тематика связана с дипломным проектом БГУИР.

## Для продолжения работы

Состояние проекта, правила работы, карта веток и план собраны в [`docs/PROJECT-STATE.md`](docs/PROJECT-STATE.md) (английская версия `docs/PROJECT-STATE.en.md`). Разборы работ для защиты лежат в [`docs/study/`](docs/study/README.md). Установленные навыки для ИИ-агентов (Accelerator) описаны в [`docs/ACCELERATOR.md`](docs/ACCELERATOR.md) (английская версия `docs/ACCELERATOR.en.md`).

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

## Состав проекта: все работы в одном репозитории

Часть 1, сайт DSLKit (папка `site/`, лабораторные в `labs/`):

| Работа | Папка |
| --- | --- |
| ЛР 1. Сетевой анализ | [`labs/01-network`](labs/01-network/README.md) |
| ЛР 2. Окружение | [`labs/02-environment`](labs/02-environment/README.md) |
| ЛР 3. Семантическая разметка | [`labs/03-semantic-markup`](labs/03-semantic-markup/README.md) |
| ЛР 4. Адаптивный CSS | [`labs/04-responsive-css`](labs/04-responsive-css/README.md) |
| ЛР 5. Интерактивность на JavaScript | [`labs/05-javascript-interactivity`](labs/05-javascript-interactivity/README.md) |
| ЛР 6. Асинхронность, API, хранилище | [`labs/06-async-api-storage`](labs/06-async-api-storage/README.md) |
| ЛР 7. React-компоненты | [`labs/07-react-components`](labs/07-react-components/README.md), приложение [`react-app`](react-app/README.md) |
| ЛР 8. Тестирование фронтенда | [`labs/08-frontend-testing`](labs/08-frontend-testing/README.md) |

Часть 2, серверная (папка `part-2/`). Рядом с кодом каждой работы лежат отчёты `report.md` и `report.en.md`; для ЛР 2-8 также PDF-отчёт.

| Работа | Папка |
| --- | --- |
| ЛР 1. Сервер на Node.js | [`part-2/lab-01-node-server`](part-2/lab-01-node-server/README.md) |
| ЛР 2. БД и Sequelize | [`part-2/lab-02-sequelize`](part-2/lab-02-sequelize/README.md) |
| ЛР 3. Аутентификация | [`part-2/lab-03-auth`](part-2/lab-03-auth/README.md) |
| ЛР 4. Состояние в React | [`part-2/lab-04-react-state`](part-2/lab-04-react-state/README.md) |
| ЛР 5. React и API | [`part-2/lab-05-react-api`](part-2/lab-05-react-api/README.md) |
| ЛР 6. MongoDB | [`part-2/lab-06-mongodb`](part-2/lab-06-mongodb/README.md) |
| ЛР 7. WebSocket | [`part-2/lab-07-websocket`](part-2/lab-07-websocket/README.md) |
| ЛР 8. Docker | [`part-2/lab-08-docker`](part-2/lab-08-docker/README.md) |
| ПЗ 1. Middleware и EJS | [`part-2/pz-01-middleware-ejs`](part-2/pz-01-middleware-ejs/README.md) |
| ПЗ 2. REST API | [`part-2/pz-02-rest-api`](part-2/pz-02-rest-api/README.md) |
| ПЗ 3. Маршрутизация | [`part-2/pz-03-routing`](part-2/pz-03-routing/README.md), Router v6 [`part-2/pz-03-routing-v6`](part-2/pz-03-routing-v6/README.md) |
| ПЗ 4. Context и reducer | [`part-2/pz-04-context-reducer`](part-2/pz-04-context-reducer/README.md) |
| Курсовой проект | [`course-project`](course-project/README.md) |
| Тестирование по Куликову | [`testing-course`](testing-course/README.md) |

### Один docker compose на все работы

Файл [`docker-compose.yml`](docker-compose.yml) в корне запускает любую часть проекта по профилю. Секреты берутся из файла `.env` (образец `.env.example`), в репозиторий он не попадает.

```bash
cp .env.example .env
docker compose --profile site up -d             # сайт части 1
docker compose --profile db up -d               # PostgreSQL для ЛР 2 и 3
docker compose --profile mongo up -d            # MongoDB для ЛР 6
docker compose --profile lab8 up -d --build     # ЛР 8: БД, бэкенд, фронтенд
docker compose --profile course up -d --build   # курсовой проект
```

Состояние проверки: файл `docker-compose.yml` проходит `docker compose config` для всех профилей; сборка образов и запуск контейнеров в этой сборке ещё не проверялись.
## English: all works in one repository

See the Russian section above for the full table of works. Part 1 labs are in `labs/`, the server part in `part-2/` (labs 1-8 and practical works 1-4), the course project in `course-project/`, the testing course in `testing-course/`. Every work keeps its report next to the code (`report.md`, `report.en.md`, PDF for labs 2-8).

One `docker-compose.yml` in the root starts any part by profile (`site`, `db`, `mongo`, `lab8`, `course`); secrets come from `.env` (copy `.env.example`). The file passes `docker compose config` for all profiles; building the images and starting the containers have not been verified in this assembly.
