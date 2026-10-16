# NOTES: ЛР 6 (MongoDB)

Изменено:
- Заголовки безопасности, `x-powered-by` скрыт (`src/middleware/security.js`).
- Сервер не падает без MongoDB: 503 и повторное подключение каждые 5 с (`server.js`).
- Журнал запросов в коллекцию `requestlogs` (чётный вариант), при сбое записи 500.
- Ошибки Mongoose и 5xx не раскрываются клиенту.
- `GET /diagrams/stats` (агрегация), `?commentAuthor=` (вложенное поле, индекс), `limit` и `skip`.
- `MONGO_URI` принимается как псевдоним; пределы `listLimitMax`, `listSkipMax`, `pathLog` в `limits.json`.
- 54 теста (было 43), отчёты пересобраны, README и `requests.http` обновлены, добавлен `AUDIT.md`.

Осталось: скриншоты Atlas и Compass (нужны владельцу), при желании скриншоты новых маршрутов в `figures/`, populate не нужен (нет ссылок).
