# Лабораторная работа №1. Разработка серверного приложения на Node.js

## 1 Цель работы

Приобрести навыки создания серверного приложения на платформе Node.js с фреймворком Express: освоить маршрутизацию, обработку HTTP-запросов GET, POST, PUT и DELETE и формирование ответов сервера. Работа выполнена для проекта DSLKit, веб-редактора диаграмм как кода, тематика которого соответствует направлению SaaS. Сервер станет основой для подключения базы данных, аутентификации и клиента на React.

## 2 Краткие теоретические сведения

**Express.** Фреймворк надстраивается над модулем `http` платформы Node.js. Приложение это цепочка обработчиков: каждый получает запрос, ответ и функцию `next`, и либо отвечает клиенту, либо передаёт управление дальше. Порядок подключения обработчиков определяет порядок их вызова.

**Параметры запроса.** Часть пути вида `:id` попадает в `req.params`, строка запроса после знака вопроса в `req.query`, тело запроса в `req.body`. Тело в формате JSON разбирает промежуточный обработчик `express.json()`, для него клиент указывает заголовок `Content-Type: application/json`.

**REST.** Ресурс получает адрес, а действие над ним задаёт метод HTTP: `GET` читает, `POST` создаёт, `PUT` заменяет целиком, `DELETE` удаляет. Результат сообщает код состояния: 200 успешное чтение и замена, 201 создание, 204 удаление без тела, 400 неверный запрос, 404 ресурс не найден, 500 сбой сервера.

**Обработка ошибок.** Обработчик с четырьмя параметрами `(err, req, res, next)` считается обработчиком ошибок. Он подключается последним и получает всё, что передано в `next(err)` или выброшено в обработчиках.

## 3 Ход работы

### 3.1 Предметная область и маршруты

Для DSLKit коллекцией выбрана `diagrams`. Диаграмма содержит поля `title` (название), `notation` (нотация: UML, BPMN, ERD, DFD, IDEF0 или Petri), `sourceCode` (текст диаграммы на языке DSL), `priority` (`low`, `normal` или `high`) и `owner` (владелец). Идентификатор `id` назначает сервер. Маршруты, коды ответов и примеры показаны в таблице 1.

Таблица 1 – Маршруты API ресурса diagrams

| Метод  | Путь            | Успех                                        | Ошибки                                        | Пример запроса                 |
| ------ | --------------- | -------------------------------------------- | --------------------------------------------- | ------------------------------ |
| GET    | `/diagrams`     | 200, массив диаграмм                         | нет                                           | `GET /diagrams`                |
| GET    | `/diagrams/:id` | 200, объект                                  | 400 неверный id, 404 нет диаграммы            | `GET /diagrams/1`              |
| POST   | `/diagrams`     | 201, созданный объект и заголовок `Location` | 400 неверные данные или JSON                  | `POST /diagrams` с телом JSON  |
| PUT    | `/diagrams/:id` | 200, обновлённый объект                      | 400 неверный id или данные, 404 нет диаграммы | `PUT /diagrams/1` с телом JSON |
| DELETE | `/diagrams/:id` | 204, тело пустое                             | 400 неверный id, 404 нет диаграммы            | `DELETE /diagrams/2`           |
| любой  | другой путь     | нет                                          | 404 в формате JSON                            | `GET /projects`                |

### 3.2 Инициализация проекта

Проект создан командой `npm init`, установлены зависимости `express` и, как зависимость разработки, `nodemon`. В `package.json` добавлены скрипты `start` (`node server.js`), `dev` (`nodemon server.js`) и `test`. Порт задаётся переменной `PORT` из файла `.env`, а в репозиторий кладётся только образец `.env.example`. Структура кода соответствует рекомендации условия и показана в таблице 2.

Таблица 2 – Структура проекта

| Файл                                     | Назначение                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `server.js`                              | Читает `.env`, запускает сервер на порту из `PORT` или 3000                |
| `src/app.js`                             | Функция `createApp(store)`: подключает JSON, маршруты и обработчики ошибок |
| `src/routes/diagrams.routes.js`          | Связывает методы и пути с обработчиками                                    |
| `src/controllers/diagrams.controller.js` | Обработчики пяти операций                                                  |
| `src/models/diagram.model.js`            | Хранилище в массиве, допустимые значения полей, начальные данные           |
| `src/middleware/validate.js`             | Проверка id и тела запроса                                                 |
| `src/middleware/error-handler.js`        | Ответ 404 для неизвестных путей и глобальный обработчик ошибок             |
| `src/errors.js`                          | Класс `HttpError` с кодом состояния                                        |

### 3.3 Хранилище и обработчики

Данные хранятся в массиве внутри функции `createDiagramStore`, которая возвращает методы `findAll`, `findById`, `create`, `replace` и `remove`. Счётчик идентификаторов растёт и не использует номера удалённых записей повторно. Хранилище передаётся в `createApp` параметром, поэтому тесты получают чистые данные, а при подключении базы данных меняется только модель, но не маршруты. При запуске в хранилище лежат две учебные диаграммы.

Обработчики не проверяют данные сами. Разбор адреса и тела вынесен в `validate.js`: `parseId` принимает только положительное целое число, а `validateDiagram` проверяет, что тело это объект, что `title`, `sourceCode` и `owner` непустые строки, а `notation` и `priority` входят в допустимые списки. Поле `priority` необязательно и по умолчанию равно `normal`. Лишние поля отбрасываются, поэтому клиент не может записать произвольные ключи или задать `id`. Метод `PUT` заменяет диаграмму целиком и требует те же поля, что и `POST`. Частичное обновление `PATCH` не реализовано, потому что условие его не требует.

### 3.4 Обработка ошибок

Все ошибки возвращаются в одном формате `{ "error": "сообщение" }`, а для неверных данных добавляется массив `details` с именем поля и причиной. Обработчики сообщают об ошибке вызовом `next(error)` с объектом `HttpError`, а глобальный обработчик из `error-handler.js` превращает его в ответ. Он же переводит ошибку разбора JSON в 400 с понятным сообщением, а любой непредвиденный сбой в 500 с общим текстом: подробности пишутся в журнал сервера и не доходят до клиента. Запрос к неизвестному пути получает 404 в формате JSON, а не страницу по умолчанию. Метод, которого нет у маршрута, например `PATCH`, получает 405 с заголовком `Allow`. Идентификатор принимается только в виде десятичных цифр без ведущего нуля, поэтому значения вроде `0x1`, `1e0` и `01` дают 400. Повторное удаление уже удалённой диаграммы даёт 404, потому что ресурса больше нет.

### 3.5 Проверка

Запросы проверены через `curl` и файл `requests.http` для расширения REST Client в VS Code, а затем зафиксированы автоматическими тестами. Тесты используют встроенный модуль `node:test` и настоящие HTTP-запросы к серверу на свободном порту. Всего 18 тестов: чтение списка и одной диаграммы, создание с проверкой заголовка `Location`, значение приоритета по умолчанию, отбрасывание лишних полей, ошибки данных, неверный и повреждённый JSON, замена, удаление с повторным удалением, запрет посторонних значений id, игнорирование id в теле запроса, превышение размера тела с кодом 413, неподдерживаемые методы с кодом 405, неизвестный маршрут и сбой с кодом 500. Результаты реальных запросов приведены в таблице 3.

Таблица 3 – Результаты запросов к запущенному серверу

| Запрос                                                       | Код | Тело ответа                                                 |
| ------------------------------------------------------------ | --- | ----------------------------------------------------------- |
| `GET /diagrams`                                              | 200 | массив из двух диаграмм                                     |
| `GET /diagrams/1`                                            | 200 | `{"id":1,"title":"Order processing","notation":"BPMN",...}` |
| `POST /diagrams` с полями title, notation, sourceCode, owner | 201 | созданная диаграмма с `id` 3 и приоритетом `normal`         |
| `PUT /diagrams/1`                                            | 200 | диаграмма с новыми значениями полей                         |
| `POST /diagrams` с пустым title и notation XYZ               | 400 | `{"error":"Invalid diagram data","details":[...]}`          |
| `GET /diagrams/99`                                           | 404 | `{"error":"Diagram 99 not found"}`                          |
| `DELETE /diagrams/2`                                         | 204 | пустое                                                      |
| `DELETE /diagrams/2` повторно                                | 404 | `{"error":"Diagram 2 not found"}`                           |
| `GET /diagrams/abc`                                          | 400 | `{"error":"Diagram id must be a positive integer"}`         |

Листинг файла server.js приведён в приложении А. Листинг файла app.js приведён в приложении Б. Листинг файла diagrams.routes.js приведён в приложении В. Листинг файла diagrams.controller.js приведён в приложении Г. Листинг файла diagram.model.js приведён в приложении Д. Листинг файла validate.js приведён в приложении Е. Листинг файла error-handler.js приведён в приложении Ж.

### 3.6 Постраничный вывод и сортировка

Список принимает параметры `limit`, `offset`, `sort` и `order`. Параметр `limit` задаёт размер страницы от 1 до 100, `offset` задаёт смещение от 0 до 1000000, `sort` выбирает поле из белого списка, а `order` принимает значения `asc` и `desc`. Без параметров возвращается весь список по возрастанию `id`, поэтому клиенты прежних работ продолжают работать. Ответ остаётся массивом, а полный размер выборки приходит в заголовке `X-Total-Count`. Числа читаются как строки не длиннее девяти цифр, поэтому значения `-1`, `1e9`, `0x10` и огромные числа получают ответ 400 со списком ошибок по полям. Имя поля сортировки проверяется по белому списку и не попадает в запрос к базе без проверки. Равные значения упорядочены по `id`, поэтому страницы не пересекаются. Разбор параметров вынесен в отдельный модуль, он приведён в приложении И.

## Заключение

Для проекта DSLKit создан REST API ресурса `diagrams` на Express: пять маршрутов выполняют чтение списка и одной записи, создание, полную замену и удаление, данные временно лежат в массиве в памяти. Ошибки приводятся к единому формату JSON с кодами 400, 404 и 500 через глобальный обработчик, запуск в режиме разработки идёт через `nodemon`, а 18 автоматических тестов подтверждают поведение каждого маршрута. Структура с маршрутами, контроллерами и моделью позволит в следующей работе заменить массив базой данных без переписывания остального кода. Остаётся приложить скриншоты запросов из Postman или браузера.

## Приложение А (обязательное) Листинг файла server.js

```js
const { createApp } = require('./src/app');

try {
  process.loadEnvFile();
} catch {
  // .env is optional, defaults apply
}

const port = Number(process.env.PORT) || 3000;

createApp().listen(port, () => console.log(`Server running on http://localhost:${port}`));
```

## Приложение Б (обязательное) Листинг файла app.js

```js
const express = require('express');
const { createDiagramStore } = require('./models/diagram.model');
const { createDiagramsController } = require('./controllers/diagrams.controller');
const { createDiagramsRouter } = require('./routes/diagrams.routes');
const { securityHeaders, requireJson } = require('./middleware/http');
const { LIMITS } = require('./models/diagram.model');
const { routeNotFound, errorHandler } = require('./middleware/error-handler');

const createApp = (store = createDiagramStore()) => {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  // Liveness probe for Docker and load balancers.
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  // The limit is set explicitly (limits.json), so it does not change with the library default.
  app.use(express.json({ limit: LIMITS.bodyBytes }));
  app.use(requireJson);
  app.use('/diagrams', createDiagramsRouter(createDiagramsController(store)));
  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
```

## Приложение В (обязательное) Листинг файла diagrams.routes.js

```js
const { Router } = require('express');
const { parseId, validateDiagram } = require('../middleware/validate');
const { allowMethods } = require('../middleware/http');


const createDiagramsRouter = (controller) => {
  const router = Router();
  router.route('/').get(controller.list).post(validateDiagram, controller.create).all(allowMethods(['GET', 'POST']));
  router
    .route('/:id')
    .get(parseId, controller.get)
    .put(parseId, validateDiagram, controller.replace)
    .delete(parseId, controller.remove)
    .all(allowMethods(['GET', 'PUT', 'DELETE']));
  return router;
};

module.exports = { createDiagramsRouter };
```

## Приложение Г (обязательное) Листинг файла diagrams.controller.js

```js
const { notFound } = require('../errors');
const { parseListQuery } = require('../middleware/list-query');

const missing = (id) => notFound(`Diagram ${id} not found`);

const SORTABLE = ['id', 'title', 'notation', 'priority', 'owner'];

// Numbers compare as numbers, text with the locale rules, equal values keep the order of ids.
const byField = (sort, order) => (a, b) => {
  const result = typeof a[sort] === 'number' ? a[sort] - b[sort] : String(a[sort]).localeCompare(String(b[sort]));
  return (order === 'desc' ? -result : result) || a.id - b.id;
};

const createDiagramsController = (store) => ({
  // ?limit=&offset=&sort=&order= (see list-query.js). The answer stays an array, the full size comes in X-Total-Count.
  list: (req, res) => {
    const { limit, offset, sort, order } = parseListQuery(req.query, SORTABLE);
    const all = [...store.findAll()].sort(byField(sort, order));
    res.set('X-Total-Count', String(all.length));
    res.json(all.slice(offset, limit === undefined ? undefined : offset + limit));
  },

  get: (req, res, next) => {
    const diagram = store.findById(req.diagramId);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  create: (req, res) => {
    const diagram = store.create(req.diagramFields);
    res.status(201).location(`/diagrams/${diagram.id}`).json(diagram);
  },

  replace: (req, res, next) => {
    const diagram = store.replace(req.diagramId, req.diagramFields);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  remove: (req, res, next) => (store.remove(req.diagramId) ? res.status(204).end() : next(missing(req.diagramId))),
});

module.exports = { createDiagramsController };
```

## Приложение Д (обязательное) Листинг файла diagram.model.js

```js
// Length limits live in limits.json, so they are not scattered over the code.
const LIMITS = require('../../limits.json');

const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];
const PRIORITIES = ['low', 'normal', 'high'];
const DEFAULT_PRIORITY = 'normal';

const SEED = [
  { title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> check -> pay -> ship', priority: 'high', owner: 'anna' },
  { title: 'Billing schema', notation: 'ERD', sourceCode: 'entity Invoice { id; total }', priority: 'normal', owner: 'boris' },
];

const createDiagramStore = (initial = SEED) => {
  let nextId = 1;
  let diagrams = [];

  const create = (fields) => {
    const diagram = { id: nextId, ...fields };
    nextId += 1;
    diagrams.push(diagram);
    return diagram;
  };

  initial.forEach(create);

  return {
    findAll: () => [...diagrams],
    findById: (id) => diagrams.find((d) => d.id === id),
    create,
    replace: (id, fields) => {
      const index = diagrams.findIndex((d) => d.id === id);
      if (index < 0) return undefined;
      diagrams[index] = { id, ...fields };
      return diagrams[index];
    },
    remove: (id) => {
      const before = diagrams.length;
      diagrams = diagrams.filter((d) => d.id !== id);
      return diagrams.length < before;
    },
  };
};

module.exports = { NOTATIONS, PRIORITIES, DEFAULT_PRIORITY, LIMITS, createDiagramStore };
```

## Приложение Е (обязательное) Листинг файла validate.js

```js
const { badRequest } = require('../errors');
const { NOTATIONS, PRIORITIES, DEFAULT_PRIORITY, LIMITS } = require('../models/diagram.model');

// Text is checked after trimming, so a value of spaces is empty and the stored value is what was measured.
const text = (name) => (v) => {
  if (typeof v !== 'string' || v.trim() === '') return 'must be a non-empty string';
  return v.trim().length <= LIMITS[name] || `must be at most ${LIMITS[name]} characters`;
};
const TRIMMED = ['title', 'owner'];

const checks = {
  title: text('title'),
  notation: (v) => NOTATIONS.includes(v) || `must be one of ${NOTATIONS.join(', ')}`,
  sourceCode: text('sourceCode'),
  priority: (v) => PRIORITIES.includes(v) || `must be one of ${PRIORITIES.join(', ')}`,
  owner: text('owner'),
};

const parseId = (req, _res, next) => {
  // Number() would accept '0x1', '1e0' and ' 1', so the raw text is checked first.
  const id = Number(req.params.id);
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id)) return next(badRequest('Diagram id must be a positive integer'));
  req.diagramId = id;
  return next();
};

// POST and PUT both carry the whole diagram, so one validator serves both.
// Priority is optional and falls back to the default; unknown fields are dropped.
const validateDiagram = (req, _res, next) => {
  const body = req.body;
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return next(badRequest('Request body must be a JSON object'));
  }
  const fields = { ...body, priority: body.priority ?? DEFAULT_PRIORITY };
  const details = Object.entries(checks)
    .map(([name, check]) => ({ field: name, result: check(fields[name]) }))
    .filter(({ result }) => result !== true)
    .map(({ field, result }) => ({ field, message: result }));
  if (details.length > 0) return next(badRequest('Invalid diagram data', details));
  req.diagramFields = Object.fromEntries(Object.keys(checks).map((name) => [name, TRIMMED.includes(name) ? fields[name].trim() : fields[name]]));
  return next();
};

module.exports = { parseId, validateDiagram };
```

## Приложение Ж (обязательное) Листинг файла error-handler.js

```js
const { notFound } = require('../errors');

const routeNotFound = (req, _res, next) => next(notFound(`Route ${req.method} ${req.path} not found`));

// Express treats a function with four parameters as error-handling middleware.
const errorHandler = (err, _req, res, next) => {
  // Once the response has started, only Express can close the connection properly.
  if (res.headersSent) return next(err);
  const malformedJson = err.type === 'entity.parse.failed';
  const status = malformedJson ? 400 : (err.status ?? 500);
  if (status >= 500) console.error(err);
  const body = {
    error: status >= 500 ? 'Internal server error' : malformedJson ? 'Malformed JSON in request body' : err.message,
  };
  if (err.details) body.details = err.details;
  return res.status(status).json(body);
};

module.exports = { routeNotFound, errorHandler };
```

## Приложение И (обязательное) Листинг файла list-query.js

```js
const { badRequest } = require('../errors');

// Limits of the list query. The page size is capped so one request cannot ask for the whole table,
// and the numbers are read as short digit strings, so 1e9, -1, 0x10 or a huge value are refused with 400.
const MAX_LIMIT = 100;
const MAX_OFFSET = 1000000;
const ORDERS = ['asc', 'desc'];

// Reads ?limit=, ?offset=, ?sort= and ?order= from req.query.
// sortable: the field names a client may sort by (a whitelist, so a field name never reaches the database unchecked).
// Without limit the whole list is returned (the clients of the earlier labs expect that), without sort the order is by id.
// A bad value throws the 400 error with the list of problems, Express 5 passes it to the error handler.
const parseListQuery = (query, sortable) => {
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

  if (problems.length) throw badRequest('Invalid list query', problems);
  return { limit, offset, sort, order };
};

module.exports = { parseListQuery, MAX_LIMIT, MAX_OFFSET };
```
