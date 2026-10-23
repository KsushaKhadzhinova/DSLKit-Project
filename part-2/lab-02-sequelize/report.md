# Лабораторная работа №2. Работа с базами данных и ORM Sequelize

## 1 Цель работы

Освоить подключение реляционной базы данных к Node.js-приложению, использование ORM Sequelize для описания моделей и выполнения CRUD-операций, миграции и сиды. Работа продолжает лабораторную работу 1 для проекта DSLKit, веб-редактора диаграмм как кода, тематика которого соответствует направлению SaaS: коллекция `diagrams` переезжает из массива в памяти в базу данных.

## 2 Краткие теоретические сведения

**ORM.** Object-Relational Mapping связывает таблицы реляционной базы с объектами языка. Модель Sequelize описывает таблицу и её колонки, а методы `findAll`, `findByPk`, `create`, `update` и `destroy` превращаются в запросы SQL. Преимущества: код не зависит от диалекта SQL, значения подставляются безопасно, а проверки лежат рядом с моделью. Недостатки: сложные запросы приходится выражать через API библиотеки, а скрытые запросы можно не заметить.

**Миграции и сиды.** Миграция это файл с двумя функциями: `up` меняет схему, `down` отменяет изменение. Применённые миграции записываются в служебную таблицу, поэтому схема воспроизводится на любом компьютере одной командой и меняется по шагам. Сид заполняет таблицы начальными данными и тоже имеет `up` и `down`.

**Диалекты.** Sequelize работает с PostgreSQL, SQLite, MySQL и другими базами через драйверы. Для PostgreSQL нужны пакеты `pg` и `pg-hstore`, для SQLite пакет `sqlite3`. Строка подключения `DATABASE_URL` позволяет направить приложение на облачный сервис, например Neon или Supabase, не меняя код.

## 3 Ход работы

### 3.1 База данных

Основной базой работы выбран PostgreSQL. Локальный сервер поднимается командой `docker compose up -d db` из файла `docker-compose.yml`, строка подключения лежит в переменной `DATABASE_URL` файла `.env`. Выбор делает файл `config/config.js`. Если задана переменная `DATABASE_URL`, используется PostgreSQL (при `DATABASE_SSL=true` включается TLS для Neon и Supabase с проверкой сертификата сервера, отключить проверку можно только переменной `DATABASE_SSL_REJECT_UNAUTHORIZED=false`). Если задана только переменная `SQLITE_STORAGE`, используется файл SQLite, так работают автоматические тесты на временной базе. Если не задано ничего, команды сообщают, что нужно задать. Миграции, модель и контроллеры от диалекта не зависят. Миграции и сид выполнены на настоящем PostgreSQL 16 в контейнере: таблицы создаются с ограничениями `CHECK` и внешними ключами, список, фильтр и поиск отвечают так же, как на SQLite. Образец переменных лежит в `.env.example`, сам `.env` в репозиторий не попадает.

### 3.2 Установка и настройка

Установлены пакеты `sequelize`, `pg`, `pg-hstore`, `sqlite3` и, как зависимость разработки, `sequelize-cli`. Файл `.sequelizerc` указывает инструменту каталоги `migrations` и `seeders` и файл настроек, поэтому команды `npx sequelize-cli` работают с теми же параметрами подключения, что и приложение. В `package.json` добавлены скрипты `db:migrate`, `db:migrate:undo`, `db:seed`, `db:seed:undo` и `db:reset`.

### 3.3 Модель и миграции

Модель `Diagram` описана в `src/models/diagram.js`: поля `title`, `notation`, `sourceCode`, `priority`, `owner`, числовое `revision` и внешний ключ `projectId`, а Sequelize сам добавляет `id`, `createdAt` и `updatedAt`. Допустимые значения `notation` и `priority` заданы проверкой `isIn` в модели и ограничениями `CHECK` в миграциях, поэтому база не примет значение вне списка, даже если обойти и запрос, и модель. Длины совпадают с типами колонок: `title` до 80 символов, `owner` до 60, `sourceCode` до 10000, а перед сохранением `title` и `owner` обрезаются по краям. Идентификатор в адресе не может превышать 2147483647, иначе PostgreSQL ответил бы ошибкой 500. Размер тела запроса ограничен значением 100kb. Имя таблицы Sequelize получает из имени модели во множественном числе, то есть `Diagrams`.

Схема создаётся только миграциями, метод `sync()` не используется. Первая миграция создаёт таблицу без поля `priority`, вторая добавляет его вызовом `addColumn` со значением по умолчанию `normal`, а её функция `down` удаляет колонку. Так показано изменение схемы существующей таблицы, как требует условие. Третья миграция создаёт журнал запросов, четвёртая добавляет числовую колонку `revision`, пятая создаёт таблицу `Projects` и колонку `projectId`. Файлы миграций перечислены в таблице 1.

Таблица 1 – Файлы базы данных

| Файл                                                    | Назначение                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `migrations/20261016000001-create-diagrams.js`          | Создаёт таблицу Diagrams с колонками id, title, notation, sourceCode, owner, createdAt, updatedAt |
| `migrations/20261016000002-add-priority-to-diagrams.js` | Добавляет колонку priority, откат удаляет её                                                      |
| `migrations/20261016000004-add-revision-to-diagrams.js` | Добавляет колонку revision с проверкой от 0 до 100000, откат удаляет её                           |
| `migrations/20261016000005-create-projects.js`          | Создаёт таблицу Projects с уникальным именем и колонку projectId со ссылкой на неё                |
| `seeders/20261016000001-demo-diagrams.js`               | Вставляет три демонстрационные диаграммы, откат удаляет их по названию                            |
| `src/models/diagram.js`                                 | Модель Sequelize                                                                                  |
| `src/models/index.js`                                   | Создание подключения и модели по настройкам                                                       |

### 3.4 CRUD через ORM

Маршруты, проверка данных и формат ошибок остались как в лабораторной работе 1, изменился только слой контроллеров. Контроллеры получают модель параметром и вызывают методы Sequelize, как показано в таблице 2. Метод `update` возвращает число изменённых строк, поэтому ноль означает ответ 404, после успешной замены запись читается заново и возвращается клиенту. Express 5 передаёт отклонённый Promise в глобальный обработчик ошибок, поэтому конструкции `try/catch` в контроллерах не нужны, а сбой базы даёт ответ 500 без внутренних подробностей.

Таблица 2 – Соответствие маршрутов и методов Sequelize

| Маршрут                | Вызов Sequelize                                               | Ответ       |
| ---------------------- | ------------------------------------------------------------- | ----------- |
| `GET /diagrams`        | `Diagram.findAll({ order: [['id', 'ASC']] })`                 | 200         |
| `GET /diagrams/:id`    | `Diagram.findByPk(id)`                                        | 200 или 404 |
| `POST /diagrams`       | `Diagram.create(fields)`                                      | 201         |
| `PUT /diagrams/:id`    | `Diagram.update(fields, { where: { id } })`, затем `findByPk` | 200 или 404 |
| `DELETE /diagrams/:id` | `Diagram.destroy({ where: { id } })`                          | 204 или 404 |

### 3.5 Запуск и проверка

Порядок запуска: `npm run db:migrate` создаёт таблицу и добавляет колонку `priority`, `npm run db:seed` наполняет базу, `npm run dev` запускает сервер. Проверка на SQLite показала, что список возвращает три записи с полями `createdAt` и `updatedAt`, замена меняет `updatedAt`, первое удаление даёт 204, а повторное 404.

Всего 98 автоматических тестов. Одни проверяют HTTP-маршруты на временной базе SQLite, к которой применены настоящие миграции, включая `PATCH`, числовое поле, проекты и ошибку уникальности. Другие проверяют сами миграции: набор колонок, откат каждой миграции по очереди с сохранением всех ограничений `CHECK`, повторный запуск сида и откат только своих строк, отказ модели и базы от значений вне списков, от отрицательного и огромного числа и от повторного имени проекта. Третьи проверяют настройки подключения, в том числе проверку сертификата по умолчанию. Тесты запускают настоящий `sequelize-cli`, поэтому ошибка в файле миграции будет обнаружена.

Листинг файла config.js приведён в приложении А. Листинг файла index.js модели приведён в приложении Б. Листинг миграции создания таблицы приведён в приложении Г. Листинг миграции добавления поля priority приведён в приложении Д. Листинг сида demo-diagrams.js приведён в приложении Е. Листинг файла diagrams.controller.js приведён в приложении Ж. Листинг миграции добавления поля revision приведён в приложении К. Листинг миграции создания таблицы Projects приведён в приложении Л. Листинг файла projects.controller.js приведён в приложении М.

Миграции и сид выполнены командами `npm run db:migrate` и `npm run db:seed`, их вывод показан на рисунке 1.

![Миграции и сид](figures/01-migrate-seed.png)

Рисунок 1 – Вывод миграций и сида в консоли (вывод процессов, снятый как текст)

Структура созданных таблиц получена запросом к системной таблице `sqlite_master` самой базы и показана на рисунке 2.

![Структура базы](figures/02-schema.png)

Рисунок 2 – Таблицы Diagrams, Projects, RequestLogs и SequelizeMeta с ограничениями CHECK (результат запроса к файлу базы, снятый как текст)

Запрос `GET /diagrams` открыт в браузере по адресу `http://localhost:3000/diagrams`, три записи из сида показаны на рисунке 3.

![Список диаграмм](figures/03-get-list.png)

Рисунок 3 – Ответ GET /diagrams в окне браузера: три диаграммы из сида с полями createdAt и updatedAt

Одна запись по адресу `http://localhost:3000/diagrams/1` показана на рисунке 4.

![Одна диаграмма](figures/04-get-one.png)

Рисунок 4 – Ответ GET /diagrams/1 в окне браузера: объект одной диаграммы из базы

Запрос несуществующей записи по адресу `http://localhost:3000/diagrams/99` даёт ошибку, показанную на рисунке 5.

![Ответ 404](figures/05-get-404.png)

Рисунок 5 – Ответ GET /diagrams/99 в окне браузера: JSON с сообщением об отсутствии диаграммы (код 404)

Удаление записи и повторное удаление показаны на рисунке 6. Браузер не отправляет запросы `POST`, `PUT`, `PATCH` и `DELETE` из адресной строки, поэтому такие запросы отправил скрипт `shots/shots.mjs`, а настоящие запросы и ответы сервера выведены на странице.

![Удаление записи](figures/10-delete-204-404.png)

Рисунок 6 – Запросы DELETE: ответ 204 без тела и ответ 404 при повторе, записанные скриптом (не окно Postman)

### 3.6 Постраничный вывод и сортировка

Список принимает параметры `limit`, `offset`, `sort` и `order`. Параметр `limit` задаёт размер страницы от 1 до 100, `offset` задаёт смещение от 0 до 1000000, `sort` выбирает поле из белого списка, а `order` принимает значения `asc` и `desc`. Без параметров возвращается весь список по возрастанию `id`, поэтому клиенты прежних работ продолжают работать. Ответ остаётся массивом, а полный размер выборки приходит в заголовке `X-Total-Count`. Числа читаются как строки не длиннее девяти цифр, поэтому значения `-1`, `1e9`, `0x10` и огромные числа получают ответ 400 со списком ошибок по полям. Имя поля сортировки проверяется по белому списку и не попадает в запрос к базе без проверки. Равные значения упорядочены по `id`, поэтому страницы не пересекаются. Разбор параметров вынесен в отдельный модуль, он приведён в приложении И. Параметр `notation` оставляет записи одной нотации, а параметр `q` ищет часть названия без учёта регистра функцией `instr` в SQLite или `strpos` в PostgreSQL, поэтому знаки процента и подчёркивания в тексте поиска остаются обычными символами. Недопустимое значение даёт ответ 400.

Запрос `GET /diagrams?limit=2&offset=0&sort=title&order=desc` даёт первую страницу из двух записей, как на рисунке 7.

![Страница списка](figures/06-get-page.png)

Рисунок 7 – Ответ GET /diagrams с параметрами limit, offset, sort и order в окне браузера

### 3.7 Числовое поле revision

Поле `revision` хранит номер редакции диаграммы и показывает, как число доходит от базы до ответа. В базе колонка имеет тип `INTEGER` со значением по умолчанию 0 и ограничением `CHECK` от 0 до 100000, в модели то же правило стоит в проверках `isInt`, `min` и `max`, а предел `revisionMax` лежит в `limits.json`. Запрос проверяется до базы: принимается только целое число от 0 до предела. Строка `"5"`, дробь, отрицательное число, `null`, массив и число больше предела получают ответ 400 с полем `revision` в списке ошибок. JSON не умеет хранить `1e999`, он разбирается в бесконечность, и она отклоняется тем же правилом, а значения вроде `1e20` и `9007199254740993` выходят за предел. Без поля в теле значение равно 0. Список можно сортировать по `revision`, числа сравниваются как числа, а не как строки.

Отказ базе и серверу в записи неверных значений, в том числе отрицательной ревизии, показан на рисунке 8.

![Неверные данные](figures/08-validation-400.png)

Рисунок 8 – Ответы 400 со списком проблем полей и при отрицательном revision, записанные скриптом (не окно Postman)

### 3.8 Метод PATCH

Маршрут `PATCH /diagrams/:id` меняет только присланные поля. Проверка вынесена в `validatePartial`: каждое присланное поле проходит то же правило, что в `POST` и `PUT`, а тело без единого известного поля даёт 400. Контроллер читает запись через `findByPk`, вызывает `diagram.update(fields)` и возвращает обновлённую запись, поэтому проверки модели тоже срабатывают. Метод `PUT` заменяет запись целиком: пропущенные необязательные поля получают значения по умолчанию, а `projectId` сбрасывается в `null`. Метод `PATCH` оставляет пропущенные поля как есть. Поэтому `PUT` идемпотентен, а `PATCH` по определению не обязан быть таким.

Создание, замена и частичное изменение записи в базе показаны на рисунке 9.

![Запросы POST, PUT и PATCH](figures/07-post-put-patch.png)

Рисунок 9 – Запросы POST, PUT и PATCH и ответы сервера, записанные скриптом (не окно Postman)

### 3.9 Связь один-ко-многим и ошибка уникальности

Один проект содержит много диаграмм, а диаграмма относится не более чем к одному проекту. Модель `Project` описана в `src/models/project.js`, связь задана в `src/models/index.js` вызовами `Project.hasMany(Diagram)` и `Diagram.belongsTo(Project)` с внешним ключом `projectId`. В миграции колонка `projectId` ссылается на `Projects.id` с правилом `ON DELETE SET NULL`: при удалении проекта диаграммы остаются, а их `projectId` очищается. Диаграмма может указать только существующий проект, иначе контроллер отвечает 400 с полем `projectId`, а внешний ключ в базе защищает таблицу от записи в обход приложения. Маршруты проекта показаны в таблице 3.

Таблица 3 – Маршруты ресурса projects

| Маршрут                      | Назначение                                                           | Ответ                   |
| ---------------------------- | -------------------------------------------------------------------- | ----------------------- |
| `GET /projects`              | Список проектов с постраничным выводом и сортировкой                 | 200                     |
| `POST /projects`             | Создание проекта с уникальным именем                                 | 201, 400 или 409        |
| `GET /projects/:id`          | Один проект                                                          | 200 или 404             |
| `GET /projects/:id/diagrams` | Диаграммы проекта с теми же параметрами `limit`, `offset`, `sort`   | 200 или 404             |
| `DELETE /projects/:id`       | Удаление проекта без удаления диаграмм                               | 204 или 404             |

Имя проекта уникально: колонка `name` создана с ограничением `UNIQUE`. Повторное имя нарушает его, Sequelize выбрасывает `SequelizeUniqueConstraintError`, а глобальный обработчик превращает её в ответ 409 с полем `name` в списке `details`. Проверка только запросом `findOne` перед записью не годится, потому что два одновременных запроса пройдут её оба, поэтому последнее слово остаётся за ограничением базы.

Создание проекта, ответ 409 на повторное имя, перенос диаграммы в проект и выборка диаграмм проекта показаны на рисунке 10.

![Проекты](figures/09-projects-409.png)

Рисунок 10 – Запросы к ресурсу projects, включая ответ 409 при повторе имени, записанные скриптом (не окно Postman)

### 3.10 Как вызвать ответ 500 настоящим сбоем

Ответ 500 вызывается сбоем базы, а не кнопкой. Для SQLite нужно запустить сервер командой `npm start`, затем во втором окне выполнить `npx sequelize-cli db:migrate:undo:all`. Таблицы исчезают под работающим сервером, и первый же запрос, например `GET /diagrams`, не может записать строку в журнал `RequestLogs`. Клиент получает 500 с телом `{ "error": "Internal server error" }`, а подробности остаются только в консоли сервера. Для PostgreSQL достаточно остановить службу базы или контейнер: запросы дают 500, а `GET /health` отвечает 503. Работу восстанавливает команда `npm run db:migrate` или запуск базы. Тот же сбой воспроизведён в автоматическом тесте удалением таблицы `RequestLogs` при работающем сервере.

Миграции откатаны командой `npx sequelize-cli db:migrate:undo:all` под работающим сервером, и первый же запрос `http://localhost:3000/diagrams` получает ответ 500, как на рисунке 11.

![Ответ 500](figures/11-real-500.png)

Рисунок 11 – Ответ GET /diagrams после настоящего сбоя базы: JSON с общим сообщением без подробностей (код 500)

Подробности сбоя остаются только в консоли сервера и показаны на рисунке 12.

![Консоль сервера](figures/12-server-console.png)

Рисунок 12 – Консоль сервера после сбоя: ошибка отсутствия таблицы RequestLogs (вывод процесса, снятый как текст)

Результат команды `npm test` с числом тестов и покрытием кода показан на рисунке 13.

![Результат тестов](figures/13-tests.png)

Рисунок 13 – Конец вывода команды npm test: число пройденных тестов и таблица покрытия (вывод процесса, снятый как текст)

### 3.11 Ответы на контрольные вопросы

5. Как реализовать связь один-ко-многим между моделями? Приведите пример из вашего проекта.

   Родительская модель вызывает `hasMany`, дочерняя вызывает `belongsTo`, и обе называют один внешний ключ. В проекте один `Project` имеет много `Diagram`: `Project.hasMany(Diagram, { foreignKey: 'projectId', onDelete: 'SET NULL' })` и `Diagram.belongsTo(Project, { foreignKey: 'projectId' })`. Колонку `projectId` со ссылкой на `Projects.id` создаёт миграция, ассоциация только сообщает о ней Sequelize. После этого доступны методы `project.getDiagrams()` и `diagram.getProject()`, и загрузка одним запросом через `include`. В API это маршрут `GET /projects/:id/diagrams`.

6. Как выполнить пагинацию (limit, offset) в Sequelize?

   Метод `findAndCountAll({ limit, offset, order })` возвращает страницу в `rows` и полное число записей в `count`. В работе `count` уходит клиенту в заголовке `X-Total-Count`. Порядок обязателен, иначе страницы могут пересекаться, поэтому равные значения сортируются по `id`. Страница с номером `n` начинается со смещения `(n - 1) * limit`. Размер страницы ограничен числом 100, а `limit` и `offset` читаются как короткие строки цифр, поэтому `-1` и огромные числа дают 400. На очень больших таблицах большое смещение медленно, и тогда выбирают пагинацию по последнему увиденному `id`.

7. Как обработать ошибку уникальности (duplicate entry) при создании записи?

   Уникальность задаётся ограничением `UNIQUE` в миграции и `unique: true` в модели. Нарушение приводит к исключению `SequelizeUniqueConstraintError`, у которого в `errors[0].path` лежит имя поля. Его ловят в обработчике и отвечают 409 Conflict, а не 500, потому что виновата не база, а повторное значение. В работе так отвечает `POST /projects` с уже занятым именем. Предварительный `findOne` не заменяет ограничение: между проверкой и записью может вклиниться другой запрос.

### 3.12 Архитектура и компромиссы

Работа повторяет слои первой лабораторной и добавляет слой доступа к данным: модели Sequelize и миграции. Контроллер работает с моделями и не пишет SQL, а схема базы меняется только миграциями. Фаулер называет такой подход «Data Mapper» в книге «Шаблоны корпоративных приложений»: объект предметной области не знает, как он хранится. Правило зависимостей из «Чистой архитектуры» Мартина соблюдено не полностью. Контроллер зависит от Sequelize, потому что использует его методы поиска и подсчёта. Полностью отделить предметную область можно было бы слоем репозиториев, но для двух сущностей он удвоил бы число файлов, поэтому от него отказались.

Компромисс выбран осознанно. Ограничения целостности лежат на двух уровнях: проверка в коде даёт понятный ответ 400, а ограничения `CHECK`, `UNIQUE` и внешний ключ в базе защищают данные, даже если запись идёт в обход API. Дублирование правил здесь оправдано, потому что у каждого уровня своя задача. Пределы вынесены в `limits.json` и копируются в миграции как снимок, чтобы старая миграция не менялась вместе с кодом. Журнал запросов написан отдельным промежуточным обработчиком, поэтому его можно отключить, не затрагивая маршруты.

Источники: Мартин Р. Чистая архитектура. Искусство разработки программного обеспечения. СПб.: Питер, 2018. Фаулер М. Шаблоны корпоративных приложений. М.: Вильямс, 2016. Фаулер М. Рефакторинг. Улучшение существующего кода. 2-е изд. СПб.: Питер, 2019.

## Заключение

Для проекта DSLKit коллекция `diagrams` из лабораторной работы 1 переведена с массива на базу данных через Sequelize: модели `Diagram` и `Project` со связью один-ко-многим, пять миграций для таблицы, поля `priority`, журнала запросов, числового поля `revision` и проектов, сид с тремя диаграммами и контроллеры на методах ORM. Добавлены метод `PATCH`, ответ 409 при повторном имени проекта и проверка числа от 0 до предела. Локально работа использует SQLite, а переменная `DATABASE_URL` переключает её на PostgreSQL или облачный Neon без изменения кода. 98 автоматических тестов подтверждают маршруты, ограничения, миграции с откатом и сид. Запуск на настоящем PostgreSQL не проверялся, структура базы и запросы подтверждены снимками браузера и записью обмена, снятой скриптом.

## Приложение А (обязательное) Листинг файла config.js

```js
const { readFileSync } = require('node:fs');

try {
  process.loadEnvFile();
} catch {
  // .env is optional, the settings may come from the environment
}

// PostgreSQL is the database of the work: DATABASE_URL points to it (a local one from docker-compose.yml, Neon, Supabase).
// SQLITE_STORAGE selects a SQLite file instead, the tests use it with a temporary file so that they need no server.
// With DATABASE_SSL=true the server certificate is verified; only DATABASE_SSL_REJECT_UNAUTHORIZED=false turns that off.
// DATABASE_SSL_CA is a path to a PEM file with the certificate authority, the safe way to trust a private or self-signed server.
const fromEnv = () => {
  const { DATABASE_URL, DATABASE_SSL, DATABASE_SSL_REJECT_UNAUTHORIZED, DATABASE_SSL_CA, SQLITE_STORAGE, NODE_ENV } = process.env;
  if (!DATABASE_URL) {
    if (SQLITE_STORAGE) return { dialect: 'sqlite', storage: SQLITE_STORAGE, logging: false };
    throw new Error('DATABASE_URL is not set: copy .env.example to .env and start the database (docker compose up -d db), or set SQLITE_STORAGE to use a SQLite file');
  }
  if (NODE_ENV === 'production' && (DATABASE_SSL !== 'true' || DATABASE_SSL_REJECT_UNAUTHORIZED === 'false')) {
    throw new Error('In production DATABASE_SSL=true is required and certificate checks cannot be turned off, use DATABASE_SSL_CA instead');
  }
  return {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    ...(DATABASE_SSL === 'true' && { dialectOptions: { ssl: { require: true, rejectUnauthorized: DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false', ...(DATABASE_SSL_CA && { ca: readFileSync(DATABASE_SSL_CA, 'utf8') }) } } }),
  };
};

// The settings are read when a block is asked for, so a missing setting is reported where the database is needed
// and not at the moment this file is loaded. The same block serves every environment, the tests set SQLITE_STORAGE.
module.exports = {
  get development() {
    return fromEnv();
  },
  get test() {
    return fromEnv();
  },
  get production() {
    return fromEnv();
  },
};
```

## Приложение Б (обязательное) Листинг файла index.js модели

```js
const { Sequelize } = require('sequelize');
const { defineDiagram } = require('./diagram');
const { defineRequestLog } = require('./request-log');
const { defineProject } = require('./project');
const allConfigs = require('../../config/config');

// Builds the connection from config/config.js; NODE_ENV picks the block.
const createModels = (config = allConfigs[process.env.NODE_ENV || 'development']) => {
  const { use_env_variable: urlVariable, ...options } = config;
  const sequelize = urlVariable ? new Sequelize(process.env[urlVariable], options) : new Sequelize(options);
  const Diagram = defineDiagram(sequelize);
  const Project = defineProject(sequelize);
  // One-to-many: a project has many diagrams, a diagram belongs to one project. Deleting a project clears projectId of its diagrams.
  Project.hasMany(Diagram, { foreignKey: 'projectId', as: 'diagrams', onDelete: 'SET NULL' });
  Diagram.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
  return { sequelize, Diagram, Project, RequestLog: defineRequestLog(sequelize) };
};

module.exports = { createModels };
```

## Приложение В (обязательное) Листинг файла diagram.js

```js
const { DataTypes } = require('sequelize');
const { NOTATIONS, PRIORITIES, DEFAULT_PRIORITY, LIMITS } = require('./diagram.constants');

// The table is created by migrations, never by sequelize.sync().
const defineDiagram = (sequelize) =>
  sequelize.define('Diagram', {
    title: { type: DataTypes.STRING(LIMITS.title), allowNull: false, validate: { len: [1, LIMITS.title] } },
    notation: { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [NOTATIONS] } },
    sourceCode: { type: DataTypes.TEXT, allowNull: false, validate: { len: [1, LIMITS.sourceCode] } },
    priority: { type: DataTypes.STRING(10), allowNull: false, defaultValue: DEFAULT_PRIORITY, validate: { isIn: [PRIORITIES] } },
    owner: { type: DataTypes.STRING(LIMITS.owner), allowNull: false, validate: { len: [1, LIMITS.owner] } },
    // A counter that is never negative, the same range as the CHECK in the migration.
    revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { isInt: true, min: 0, max: LIMITS.revisionMax } },
    // Foreign key of the one-to-many link, see the associations in index.js.
    projectId: { type: DataTypes.INTEGER, allowNull: true },
  });

module.exports = { defineDiagram };
```

## Приложение Г (обязательное) Листинг миграции создания таблицы

```js
// A migration is a snapshot, so the allowed values and limits are copied here instead of imported.
const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];
const LIMITS = { title: 80, owner: 60 };

module.exports = {
  async up(queryInterface, Sequelize) {
    const { fn, col, where, Op } = Sequelize;
    await queryInterface.createTable('Diagrams', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      title: { allowNull: false, type: Sequelize.STRING(LIMITS.title) },
      notation: { allowNull: false, type: Sequelize.STRING(10) },
      sourceCode: { allowNull: false, type: Sequelize.TEXT },
      owner: { allowNull: false, type: Sequelize.STRING(LIMITS.owner) },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addConstraint('Diagrams', {
      type: 'check',
      fields: ['notation'],
      name: 'diagrams_notation_check',
      where: { notation: { [Op.in]: NOTATIONS } },
    });
    // The API trims and checks every text, these checks keep the table clean for any other writer (SQLite does not enforce VARCHAR length).
    for (const column of ['title', 'owner', 'sourceCode']) {
      await queryInterface.addConstraint('Diagrams', {
        type: 'check',
        fields: [column],
        name: `diagrams_${column}_not_blank`,
        where: where(fn('length', fn('trim', col(column))), { [Op.gt]: 0 }),
      });
    }
    for (const column of ['title', 'owner']) {
      await queryInterface.addConstraint('Diagrams', {
        type: 'check',
        fields: [column],
        name: `diagrams_${column}_length`,
        where: where(fn('length', col(column)), { [Op.lte]: LIMITS[column] }),
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Diagrams');
  },
};
```

## Приложение Д (обязательное) Листинг миграции добавления поля priority

```js
const PRIORITIES = ['low', 'normal', 'high'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Diagrams', 'priority', {
      allowNull: false,
      type: Sequelize.STRING(10),
      defaultValue: 'normal',
    });
    await queryInterface.addConstraint('Diagrams', {
      type: 'check',
      fields: ['priority'],
      name: 'diagrams_priority_check',
      where: { priority: { [Sequelize.Op.in]: PRIORITIES } },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('Diagrams', 'diagrams_priority_check');
    if (queryInterface.sequelize.getDialect() === 'sqlite') {
      // The generic removeColumn rebuilds a SQLite table from its columns only and loses every CHECK,
      // while the native DROP COLUMN (SQLite 3.35+) leaves the rest of the table as it was.
      await queryInterface.sequelize.query('ALTER TABLE `Diagrams` DROP COLUMN `priority`');
    } else {
      await queryInterface.removeColumn('Diagrams', 'priority');
    }
  },
};
```

## Приложение Е (обязательное) Листинг сида demo-diagrams.js

```js
const { ROWS } = require('../seed-data/diagrams');

// Every seeded row has this owner, so the seed can tell its rows from the ones users created.
const MARKER = 'demo';

// Idempotent per row: a row that is already there is left alone, a deleted one comes back, nothing is duplicated.
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    for (const row of ROWS) {
      const exists = await queryInterface.rawSelect('Diagrams', { where: { owner: MARKER, title: row.title } }, ['id']);
      if (!exists) await queryInterface.bulkInsert('Diagrams', [{ ...row, owner: MARKER, createdAt: now, updatedAt: now }]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Diagrams', { owner: MARKER, title: { [Sequelize.Op.in]: ROWS.map((row) => row.title) } });
  },
};
```

## Приложение Ж (обязательное) Листинг файла diagrams.controller.js

```js
const { notFound, badRequest } = require('../errors');
const { Op, fn, col, where } = require('sequelize');
const { parseListQuery } = require('../middleware/list-query');
const { NOTATIONS, LIMITS } = require('../models/diagram.constants');

const missing = (id) => notFound(`Diagram ${id} not found`);

const SORTABLE = ['id', 'title', 'notation', 'priority', 'owner', 'revision', 'createdAt'];

// A part of the title is searched with instr (SQLite) or strpos (PostgreSQL) on the lowercased title, not with LIKE,
// so the characters % and _ in the search text are plain characters and need no escaping.
const filterFor = (dialect, { notation, q }) => {
  const conditions = [];
  if (notation !== undefined) conditions.push({ notation });
  if (q !== undefined) conditions.push(where(fn(dialect === 'sqlite' ? 'instr' : 'strpos', fn('lower', col('title')), q), { [Op.gt]: 0 }));
  return conditions.length > 0 ? { [Op.and]: conditions } : {};
};

// Express 5 forwards a rejected promise to the error handler, so no try/catch is needed here.
const createDiagramsController = ({ Diagram, Project }) => {
  // The foreign key is also guarded by the database, but a clear 400 beats a database error for a project that does not exist.
  const ensureProject = async (projectId) => {
    if (projectId === undefined || projectId === null || (await Project.findByPk(projectId))) return;
    throw badRequest('Invalid diagram data', [{ field: 'projectId', message: `project ${projectId} does not exist` }]);
  };

  return {
    // ?limit=&offset=&sort=&order= (see list-query.js). The answer stays an array, the full size comes in X-Total-Count.
    list: async (req, res) => {
      const { limit, offset, sort, order, notation, q } = parseListQuery(req.query, SORTABLE, { notations: NOTATIONS, maxQuery: LIMITS.title });
      const { count, rows } = await Diagram.findAndCountAll({
        where: filterFor(Diagram.sequelize.getDialect(), { notation, q }),
        order: [
          [sort, order.toUpperCase()],
          ['id', 'ASC'],
        ],
        limit,
        offset,
      });
      res.set('X-Total-Count', String(count));
      res.json(rows);
    },

    get: async (req, res, next) => {
      const diagram = await Diagram.findByPk(req.diagramId);
      return diagram ? res.json(diagram) : next(missing(req.diagramId));
    },

    create: async (req, res) => {
      await ensureProject(req.diagramFields.projectId);
      const diagram = await Diagram.create(req.diagramFields);
      res.status(201).location(`/diagrams/${diagram.id}`).json(diagram);
    },

    replace: async (req, res, next) => {
      await ensureProject(req.diagramFields.projectId);
      const [updated] = await Diagram.update(req.diagramFields, { where: { id: req.diagramId } });
      return updated ? res.json(await Diagram.findByPk(req.diagramId)) : next(missing(req.diagramId));
    },

    // PATCH: only the sent fields change, the model validators still run on them.
    update: async (req, res, next) => {
      const diagram = await Diagram.findByPk(req.diagramId);
      if (!diagram) return next(missing(req.diagramId));
      await ensureProject(req.diagramFields.projectId);
      await diagram.update(req.diagramFields);
      return res.json(diagram);
    },

    remove: async (req, res, next) => {
      const removed = await Diagram.destroy({ where: { id: req.diagramId } });
      return removed ? res.status(204).end() : next(missing(req.diagramId));
    },
  };
};

module.exports = { createDiagramsController };
```

## Приложение И (обязательное) Листинг файла list-query.js

```js
const { badRequest } = require('../errors');

// Limits of the list query. The page size is capped so one request cannot ask for the whole table,
// and the numbers are read as short digit strings, so 1e9, -1, 0x10 or a huge value are refused with 400.
const MAX_LIMIT = 100;
const MAX_OFFSET = 1000000;
const ORDERS = ['asc', 'desc'];

// Reads ?limit=, ?offset=, ?sort=, ?order=, ?notation= and ?q= from req.query.
// sortable: the field names a client may sort by (a whitelist, so a field name never reaches the database unchecked).
// Without limit the whole list is returned (the clients of the earlier labs expect that), without sort the order is by id.
// A bad value throws the 400 error with the list of problems, Express 5 passes it to the error handler.
// filters: { notations: allowed values of ?notation=, maxQuery: longest ?q= }. ?q= is a case-insensitive part of the title.
const parseListQuery = (query, sortable, filters = {}) => {
  const problems = [];
  const integer = (name, min, max) => {
    const value = query[name];
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !/^\d{1,9}$/.test(value) || Number(value) < min || Number(value) > max) {
      problems.push({ field: name, message: `${name} must be an integer from ${min} to ${max}` });
      return undefined;
    }
    return Number(value);
  };
  const limit = integer('limit', 1, MAX_LIMIT);
  const offset = integer('offset', 0, MAX_OFFSET) ?? 0;

  const sort = query.sort ?? 'id';
  if (typeof sort !== 'string' || !sortable.includes(sort)) {
    problems.push({ field: 'sort', message: `sort must be one of: ${sortable.join(', ')}` });
  }
  const order = typeof query.order === 'string' ? query.order.toLowerCase() : (query.order ?? 'asc');
  if (!ORDERS.includes(order)) problems.push({ field: 'order', message: 'order must be asc or desc' });

  const { notations = [], maxQuery = 80 } = filters;
  let notation;
  if (query.notation !== undefined) {
    if (typeof query.notation !== 'string' || !notations.includes(query.notation)) problems.push({ field: 'notation', message: `notation must be one of: ${notations.join(', ')}` });
    else notation = query.notation;
  }
  let q;
  if (query.q !== undefined) {
    const text = typeof query.q === 'string' ? query.q.trim() : '';
    if (text === '' || text.length > maxQuery) problems.push({ field: 'q', message: `q must be text of 1 to ${maxQuery} characters` });
    else q = text.toLowerCase();
  }

  if (problems.length) throw badRequest('Invalid list query', problems);
  return { limit, offset, sort, order, notation, q };
};

module.exports = { parseListQuery, MAX_LIMIT, MAX_OFFSET };
```

## Приложение К (обязательное) Листинг миграции добавления поля revision

```js
// A migration is a snapshot, so the limit is copied here instead of imported.
const REVISION_MAX = 100000;

// A numeric column that is never negative: the CHECK keeps it clean for any writer, not only for the API.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Diagrams', 'revision', {
      allowNull: false,
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });
    await queryInterface.addConstraint('Diagrams', {
      type: 'check',
      fields: ['revision'],
      name: 'diagrams_revision_range',
      where: { revision: { [Sequelize.Op.gte]: 0, [Sequelize.Op.lte]: REVISION_MAX } },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('Diagrams', 'diagrams_revision_range');
    if (queryInterface.sequelize.getDialect() === 'sqlite') {
      // The generic removeColumn rebuilds a SQLite table from its columns only and loses every CHECK,
      // while the native DROP COLUMN (SQLite 3.35+) leaves the rest of the table as it was.
      await queryInterface.sequelize.query('ALTER TABLE `Diagrams` DROP COLUMN `revision`');
    } else {
      await queryInterface.removeColumn('Diagrams', 'revision');
    }
  },
};
```

## Приложение Л (обязательное) Листинг миграции создания таблицы Projects

```js
// A migration is a snapshot, so the limit is copied here instead of imported.
const NAME_MAX = 80;

// One project has many diagrams (one-to-many). The name is unique, a second project with the same name is a database error
// that the API turns into 409. Deleting a project keeps its diagrams and clears their projectId.
module.exports = {
  async up(queryInterface, Sequelize) {
    const { fn, col, where, Op } = Sequelize;
    await queryInterface.createTable('Projects', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      name: { allowNull: false, unique: true, type: Sequelize.STRING(NAME_MAX) },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addConstraint('Projects', {
      type: 'check',
      fields: ['name'],
      name: 'projects_name_not_blank',
      where: where(fn('length', fn('trim', col('name'))), { [Op.gt]: 0 }),
    });
    await queryInterface.addColumn('Diagrams', 'projectId', {
      allowNull: true,
      type: Sequelize.INTEGER,
      references: { model: 'Projects', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('Diagrams', ['projectId'], { name: 'diagrams_project_id' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Diagrams', 'diagrams_project_id');
    if (queryInterface.sequelize.getDialect() === 'sqlite') {
      // The generic removeColumn would rebuild the table and lose every CHECK, see the priority migration.
      await queryInterface.sequelize.query('ALTER TABLE `Diagrams` DROP COLUMN `projectId`');
    } else {
      await queryInterface.removeColumn('Diagrams', 'projectId');
    }
    await queryInterface.dropTable('Projects');
  },
};
```

## Приложение М (обязательное) Листинг файла projects.controller.js

```js
const { notFound } = require('../errors');
const { parseListQuery } = require('../middleware/list-query');

const PROJECT_SORTABLE = ['id', 'name', 'createdAt'];
const DIAGRAM_SORTABLE = ['id', 'title', 'notation', 'priority', 'owner', 'revision', 'createdAt'];

const missing = (id) => notFound(`Project ${id} not found`);

// A project groups diagrams. Creating a project with a name that already exists breaks the UNIQUE constraint,
// Sequelize throws SequelizeUniqueConstraintError and the error handler answers 409.
const createProjectsController = ({ Project, Diagram }) => ({
  list: async (req, res) => {
    const { limit, offset, sort, order } = parseListQuery(req.query, PROJECT_SORTABLE);
    const { count, rows } = await Project.findAndCountAll({
      order: [
        [sort, order.toUpperCase()],
        ['id', 'ASC'],
      ],
      limit,
      offset,
    });
    res.set('X-Total-Count', String(count));
    res.json(rows);
  },

  get: async (req, res, next) => {
    const project = await Project.findByPk(req.projectId);
    return project ? res.json(project) : next(missing(req.projectId));
  },

  // The many side of the one-to-many link: all diagrams of one project, with the same paging as /diagrams.
  listDiagrams: async (req, res, next) => {
    const project = await Project.findByPk(req.projectId);
    if (!project) return next(missing(req.projectId));
    const { limit, offset, sort, order } = parseListQuery(req.query, DIAGRAM_SORTABLE);
    const { count, rows } = await Diagram.findAndCountAll({
      where: { projectId: project.id },
      order: [
        [sort, order.toUpperCase()],
        ['id', 'ASC'],
      ],
      limit,
      offset,
    });
    res.set('X-Total-Count', String(count));
    return res.json(rows);
  },

  create: async (req, res) => {
    const project = await Project.create(req.projectFields);
    res.status(201).location(`/projects/${project.id}`).json(project);
  },

  // The diagrams of the project stay, the database clears their projectId (ON DELETE SET NULL).
  remove: async (req, res, next) => {
    const removed = await Project.destroy({ where: { id: req.projectId } });
    return removed ? res.status(204).end() : next(missing(req.projectId));
  },
});

module.exports = { createProjectsController };
```
