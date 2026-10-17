# Практическое занятие №2. Проектирование и реализация REST API

## 1 Цель работы

Освоить принципы проектирования RESTful API, реализовать эндпоинты для операций CRUD и дополнительных операций, добавить проверку входных данных и описать API на примере проекта DSLKit, веб-редактора диаграмм как кода, тематика которого соответствует направлению SaaS и будущему курсовому проекту.

## 2 Краткие теоретические сведения

**Ресурсы и методы.** REST описывает предметную область как набор ресурсов с адресами во множественном числе, например `/api/diagrams`. Операции выражаются методами HTTP: `GET` читает, `POST` создаёт, `PUT` заменяет запись целиком, `PATCH` меняет часть полей, `DELETE` удаляет. Методы `GET`, `PUT` и `DELETE` идемпотентны: повтор запроса не меняет результат.

**Коды состояния.** Код 200 означает успех, 201 создание с заголовком `Location`, 204 успех без тела, 400 ошибку клиента в запросе, 404 отсутствие записи, 409 конфликт с текущим состоянием данных, 413 слишком большое тело, 500 сбой сервера.

**Проверка данных.** Сервер не доверяет клиенту: обязательные поля, типы, длина и допустимые значения проверяются до записи, а ответ с ошибкой имеет единый формат.

## 3 Ход работы

### 3.1 Проектирование API

Выбраны три связанных ресурса: пользователи `users`, проекты `projects` и диаграммы `diagrams`. Пользователь владеет проектами, проект содержит диаграммы. Поля и правила проверки сведены в таблице 1.

Таблица 1 – Ресурсы и поля API

| Ресурс     | Поля                                                                      |
| ---------- | ------------------------------------------------------------------------- |
| `users`    | `name`, `email`, `role` (`owner`, `editor`, `viewer`)                     |
| `projects` | `name`, `description`, `ownerId`                                          |
| `diagrams` | `title`, `notation`, `code`, `projectId`, `status` (`draft`, `published`) |

У каждой записи есть служебные поля `id` и `createdAt`, которые клиент изменить не может. Данные лежат в массивах в памяти, как требует условие, поэтому после перезапуска сервера возвращаются начальные записи.

### 3.2 Эндпоинты

Для каждого ресурса реализованы шесть стандартных операций, а для диаграмм и проектов три дополнительные. Все адреса приведены в таблице 2. Сборка приложения показана в приложении А, общая логика ресурсов в приложении Б, а проверка полей в приложении В.

Таблица 2 – Эндпоинты API

| Метод и адрес                      | Назначение                                           | Успех |
| ---------------------------------- | ---------------------------------------------------- | ----- |
| `GET /api/{ресурс}`                | Список с фильтром, поиском, сортировкой и страницами | 200   |
| `GET /api/{ресурс}/:id`            | Одна запись                                          | 200   |
| `POST /api/{ресурс}`               | Создание                                             | 201   |
| `PUT /api/{ресурс}/:id`            | Полная замена                                        | 200   |
| `PATCH /api/{ресурс}/:id`          | Частичное изменение                                  | 200   |
| `DELETE /api/{ресурс}/:id`         | Удаление                                             | 204   |
| `GET /api/projects/:id/diagrams`   | Диаграммы одного проекта                             | 200   |
| `POST /api/diagrams/:id/publish`   | Публикация, повтор ничего не меняет                  | 200   |
| `POST /api/diagrams/:id/duplicate` | Копия диаграммы в статусе черновика                  | 201   |

Списки принимают параметры `page` и `limit` для страниц, `sort` для сортировки (знак минус означает убывание), `q` для поиска по текстовым полям и любое имя поля для точного фильтра. Ответ списка содержит массив `data` и объект `meta` с общим числом записей. Подробные примеры запросов и ответов собраны в файле `API.md`.

### 3.3 Проверка входных данных и ошибки

Схема каждого ресурса задаёт тип, обязательность, предельную длину, список допустимых значений и значение по умолчанию. Проверка возвращает все найденные проблемы сразу, отвергает неизвестные поля и проверяет, что `ownerId` и `projectId` указывают на существующие записи. Метод `PATCH` проверяет только присланные поля. Удаление пользователя с проектами и проекта с диаграммами отклоняется кодом 409. Все ошибки, включая неверный JSON, неизвестный адрес и неожиданный сбой, возвращаются в одном формате с полями `code` и `message`. Листинги приведены в приложениях А и Б.

### 3.4 Проверка

Автоматические тесты запускают сервер на свободном порту и проверяют каждый метод, коды ответов, фильтры, сортировку, страницы, ошибки проверки, связи между ресурсами, дополнительные операции и ответ 500. Покрытие строк и функций равно 100 процентам, покрытие ветвей выше 98 процентов. Команда запуска: `npm test` в каталоге проекта. Ручную проверку в Postman или Insomnia можно выполнить запросами из `API.md`.

## Заключение

Для проекта DSLKit спроектирован и реализован REST API с тремя связанными ресурсами. Он поддерживает операции CRUD, фильтрацию, поиск, сортировку, страницы, публикацию и копирование диаграмм, проверяет входные данные и связи между записями и отвечает ошибками единого формата. Описание API и примеры запросов собраны в `API.md`, автоматические тесты покрывают весь код. Остаётся приложить снимки запросов из Postman и фрагменты документации.

## Приложение А (обязательное) Листинг файла app.js

```js
import express from 'express';
import { ApiError, errorBody, notFound } from './errors.js';
import { createResourceRouter, listItems, methodsOnly, parseId } from './resource.js';
import { logSafe, rateLimit, securityHeaders } from './security.js';
import { createStores } from './store.js';

export const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];

const ID = { type: 'integer', required: true, min: 1, max: 2147483647 };

export const schemas = {
  users: {
    name: { type: 'string', required: true, max: 60 },
    email: { type: 'string', required: true, max: 120, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    role: { type: 'string', enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
  },
  projects: {
    name: { type: 'string', required: true, max: 80 },
    description: { type: 'string', max: 500, default: '' },
    ownerId: ID,
  },
  diagrams: {
    title: { type: 'string', required: true, max: 80 },
    notation: { type: 'string', enum: NOTATIONS, required: true },
    code: { type: 'string', max: 10000, default: '' },
    projectId: ID,
    status: { type: 'string', enum: ['draft', 'published'], default: 'draft' },
  },
};

const CLIENT_ERRORS = {
  400: ['bad_request', 'The request URL or headers are malformed'],
  415: ['unsupported_media_type', 'The request encoding or charset is not supported'],
};

const missingReference = (field, collection, value) =>
  value !== undefined && !collection.find(value) ? [{ field, message: `${field} refers to a record that does not exist` }] : [];

const conflict = (message) => new ApiError(409, 'conflict', message);

export const createApp = ({ stores = createStores(), writeError = console.error, limit = { windowMs: 60000, max: 300 }, now = Date.now } = {}) => {
  const { users, projects, diagrams } = stores;
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  // Liveness probe, before the rate limit so monitoring never uses up the quota.
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  // Refused before the body is read, so a flood costs little.
  app.use(rateLimit({ ...limit, now }));
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  api.use(
    '/users',
    createResourceRouter({
      label: 'User',
      collection: users,
      schema: schemas.users,
      hooks: {
        check: (data, current) => {
          const taken = data.email !== undefined && users.all().some((user) => user !== current && user.email.toLowerCase() === data.email.toLowerCase());
          if (taken) throw conflict('A user with this email already exists');
          return [];
        },
        beforeRemove: (user) => {
          if (projects.all().some((project) => project.ownerId === user.id)) throw conflict('User still owns projects');
        },
      },
    }),
  );

  // Extra operations are mounted before the standard routers so they win over /:id.
  api.get('/projects/:id/diagrams', (req, res) => {
    const project = projects.find(parseId(req.params.id));
    if (!project) throw notFound('Project');
    res.json(
      listItems(
        diagrams.all().filter((d) => d.projectId === project.id),
        schemas.diagrams,
        req.query,
      ),
    );
  });
  api.all('/projects/:id/diagrams', methodsOnly('GET'));
  api.use(
    '/projects',
    createResourceRouter({
      label: 'Project',
      collection: projects,
      schema: schemas.projects,
      hooks: {
        check: (data) => missingReference('ownerId', users, data.ownerId),
        beforeRemove: (project) => {
          if (diagrams.all().some((diagram) => diagram.projectId === project.id)) throw conflict('Project still has diagrams');
        },
      },
    }),
  );

  const diagram = (req) => {
    const found = diagrams.find(parseId(req.params.id));
    if (!found) throw notFound('Diagram');
    return found;
  };
  api.post('/diagrams/:id/publish', (req, res) => res.json(diagrams.update(diagram(req), { status: 'published' })));
  api.post('/diagrams/:id/duplicate', (req, res) => {
    const { id, createdAt, ...rest } = diagram(req);
    res.status(201).json(diagrams.create({ ...rest, title: `${rest.title} (copy)`.slice(0, 80), status: 'draft' }));
  });
  api.all('/diagrams/:id/publish', methodsOnly('POST'));
  api.all('/diagrams/:id/duplicate', methodsOnly('POST'));
  api.use(
    '/diagrams',
    createResourceRouter({
      label: 'Diagram',
      collection: diagrams,
      schema: schemas.diagrams,
      hooks: { check: (data) => missingReference('projectId', projects, data.projectId) },
    }),
  );

  app.use('/api', api);
  app.use((req, res, next) => next(notFound('Route')));

  // Four parameters: the single place where every error becomes JSON.
  app.use((err, req, res, _next) => {
    if (err instanceof ApiError) return res.status(err.status).json(errorBody(err));
    if (err.type === 'entity.parse.failed') return res.status(400).json(errorBody(new ApiError(400, 'invalid_json', 'Request body is not valid JSON')));
    if (err.type === 'entity.too.large') return res.status(413).json(errorBody(new ApiError(413, 'payload_too_large', 'Request body is too large')));
    // Errors of the framework and of the body parser that blame the client keep their 4xx status: a broken
    // percent escape in the URL is 400 and an unsupported Content-Encoding is 415, neither is a server failure.
    const status = err.status ?? err.statusCode;
    if (status >= 400 && status < 500) {
      const known = CLIENT_ERRORS[status] ?? ['bad_request', 'The request cannot be processed'];
      return res.status(status).json(errorBody(new ApiError(status, known[0], known[1])));
    }
    writeError(`[error] ${logSafe(req.method)} ${logSafe(req.originalUrl)}`, err);
    return res.status(500).json(errorBody(new ApiError(500, 'internal_error', 'Internal server error')));
  });
  return app;
};
```

## Приложение Б (обязательное) Листинг файла resource.js

```js
import { Router } from 'express';
import { ApiError, notFound, validationFailed } from './errors.js';
import { applyDefaults, trimStrings, validate } from './validation.js';

// Answers 405 with an Allow header for methods a known path does not support; OPTIONS lists them.
export const methodsOnly = (...methods) => {
  const allow = [...methods, ...(methods.includes('GET') ? ['HEAD'] : []), 'OPTIONS'].join(', ');
  return (req, res, next) => {
    res.set('Allow', allow);
    if (req.method === 'OPTIONS') return res.status(204).end();
    return next(new ApiError(405, 'method_not_allowed', `${req.method} is not allowed here, use: ${allow}`));
  };
};

const DIGITS = /^[1-9]\d{0,14}$/;

export const parseId = (raw) => {
  if (!DIGITS.test(String(raw))) throw new ApiError(400, 'invalid_id', 'id must be a positive integer');
  return Number(raw);
};

const parsePositive = (raw, name, fallback, max = Number.MAX_SAFE_INTEGER) => {
  if (raw === undefined) return fallback;
  if (!DIGITS.test(String(raw)) || Number(raw) > max) throw new ApiError(400, 'invalid_query', `${name} must be an integer from 1 to ${max}`);
  return Number(raw);
};

// Filtering by any schema field (?status=draft), search (?q=text), sorting (?sort=-title), pagination (?page=2&limit=10).
export const listItems = (items, schema, query) => {
  const page = parsePositive(query.page, 'page', 1);
  const limit = parsePositive(query.limit, 'limit', 20, 100);
  let result = items.filter((item) => Object.keys(schema).every((field) => query[field] === undefined || String(item[field]) === String(query[field])));
  if (query.q !== undefined) {
    const needle = String(query.q).toLowerCase();
    const textFields = Object.keys(schema).filter((field) => schema[field].type === 'string');
    result = result.filter((item) =>
      textFields.some((field) =>
        String(item[field] ?? '')
          .toLowerCase()
          .includes(needle),
      ),
    );
  }
  if (query.sort !== undefined) {
    const desc = String(query.sort).startsWith('-');
    const field = String(query.sort).replace(/^-/, '');
    if (field !== 'id' && field !== 'createdAt' && !Object.hasOwn(schema, field)) throw new ApiError(400, 'invalid_query', `cannot sort by ${field}`);
    result = [...result].sort((a, b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * (desc ? -1 : 1));
  }
  const total = result.length;
  return { data: result.slice((page - 1) * limit, page * limit), meta: { page, limit, total } };
};

// Builds the six standard routes for one resource.
// hooks.check(data, current) returns extra validation details for the fields present (references)
// and may throw a conflict; current is the record being changed, undefined on create.
//
// hooks.beforeRemove(item) may throw.
export const createResourceRouter = ({ label, collection, schema, hooks = {} }) => {
  const router = Router();
  const body = (req, partial, current) => {
    const input = trimStrings(schema, req.body);
    const errors = validate(schema, input, { partial });
    const data = partial ? input : applyDefaults(schema, input);
    const details = errors.length ? errors : (hooks.check?.(data, current) ?? []);
    if (details.length) throw validationFailed(details);
    return data;
  };
  const load = (req) => {
    const item = collection.find(parseId(req.params.id));
    if (!item) throw notFound(label);
    return item;
  };

  router.get('/', (req, res) => res.json(listItems(collection.all(), schema, req.query)));
  router.get('/:id', (req, res) => res.json(load(req)));
  router.post('/', (req, res) => {
    const item = collection.create(body(req, false));
    res.status(201).location(`${req.baseUrl}/${item.id}`).json(item);
  });
  router.put('/:id', (req, res) => {
    const item = load(req);
    res.json(collection.replace(item, body(req, false, item)));
  });
  router.patch('/:id', (req, res) => {
    const item = load(req);
    res.json(collection.update(item, body(req, true, item)));
  });
  router.delete('/:id', (req, res) => {
    const item = load(req);
    hooks.beforeRemove?.(item);
    collection.remove(item);
    res.status(204).end();
  });
  router.all('/', methodsOnly('GET', 'POST'));
  router.all('/:id', methodsOnly('GET', 'PUT', 'PATCH', 'DELETE'));
  return router;
};
```

## Приложение В (обязательное) Листинг файла validation.js

```js
// A schema maps a field name to { type, required, max, enum, pattern, default }.
// Types: 'string', 'integer'. Returns a list of { field, message }.
const checkField = (name, rule, value) => {
  if (rule.type === 'integer') {
    if (!Number.isInteger(value)) return `${name} must be an integer`;
    if (value < rule.min || value > rule.max) return `${name} must be between ${rule.min} and ${rule.max}`;
  }
  if (rule.type === 'string') {
    if (typeof value !== 'string') return `${name} must be a string`;
    if (rule.required && value.trim() === '') return `${name} must not be empty`;
    if (rule.max && value.length > rule.max) return `${name} must be at most ${rule.max} characters`;
    if (rule.pattern && !rule.pattern.test(value)) return `${name} has an invalid format`;
  }
  if (rule.enum && !rule.enum.includes(value)) return `${name} must be one of: ${rule.enum.join(', ')}`;
  return null;
};

// partial=true is used by PATCH: required fields may be missing, present ones are still checked.
export const validate = (schema, body, { partial = false } = {}) => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return [{ field: 'body', message: 'body must be a JSON object' }];
  if (partial && Object.keys(body).length === 0) return [{ field: 'body', message: 'send at least one field to change' }];
  const errors = [];
  for (const field of Object.keys(body)) {
    if (!Object.hasOwn(schema, field)) errors.push({ field, message: `${field} is not a known field` });
  }
  for (const [field, rule] of Object.entries(schema)) {
    const value = body[field];
    if (value === undefined) {
      if (rule.required && !partial && rule.default === undefined) errors.push({ field, message: `${field} is required` });
      continue;
    }
    const message = checkField(field, rule, value);
    if (message) errors.push({ field, message });
  }
  return errors;
};

export const applyDefaults = (schema, body) => {
  const result = { ...body };
  for (const [field, rule] of Object.entries(schema)) {
    if (result[field] === undefined && rule.default !== undefined) result[field] = rule.default;
  }
  return result;
};

// Trims surrounding whitespace of known string fields, so " Ada " is stored as "Ada".
export const trimStrings = (schema, body) => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return body;
  const result = { ...body };
  for (const field of Object.keys(result)) {
    if (Object.hasOwn(schema, field) && typeof result[field] === 'string') result[field] = result[field].trim();
  }
  return result;
};
```
