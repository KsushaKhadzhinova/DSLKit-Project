# Рисунки отчёта ПЗ2: что снято, что должна снять владелица

Единственное место, где ведётся этот список. Английская версия: [`SCREENSHOTS-TODO.en.md`](SCREENSHOTS-TODO.en.md).

## Что уже снято с настоящего сервера (рисунки 2, 3, 4, 13–18)

Скрипт `shots/shots.mjs` запускает сервер на портах 4230–4232, открывает страницы в окне браузера (Edge без окна) и сохраняет снимки. Адресной строки на таких снимках нет. Если нужен снимок с адресом, снимите заново вручную под тем же именем.

| Файл | Рисунок | Что видно |
|---|---|---|
| `error-404.png` | 2 | Страница 404 для адреса `/nope` |
| `error-429.png` | 3 | Страница 429 при пределе трёх запросов в минуту (`RATE_LIMIT_MAX=3`) |
| `error-500.png` | 4 | Страница 500 после удаления таблицы журнала под работающим сервером |
| `02-users-list.png` | 13 | `GET /api/users` в окне браузера |
| `03-user-one.png` | 14 | `GET /api/users/1` |
| `04-user-404.png` | 15 | `GET /api/users/999`, страница 404 |
| `05-user-400.png` | 16 | `GET /api/users/abc`, страница 400 |
| `06-diagrams-search.png` | 17 | `GET /api/diagrams?q=billing&sort=-title&page=1&limit=10` |
| `07-user-projects.png` | 18 | `GET /api/users/1/projects` |

## Что должна снять владелица (11 файлов-заглушек)

Эти файлы в `figures/` сейчас **заглушки**: оранжевая карточка с текстом «ЗАГЛУШКА» и меткой `dslkit-placeholder` внутри PNG. Это не снимки. Заменяйте файл под тем же именем. Когда заглушек не останется, добавьте в `report.meta.json` строку `"final": true`, и тест отчёта начнёт падать при любой заглушке. После замены запустите `node tools/docx-cli.js part-2/pz-02-rest-api` из корня репозитория (нужен Word для номеров страниц). Окно целиком, ширина не больше 1280 пикселей, высота не больше 60 % страницы (около 1380 пикселей), URL и результат должны быть видны.

Перед съёмкой Postman: `npm start` в `part-2/pz-02-rest-api` (порт 3000), импорт `postman_collection.json`, переменная `base` равна `http://localhost:3000/api`. После перезапуска сервера данные возвращаются к начальным, поэтому снимайте в порядке таблицы.

| Файл | Рисунок | Программа | Действие | Что должно быть видно |
|---|---|---|---|---|
| `owner-journal-table.png` | 1 | DB Browser for SQLite или DBeaver | открыть файл `journal.sqlite` рядом с сервером, выполнить `SELECT * FROM request_log ORDER BY id DESC LIMIT 15;` после нескольких запросов | столбцы `method`, `path`, `status`, `request_id`; строк `/health` нет |
| `owner-error-403.png` | 5 | Postman | `DELETE http://localhost:3000/api/projects/1`, заголовок `X-User-Id: 2` | код 403 и сообщение «You may not delete a project, only an administrator may», `requestId` |
| `owner-postman-get.png` | 6 | Postman | `GET http://localhost:3000/api/users` | 200, массив `data`, объект `meta` |
| `owner-postman-post.png` | 7 | Postman | `POST http://localhost:3000/api/diagrams`, Body raw JSON `{"title":"Billing schema","notation":"ERD","code":"invoice -> payment","projectId":1}` | 201, диаграмма со статусом `draft` |
| `owner-postman-put.png` | 8 | Postman | `PUT http://localhost:3000/api/users/2`, тело `{"name":"Alan T","email":"alan@example.com","role":"editor"}` | 200, пользователь с новым именем |
| `owner-postman-patch.png` | 9 | Postman | `PATCH http://localhost:3000/api/users/1`, тело `{"role":"editor"}` | 200, `"role":"editor"` |
| `owner-postman-delete.png` | 10 | Postman | `DELETE http://localhost:3000/api/diagrams/2` | 204 No Content, тела нет |
| `owner-postman-delete-409.png` | 11 | Postman | `DELETE http://localhost:3000/api/users/1` (у пользователя есть проект) | 409 Conflict |
| `owner-postman-validation.png` | 12 | Postman | `POST http://localhost:3000/api/users`, тело `{"name":"","email":"x"}` | 400, `validation_failed`, перечень `details` |
| `owner-console.png` | 19 | PowerShell | `npm start` в `part-2/pz-02-rest-api`, затем два запроса в браузере | строка «DSLKit REST API listens on http://localhost:3000/api» |
| `owner-tests.png` | 20 | PowerShell | `npm test` в `part-2/pz-02-rest-api` | конец вывода: `tests 176`, `pass 176`, `fail 0`, таблица покрытия 100 % |

Если число тестов в окне отличается от 176, поправьте число в тексте 3.10 (`report.tpl.md`, `report.en.tpl.md`) и пересоберите отчёт: `node tools/build.js part-2/pz-02-rest-api`.

## Как воспроизвести сбой журнала вручную (рисунок 4, если нужно переснять с адресной строкой)

```powershell
cd part-2/pz-02-rest-api
$env:JOURNAL_FILE='demo.sqlite'; $env:PORT=4210; node src/server.js
# в другом окне:
node tools/break-journal.mjs demo.sqlite
# открыть http://localhost:4210/api/users, затем вернуть таблицу:
node tools/break-journal.mjs demo.sqlite --restore
Remove-Item Env:JOURNAL_FILE
```

## Открытые вопросы, которые не закрывает отчёт

1. Тексты страниц ошибок в приложении английские (каталог `src/error-catalog.js`). В отчёте это сказано в 3.6. Если преподаватель потребует русские страницы, код ПЗ2 нужно менять отдельной задачей.
2. Номера рисунков сквозные («Рисунок N»), в образцах по разделам («Рисунок 3.1»). Правило 06 требует «Рисунок N», уточнить у преподавателя.
3. Ветка `pz22` и ссылка на репозиторий взяты из `report.meta.json`. Ветку создаёт владелица, в ходе этой задачи она не создавалась.
