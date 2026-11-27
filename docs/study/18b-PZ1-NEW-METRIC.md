# Шпаргалка ПЗ1: «добавить новую метрику для администратора» / Cheat sheet: add a new admin metric

## RU

Метрика здесь: ещё один показатель журнала (например, число запросов с кодом 5xx на странице `/log`). Журнал обязателен: при отказе БД страница 500, действие не выполняется.

1. `src/data/requestLog.js`: добавить подготовленный запрос в `statements` (например `SELECT COUNT(*) AS n FROM request_log WHERE status >= 500`) и метод в возвращаемый объект, обёрнутый в `guard(...)`: любой сбой БД станет `UserError` и страницей 500.
2. `src/app.js`, маршрут `GET /log`: добавить поле в `res.render('log', {...})`, например `errors5xx: log.countErrors()`. Маршрут уже под `requireAuth` и в `try/catch` с `next(error)`.
3. `views/log.ejs`: вывести `<%= errors5xx %>` (экранирование включено).
4. Тест: положительный (метрика растёт после запроса с 5xx), отказ (подменить метод на выбрасывающий: ответ 500, не 200), золотая страница `UPDATE_GOLDEN=1 npm test` и просмотр diff.
5. Если метрика ведётся при действии (записывается), запись и действие делаются в одной транзакции (`BEGIN IMMEDIATE ... COMMIT`, при ошибке `ROLLBACK`), как в `add` хранилища диаграмм.

Как воспроизвести сбой журнала: `DB_FILE=package.json/blocked/log.db npm start`, открыть любую страницу: страница 500, строки о сбое в консоли без стека на странице.

## EN

A metric is one more figure from the request log (for example the number of 5xx requests on `/log`). The log is mandatory: when the DB fails, the page is the styled 500 and the action is not performed.

1. `src/data/requestLog.js`: add a prepared statement and a method wrapped in `guard(...)`, so any DB failure becomes a `UserError` and the 500 page.
2. `src/app.js`, `GET /log`: pass the value to `res.render('log', {...})`; the route already has `requireAuth` and `try/catch` with `next(error)`.
3. `views/log.ejs`: print `<%= value %>` (escaped).
4. Tests: positive, failure (a throwing method gives 500, not 200), golden page (`UPDATE_GOLDEN=1 npm test`, read the diff).
5. If the metric is written together with an action, use one transaction (`BEGIN IMMEDIATE`, `COMMIT`, `ROLLBACK` on error).

Reproduce a log failure: `DB_FILE=package.json/blocked/log.db npm start`, open any page.
