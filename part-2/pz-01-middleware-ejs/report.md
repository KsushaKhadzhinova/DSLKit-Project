# Практическое занятие №1. Middleware и шаблонизаторы

## 1 Цель работы

Освоить концепцию middleware в Express.js, разработать собственные middleware для журнала запросов, имитации авторизации и обработки ошибок и изучить шаблонизатор EJS для генерации динамических страниц на сервере на примере проекта DSLKit, веб-редактора диаграмм как кода, тематика которого соответствует направлению SaaS и будущему курсовому проекту. Вариант 26 чётный, поэтому журнал запросов ведётся не в файле, а в таблице базы данных.

## 2 Краткие теоретические сведения

**Middleware.** Это функция с параметрами `req`, `res` и `next`, которая видит запрос и ответ и либо завершает ответ, либо передаёт управление дальше вызовом `next()`. Функции выполняются в том порядке, в котором подключены, поэтому порядок подключения определяет поведение приложения. Обработчик ошибок отличается четырьмя параметрами и подключается последним.

**Шаблонизатор EJS.** Шаблон содержит HTML и вставки на JavaScript. Запись `<%= value %>` выводит значение с экранированием, запись `<% code %>` выполняет код, запись `<%- include() %>` подключает частичный шаблон. Данные передаются вторым аргументом `res.render()`.

**Хранение данных.** Записи каталога лежат в массиве в памяти процесса и пропадают при перезапуске сервера. Журнал запросов хранится в таблице базы данных SQLite, которую даёт встроенный модуль `node:sqlite`, поэтому установка отдельных пакетов для него не нужна.

## 3 Ход работы

### 3.1 Структура проекта

Проект лежит в каталоге `part-2/pz-01-middleware-ejs` и работает на Express 5 с шаблонизатором EJS. Структура показана в таблице 1.

Таблица 1 – Структура проекта практического занятия 1

| Файл | Назначение |
|---|---|
| `src/app.js` | Сборка приложения, порядок middleware и маршруты |
| `src/server.js` | Запуск сервера на порту |
| `src/middleware/requestLogger.js` | Запись каждого запроса в таблицу журнала |
| `src/middleware/fakeAuth.js` | Имитация авторизации |
| `src/middleware/errorHandlers.js` | Обработчики ошибок 404 и 500 |
| `src/data/requestLog.js` | Таблица `request_log` в SQLite |
| `src/data/diagrams.js` | Хранилище записей в памяти и проверка полей формы |
| `limits.json` | Все пределы длины и чисел |
| `views/` | Шаблоны EJS и частичные шаблоны |

Настройка EJS выполнена в `src/app.js`, где заданы `view engine` и каталог `views`. Общий каркас страниц вынесен в частичные шаблоны `header` и `footer`, которые подключаются в начале и в конце каждой страницы. Шаблон списка приведён в приложении Ж. Сборка приложения и порядок подключения middleware показаны в приложении З.

### 3.2 Журнал запросов в таблице базы данных

Middleware журнала подключается после статических файлов и имитации авторизации. До выполнения маршрута оно вставляет в таблицу `request_log` строку с временем, методом и адресом запроса, а когда ответ завершён, дописывает в эту строку код статуса и длительность. Тот же результат выводится в консоль. Такой порядок выбран намеренно: запись выполняется до маршрута, поэтому её сбой можно показать пользователю страницей 500, а после отправки ответа это уже невозможно. Таблица создаётся при первом обращении, если её нет, а подключение к базе открывается лениво, так что недоступная база не мешает запуску сервера и проявляется как ошибка запроса. Страница `/log` показывает последние строки таблицы, их число задаёт `limits.json`. Листинг приведён в приложении А, а описание таблицы в приложении Б.

### 3.3 Имитация авторизации

Middleware `fakeAuth` проверяет параметр `?auth=1`. Если он есть, в `req.user` попадает владелец, иначе гость, а в шаблоны передаются имя пользователя и хвост адреса для ссылок. Маршруты `/add` защищены функцией `requireAuth`: гость перенаправляется на страницу `/login`, где объяснено, как «войти». Листинг приведён в приложении В.

### 3.4 Маршруты и страницы

Реализованы четыре маршрута из условия и три служебных, они сведены в таблице 2.

Таблица 2 – Маршруты приложения

| Маршрут | Результат |
|---|---|
| `GET /` | Список диаграмм из массива с временем создания каждой записи |
| `GET /item/:id` | Детальная страница, неизвестный номер ведёт на страницу 404 |
| `GET /add` | Форма добавления, доступна с `?auth=1` |
| `POST /add` | Проверка полей, добавление в массив и переход на главную, при ошибке код 400 и форма с сохранёнными значениями |
| `GET /login` | Страница-подсказка |
| `GET /log` | Таблица журнала запросов |

Шаблоны выводят все значения с экранированием, поэтому введённая в форме разметка показывается как текст. У каждой записи есть поле «время создания». Оно задаётся при добавлении и всегда позже предыдущего, даже если две записи созданы в одну миллисекунду, поэтому записи не совпадают визуально.

### 3.5 Страница 500 и порядок обработчиков

Страница 500 показывается, когда запрос завершился ошибкой сервера. Обработчик ошибок имеет четыре параметра и подключён после всех маршрутов и всех middleware, поэтому любое исключение, будь то сбой записи в журнал, ошибка маршрута или сломанное тело запроса, попадает именно в него. Обработчик записывает ошибку в журнал ошибок, выбирает код ответа и рендерит шаблон `500.ejs` в общем оформлении сайта: с шапкой, подвалом и таблицей стилей. Если у ошибки есть собственный код, например 413 для слишком большой формы, он сохраняется, а страница получает заголовок «bad request». Если ошибку вызвала недоступная база журнала, на странице появляется понятное пояснение. Для сбоя до имитации авторизации обработчик сам подставляет гостя, чтобы шапка отрисовалась. Если даже шаблон 500 не удалось отрисовать, отправляется запасная страница с тем же оформлением, поэтому пользователь никогда не видит голый текст на чёрном фоне. Страницу 500 вызывает настоящий сбой, а не кнопка. Чтобы показать её на защите, запустите сервер командой `DB_FILE=package.json/blocked/log.db npm start`: файл базы нельзя создать, поэтому любой запрос заканчивается страницей 500. Второй способ состоит в остановке базы во время работы сервера. Страница 404 устроена так же и подключена перед обработчиком 500. Листинг приведён в приложении Г.

### 3.6 Проверка полей формы

Форма добавления проверяется на сервере, а те же пределы передаются в разметку как атрибуты `maxlength`, `min` и `max`. Сначала значения обрезаются по краям, поэтому поле из одних пробелов считается пустым. Правила сведены в таблице 3.

Таблица 3 – Проверки полей формы добавления

| Поле | Правило |
|---|---|
| Название | Обязательно, непустое после обрезки, не длиннее предела из `limits.json` |
| Описание | Обязательно, непустое после обрезки, не длиннее предела из `limits.json` |
| Нотация | Одно значение из списка |
| Код диаграммы | Необязательно, не длиннее предела из `limits.json` |
| Ревизия | Обязательна, целое число от 0 до предела из `limits.json`, отрицательные и дробные значения отвергаются |

При ошибке сервер отвечает кодом 400, снова показывает форму, оставляет введённые значения и пишет сообщение под каждым неверным полем. Пропавшее тело запроса и повторяющиеся ключи формы тоже дают код 400, а не 500. Все пределы лежат в файле `limits.json`, а не в коде. Листинг проверки приведён в приложении Д, а файл пределов в приложении Е.

### 3.7 Автоматическая проверка

Автоматические тесты на встроенном `node:test` запускают сервер на свободном порту и проверяют страницы, перенаправление гостя, добавление записи, проверку полей, экранирование, таблицу журнала, недоступную базу, уникальное время создания и обе страницы ошибок. Команда запуска: `npm test` в каталоге проекта.

## 4 Ответы на контрольные вопросы

@@ANSWERS@@

## Заключение

Для проекта DSLKit собрано приложение на Express с шаблонами EJS: список диаграмм, детальная страница и форма добавления получают данные из массива в памяти. Журнал запросов по правилам чётного варианта пишется в таблицу SQLite, а его сбой показывается оформленной страницей 500. Форма отвергает пустые и пробельные значения, слишком длинный текст и отрицательные числа по пределам из отдельного файла, а у каждой записи есть уникальное время создания. Автоматические тесты покрывают весь код. Остаётся приложить снимки страниц, сделанные в браузере.

## Приложение А (обязательное) Листинг файла requestLogger.js

```js
// Writes the request into the request_log table BEFORE the route runs, so a database failure
// reaches the error handler and the user sees the styled 500 page. Status and duration are added
// to the same row when the response finishes.
export const requestLogger =
  (log, write = console.log) =>
  (req, res, next) => {
    const startedAt = Date.now();
    let id;
    try {
      id = log.start({ time: new Date(startedAt).toISOString(), method: req.method, url: req.originalUrl });
    } catch (cause) {
      const error = new Error('Request log write failed', { cause });
      error.publicMessage = 'The request log table could not be written. Check the database file and try again.';
      return next(error);
    }
    res.on('finish', () => {
      const ms = Date.now() - startedAt;
      try {
        log.finish(id, res.statusCode, ms);
      } catch (error) {
        write(`[log] could not finish row ${id}: ${error.message}`);
      }
      write(`[${new Date(startedAt).toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    return next();
  };
```

## Приложение Б (обязательное) Листинг файла requestLog.js с таблицей журнала

```js
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS request_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    status INTEGER,
    duration_ms INTEGER
  )`;

// The request log is a table in a SQLite database. The connection opens lazily on first use,
// so a database that cannot be opened fails the request (and shows the 500 page), not the whole server.
export const openRequestLog = (file = ':memory:') => {
  let db = null;
  let statements = null;
  const connect = () => {
    if (statements) return statements;
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
    const opened = new DatabaseSync(file);
    try {
      opened.exec(CREATE_TABLE);
      statements = {
        insert: opened.prepare('INSERT INTO request_log (created_at, method, url) VALUES (?, ?, ?)'),
        finish: opened.prepare('UPDATE request_log SET status = ?, duration_ms = ? WHERE id = ?'),
        recent: opened.prepare('SELECT id, created_at AS time, method, url, status, duration_ms AS ms FROM request_log ORDER BY id DESC LIMIT ?'),
      };
    } catch (error) {
      opened.close();
      throw error;
    }
    db = opened;
    return statements;
  };
  return {
    start: ({ time, method, url }) => Number(connect().insert.run(time, method, url).lastInsertRowid),
    finish: (id, status, ms) => connect().finish.run(status, ms, id),
    recent: (limit) =>
      connect()
        .recent.all(limit)
        .map((row) => ({ ...row })),
    close: () => db?.close(),
  };
};
```

## Приложение В (обязательное) Листинг файла fakeAuth.js

```js
// Simulated authorization: ?auth=1 means "signed in as the owner", anything else is a guest.
export const fakeAuth = (req, res, next) => {
  const signedIn = req.query.auth === '1';
  req.user = signedIn ? { name: 'Owner', guest: false } : { name: 'Guest', guest: true };
  res.locals.user = req.user;
  res.locals.authQuery = signedIn ? '?auth=1' : '';
  next();
};

// Guards a single route: guests are redirected to /login.
export const requireAuth = (req, res, next) => (req.user.guest ? res.redirect('/login') : next());
```

## Приложение Г (обязательное) Листинг файла errorHandlers.js

```js
export const notFound = (req, res) => {
  res.status(404).render('404', { title: 'Not found', url: req.originalUrl });
};

// Last resort when even the 500 template fails: still a styled page, never a bare text screen.
const fallbackPage = (status) =>
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${status} – DSLKit</title><link rel="stylesheet" href="/style.css"></head>` +
  `<body><main class="page"><h1>${status} – server error</h1><p>The error page could not be drawn. The error was logged.</p><a href="/">Back to the list</a></main></body></html>`;

// Four parameters mark this as the error-handling middleware. It is mounted after every route and
// middleware, so any failure ends on the 500 page (or the 4xx variant for client errors).
export const serverError =
  (write = console.error) =>
  (err, req, res, _next) => {
    write(`[error] ${req.method} ${req.originalUrl}`, err);
    if (res.headersSent) return res.end();
    // Errors from body-parser and others carry their own 4xx/5xx status.
    const status = err.status >= 400 && err.status < 600 ? err.status : 500;
    const locals = {
      title: status >= 500 ? 'Server error' : 'Bad request',
      status,
      message: err.publicMessage ?? '',
      // The failure may happen before fakeAuth ran, so the page needs its own defaults.
      user: res.locals.user ?? { name: 'Guest', guest: true },
      authQuery: res.locals.authQuery ?? '',
    };
    return res.status(status).render('500', locals, (renderError, html) => {
      if (renderError) {
        write('[error] the 500 page failed to render', renderError);
        return res.type('html').send(fallbackPage(status));
      }
      return res.send(html);
    });
  };
```

## Приложение Д (обязательное) Листинг файла diagrams.js с проверкой формы

```js
export const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];

const seed = () => [
  {
    id: 1,
    title: 'Order service sequence',
    notation: 'UML',
    description: 'Sequence diagram of a checkout request passing through the API gateway.',
    code: 'sequenceDiagram\n  Client->>API: POST /orders\n  API->>DB: insert order\n  API-->>Client: 201 Created',
    revision: 3,
    createdAt: '2026-10-01T09:00:00.000Z',
  },
  {
    id: 2,
    title: 'Approval workflow',
    notation: 'BPMN',
    description: 'Business process: a diagram goes from draft to review to published.',
    code: 'start -> draft -> review -> published',
    revision: 1,
    createdAt: '2026-10-02T10:30:00.000Z',
  },
  {
    id: 3,
    title: 'Project database',
    notation: 'ERD',
    description: 'Entities user, project and diagram with one-to-many links.',
    code: 'user 1--* project\nproject 1--* diagram',
    revision: 0,
    createdAt: '2026-10-03T14:15:00.000Z',
  },
];

// Data lives in memory only, as the practical requires: no database for the diagrams.
// Every record gets its own creation time: it is always later than the previous one, even within one millisecond.
export const createDiagramStore = (now = Date.now) => {
  const items = seed();
  let nextId = items.length + 1;
  let last = Math.max(...items.map((item) => Date.parse(item.createdAt)));
  return {
    all: () => [...items],
    find: (id) => items.find((item) => item.id === id),
    add: ({ title, notation, description, code, revision }) => {
      last = Math.max(now(), last + 1);
      const item = { id: nextId, title, notation, description, code, revision, createdAt: new Date(last).toISOString() };
      nextId += 1;
      items.push(item);
      return item;
    },
  };
};

const required = (label, value, max) => {
  if (value === '') return `${label} is required`;
  if (value.length > max) return `${label} must be at most ${max} characters`;
  return null;
};

// Values arrive already trimmed, so a whitespace-only value is an empty one.
// Returns an object of field errors, empty when the input is valid. Limits come from limits.json.
export const validateDiagram = (input, limits) => {
  const errors = {};
  const set = (field, message) => message && (errors[field] = message);
  set('title', required('Title', input.title, limits.title.maxLength));
  set('description', required('Description', input.description, limits.description.maxLength));
  if (input.code.length > limits.code.maxLength) errors.code = `Code must be at most ${limits.code.maxLength} characters`;
  if (!NOTATIONS.includes(input.notation)) errors.notation = 'Choose a notation from the list';
  const { min, max } = limits.revision;
  if (input.revision === '') errors.revision = 'Revision is required';
  else if (!/^\d+$/.test(input.revision) || Number(input.revision) < min || Number(input.revision) > max) {
    errors.revision = `Revision must be a whole number from ${min} to ${max}`;
  }
  return errors;
};
```

## Приложение Е (обязательное) Файл пределов limits.json

```json
{
  "title": { "maxLength": 80 },
  "description": { "maxLength": 500 },
  "code": { "maxLength": 5000 },
  "revision": { "min": 0, "max": 100000 },
  "bodyLimit": "20kb",
  "logRows": 100
}
```

## Приложение Ж (обязательное) Листинг шаблона index.ejs

```ejs
<%- include('partials/header') %>
<h1>Diagrams</h1>
<% if (items.length === 0) { %>
  <p>No diagrams yet.</p>
<% } else { %>
  <table class="table">
    <thead>
      <tr><th>#</th><th>Title</th><th>Notation</th><th>Created</th></tr>
    </thead>
    <tbody>
      <% items.forEach((item) => { %>
        <tr>
          <td><%= item.id %></td>
          <td><a href="/item/<%= item.id %><%= authQuery %>"><%= item.title %></a></td>
          <td><%= item.notation %></td>
          <td><time datetime="<%= item.createdAt %>"><%= item.createdAt %></time></td>
        </tr>
      <% }) %>
    </tbody>
  </table>
<% } %>
<a class="button" href="/add<%= authQuery %>">Add diagram</a>
<%- include('partials/footer') %>
```

## Приложение З (обязательное) Листинг файла app.js

```js
import express from 'express';
import { fileURLToPath } from 'node:url';
import { createDiagramStore, validateDiagram, NOTATIONS } from './data/diagrams.js';
import { openRequestLog } from './data/requestLog.js';
import { requestLogger } from './middleware/requestLogger.js';
import { loadLimits } from './limits.js';
import { fakeAuth, requireAuth } from './middleware/fakeAuth.js';
import { notFound, serverError } from './middleware/errorHandlers.js';

const dir = (path) => fileURLToPath(new URL(path, import.meta.url));

const DEFAULT_DB_FILE = dir('../data/requests.db');

export const createApp = ({
  store = createDiagramStore(),
  limits = loadLimits(),
  log = openRequestLog(DEFAULT_DB_FILE),
  write = console.log,
  writeError = console.error,
} = {}) => {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', dir('../views'));

  app.locals.limits = limits;

  // Order matters: static files and the pure auth check come first, then the logger (which can fail
  // and hand over to the error handler), then the body parser and the routes. The two error
  // handlers are the very last, so every failure ends on a styled page.
  app.use(express.static(dir('../public')));
  app.use(fakeAuth);
  app.use(requestLogger(log, write));
  app.use(express.urlencoded({ extended: false, limit: limits.bodyLimit }));

  app.get('/', (req, res) => res.render('index', { title: 'Diagrams', items: store.all() }));

  app.get('/item/:id', (req, res, next) => {
    const item = store.find(Number(req.params.id));
    return item ? res.render('item', { title: item.title, item }) : next();
  });

  app.get('/add', requireAuth, (req, res) => res.render('add', { title: 'Add diagram', notations: NOTATIONS, errors: {}, values: { revision: '1' } }));

  app.post('/add', requireAuth, (req, res) => {
    const body = req.body ?? {};
    // Missing body or repeated keys (arrays) must not crash: only plain strings count.
    const text = (value) => (typeof value === 'string' ? value.trim() : '');
    const values = {
      title: text(body.title),
      notation: text(body.notation),
      description: text(body.description),
      code: text(body.code),
      revision: text(body.revision),
    };
    const errors = validateDiagram(values, limits);
    if (Object.keys(errors).length) {
      return res.status(400).render('add', { title: 'Add diagram', notations: NOTATIONS, errors, values });
    }
    store.add({ ...values, revision: Number(values.revision) });
    return res.redirect(`/${res.locals.authQuery}`);
  });

  app.get('/login', (req, res) => res.render('login', { title: 'Sign in' }));
  app.get('/log', (req, res) => res.render('log', { title: 'Request log', rows: log.recent(limits.logRows) }));

  app.use(notFound);
  app.use(serverError(writeError));
  return app;
};
```
