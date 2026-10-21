# Скриншоты, которые может снять только владелец (рабочий стол)

Всё, что можно снять браузером и скриптом, уже снято (`shots/shots.mjs` в каждой работе). Здесь остальное: окна Postman, VS Code, просмотрщик БД. Снимать настоящие окна, не рисовать. В отчётах такие рисунки сейчас отсутствуют, при желании добавить их в шаблоны `report.tpl.md` и `report.en.tpl.md` по правилам подписей и пересобрать `node tools/build.js part-2/<папка>`.

Перед съёмкой запустить сервер работы (`npm start` в папке, порт 3000). Для ЛР2 и ЛР3 сначала `npm run db:migrate` и `npm run db:seed`. Для ЛР3 задать `JWT_SECRET` (случайная строка от 32 символов), `ADMIN_EMAIL` и `ADMIN_PASSWORD` в окружении, не в репозитории.

| Работа | Рисунок | Что снять | Чем |
|---|---|---|---|
| ЛР1 | 10-postman-run | Окно Postman после запуска коллекции: все запросы зелёные, видны методы и коды | Импортировать `part-2/lab-01-node-server/postman_collection.json`, кнопка Run collection |
| ЛР1 | 11-vscode-rest-client | VS Code с открытым `requests.http` и панелью ответа справа (расширение REST Client) | Файл `part-2/lab-01-node-server/requests.http`, Send Request над запросом `POST` |
| ЛР1 | 12-nodemon | Терминал VS Code: `npm run dev`, затем правка файла и строка перезапуска nodemon | Команда `npm run dev` в папке работы |
| ЛР2 | 14-postman-run | Postman Run collection без красных запросов, видны 201, 409, 400 | `part-2/lab-02-sequelize/postman_collection.json` |
| ЛР2 | 15-db-viewer | Просмотрщик БД (DB Browser for SQLite или DBeaver) с таблицами Diagrams, Projects, RequestLogs и данными Diagrams | Файл `dev.sqlite` после `npm run db:migrate` и `npm run db:seed` в папке ЛР2 |
| ЛР2 | 16-neon-or-postgres | Консоль Neon или pgAdmin с теми же таблицами, если строка `DATABASE_URL` подключена в `.env` (по желанию) | `DATABASE_URL` в `.env` и `npm run db:migrate` |
| ЛР3 | 13-postman-auth | Postman: вход, копирование токена в Authorization (Bearer Token), ответ 200 на `GET /profile` | `part-2/lab-03-auth/postman_collection.json`, запросы Register и Login, затем Profile |
| ЛР3 | 14-postman-403 | Postman: ответы 403 постороннему пользователю и 200 администратору на `GET /users` | Та же коллекция, токены двух пользователей и администратора |
| ЛР3 | 15-db-users | Просмотрщик БД с таблицей Users: в столбце passwordHash видны хеши bcrypt, а не пароли | Файл `dev.sqlite` ЛР3 |
| ПЗ1 | 12-devtools-network | DevTools, вкладка Network: запрос `POST /add` со статусом 302 и заголовок `Set-Cookie` с токеном CSRF | Chrome, `http://localhost:3000/add?auth=1` |
| ПЗ2 | 14-postman-run | Postman Run collection для API без красных запросов | `part-2/pz-02-rest-api/postman_collection.json` |
| ПЗ2 | 15-postman-409 | Postman: ответ 409 на `DELETE /api/users/1` | Запрос из той же коллекции |
| ЛР4 | devtools-localstorage | DevTools, вкладка Application: панель localStorage с сохранёнными данными | Chrome, `npm run dev` в `part-2/lab-04-react-state` (порт 5175) |
| ЛР4 | react-devtools-components | React DevTools, вкладка Components с деревом компонентов | Расширение React DevTools, та же страница |
| ЛР4 | tab-title | Заголовок вкладки браузера с числом диаграмм | Та же страница |
| ПЗ3 | address-bar | Окно браузера с видимой адресной строкой на странице каталога с фильтром `?q=&sort=` | `part-2/pz-03-routing`, порт 5176 |
| ПЗ3 | devtools-network-chunk | DevTools, вкладка Network: загрузка чанка «ленивой» страницы при переходе | Та же страница |
| ПЗ4 | react-devtools-context | React DevTools: дерево контекстов (данные и dispatch) | `part-2/pz-04-context-reducer`, порт 5177 |
| ПЗ4 | react-devtools-profiler | React DevTools Profiler: перерисовки (может не собрать данные, см. `tools/evidence/README.md`) | Та же страница |
| ЛР6 | postman-collection | Postman: запуск коллекции (GET, POST, PATCH, DELETE) | `part-2/lab-06-mongodb/postman_collection.json` |
| ЛР6 | compass-collection | MongoDB Compass: коллекция диаграмм с документами | `MONGODB_URI` в `.env` |
| ЛР6 | compass-indexes | MongoDB Compass: вкладка Indexes (текстовый индекс по названию и коду) | Та же база |
| ЛР6 | compass-requestlogs | MongoDB Compass: коллекция `requestlogs` | Та же база |
| ЛР6 | atlas-cluster | Консоль MongoDB Atlas: кластер, если строка Atlas подключена | Atlas, по желанию |

Страница 500 ПЗ1 и ответы 500 ЛР2 и ЛР3 уже сняты по настоящему сбою. У ПЗ2 данные лежат в памяти, настоящего сбоя нет, поэтому рисунка 500 там нет.
