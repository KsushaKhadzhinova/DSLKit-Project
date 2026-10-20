# Practical Session 1. Middleware and Template Engines

## 1 Purpose of the Work

To learn the middleware concept in Express.js, to write custom middleware for request logging, simulated authorization and error handling, and to study the EJS template engine for generating dynamic pages on the server, using the DSLKit project, a diagram-as-code web editor whose theme matches the SaaS direction and the future course project. Variant 26 is even, so the request log is kept not in a file but in a database table.

## 2 Brief Theory

**Middleware.** A middleware is a function with the parameters `req`, `res` and `next`. It sees the request and the response and either ends the response or passes control on by calling `next()`. Functions run in the order in which they are mounted, so the mounting order defines the behaviour of the application. An error handler differs by its four parameters and is mounted last.

**EJS template engine.** A template holds HTML with inserted JavaScript. The tag `<%= value %>` prints a value with escaping, the tag `<% code %>` runs code, and the tag `<%- include() %>` inserts a partial template. Data is passed as the second argument of `res.render()`.

**Data storage.** The catalogue records live in an array in the process memory and disappear when the server restarts. The request log is stored in a SQLite database table provided by the built-in module `node:sqlite`, so no extra package is needed for it.

## 3 Course of the Work

### 3.1 Project structure

The project lives in `part-2/pz-01-middleware-ejs` and runs on Express 5 with the EJS template engine. The structure is shown in table 1.

Table 1 – Structure of the practical session 1 project

| File | Purpose |
|---|---|
| `src/app.js` | Application assembly, middleware order and routes |
| `src/server.js` | Starts the server on a port |
| `src/middleware/requestLogger.js` | Writes every request into the log table |
| `src/middleware/fakeAuth.js` | Simulated authorization |
| `src/middleware/errorHandlers.js` | 404 and 500 error handlers |
| `src/middleware/security.js` | Security headers, CSRF token, rate limit, log escaping |
| `src/data/requestLog.js` | The `request_log` table in SQLite |
| `src/data/diagrams.js` | In-memory record store and form field validation |
| `limits.json` | All length and number limits |
| `views/` | EJS templates and partial templates |
| `public/` | Styles and logo from Part 1 of the project, theme switch |

EJS is configured in `src/app.js`, where the view engine and the views folder are set. The common page frame is moved into the partial templates `header` and `footer`, which are included at the start and at the end of every page. Appendix G holds the list template, and Appendix H holds the application assembly.

### 3.2 Request log in a database table

The logging middleware is mounted after the static files and the simulated authorization. Before the route runs it inserts a row with the time, the method and the URL into the `request_log` table, and when the response finishes it adds the status code and the duration to the same row. The same result goes to the console. This order is deliberate: the write happens before the route, so its failure can still be shown to the user as a 500 page, while after the response is sent that is no longer possible. The table is created on first use if it does not exist, and the database connection opens lazily, so an unavailable database does not stop the server from starting and shows up as a request error instead. The `/log` page shows the latest rows of the table, and `limits.json` sets how many. Appendix A holds the listing and Appendix B holds the table description.

### 3.3 Simulated authorization

The `fakeAuth` middleware checks the parameter `?auth=1`. When it is present, the owner is placed in `req.user`, otherwise a guest, and the templates receive the user name and the query tail for links. The `/add` routes are guarded by `requireAuth`: a guest is redirected to the `/login` page, which explains how to "sign in". Appendix C holds the listing.

### 3.4 Routes and pages

The four routes from the task and three service routes are implemented, and Table 2 lists them.

Table 2 – Application routes

| Route | Result |
|---|---|
| `GET /` | List of diagrams from the array with the creation time of every record |
| `GET /item/:id` | Detail page, an unknown id leads to the 404 page |
| `GET /add` | Add form, available with `?auth=1` |
| `POST /add` | Field validation, adding to the array and redirect to the home page, on an error status 400 and the form with the entered values |
| `GET /login` | Hint page |
| `GET /log` | Table of the request log, available with `?auth=1` |

The templates print every value with escaping, so markup typed into the form is shown as text. Every record has a "creation time" field. It is set when the record is added and is always later than the previous one, even if two records are created in the same millisecond, so records never look identical.

### 3.5 The 500 page and the order of handlers

The 500 page is shown when a request ends with a server error. The error handler has four parameters and is mounted after all routes and all middleware, so any exception, whether a log write failure, a route error or a broken request body, reaches it. The handler writes the error to the error log, chooses the status code and renders the `500.ejs` template in the common site design: with the header, the footer and the style sheet. When the error carries its own code, for example 413 for an oversized form, the code is kept and the page gets its own heading, for example "Request too large". When the error comes from an unavailable log database, the page shows a clear explanation. For a failure before the simulated authorization the handler supplies a guest itself so that the header can be drawn. If even the 500 template fails to render, a fallback page with the same styling is sent, so the user never sees bare text on a black background. The 500 page is caused by a real failure, not by a button. To show it at the defence, start the server with `DB_FILE=package.json/blocked/log.db npm start`: the database file cannot be created, so every request ends with the 500 page. The second way is to stop the database while the server is running. The 404 page works the same way and is mounted before the 500 handler. Appendix D holds the listing.

### 3.6 Form field checks

The add form is validated on the server, and the same limits are passed to the markup as the attributes `maxlength`, `min` and `max`. Values are trimmed first, so a field of only spaces counts as empty. The rules are listed in table 3.

Table 3 – Checks of the add form fields

| Field | Rule |
|---|---|
| Title | Required, not empty after trimming, not longer than the limit in `limits.json` |
| Description | Required, not empty after trimming, not longer than the limit in `limits.json` |
| Notation | One value from the list |
| Diagram code | Optional, not longer than the limit in `limits.json` |
| Revision | Required, a whole number from 0 to the limit in `limits.json`, negative and fractional values are rejected |

On an error the server answers with status 400, shows the form again, keeps the entered values and prints a message under every wrong field. A missing request body and repeated form keys give status 400 instead of 500. All limits live in the file `limits.json`, not in the code. Appendix E holds the validation listing and appendix F holds the limits file.

### 3.7 Protection of the form and the server

The form and the server are protected against common attacks, all by hand and without new packages. To stop cross-site request forgery the server puts a random token into the `dslkit_csrf` cookie with the flags `HttpOnly` and `SameSite=Strict` and into a hidden form field. A request that changes data is accepted only when both values match and the `Origin` header, when present, points to this very site. Otherwise a page with status 403 is shown. Every response carries the headers `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options` and `Referrer-Policy`, and the framework name is hidden from the headers. The policy forbids inline scripts and styles, so the templates have none. The rate limit answers with status 429, a page in the common design and the `Retry-After` header: the general limit and a stricter limit for form submissions live in `limits.json`. The size of the form body and the number of its fields are limited by the same file, so huge values give a page with status 400 or 413 instead of a crash. The request URL goes through escaping before it reaches the log: line breaks and control characters are replaced with the notation \uXXXX and the length is cut, so an attacker cannot forge log lines. The `/log` page opens only with `?auth=1`, because it shows the addresses of other requests. Appendix I holds the listing.

### 3.8 Appearance of the pages

The pages take their design from Part 1 of the project: the header with the logo and navigation, the footer, the buttons, the cards and the form fields use the same styles and markup as the DSLKit site and application. The light and dark theme switch works as in Part 1, and the header stays fixed while scrolling. Every page has one main button. The list of diagrams with the creation time of every record is shown in figure 1.

![Diagram list](figures/list.png)

Figure 1 – Home page with diagram cards and creation times

The detail page of one record with its revision and code is shown in figure 2.

![Detail page](figures/detail.png)

Figure 2 – Diagram page with the description, the revision and the source code

The form after sending a whitespace-only title and a negative revision is shown in figure 3. A message stands under every wrong field and the entered values are kept.

![Form with errors](figures/form-errors.png)

Figure 3 – Add form with messages about the empty title and the negative revision

The request log table from the database is shown in figure 4.

![Request log](figures/log.png)

Figure 4 – Log page with the latest rows of the request_log table

The 404 page for an unknown address is shown in figure 5.

![404 page](figures/not-found.png)

Figure 5 – The 404 error page in the site design

The 500 page during a real failure is shown in figure 6. The server was started with a database file that cannot be created, so the log write failed.

![500 page](figures/server-error.png)

Figure 6 – The 500 error page with an explanation about the unavailable log table

### 3.9 Automatic verification

Automatic tests on the built-in `node:test` start the server on a free port and check the pages, the guest redirect, adding an item, field validation, escaping, the log table, an unavailable database, the unique creation time, both error pages, the CSRF token, the security headers, the rate limit, log escaping and huge values. The command is `npm test` in the project folder.

## 4 Answers to Control Questions

@@ANSWERS@@

## Conclusion

For the DSLKit project an Express application with EJS templates was built: the list of diagrams, the detail page and the add form take data from an array in memory. By the rules of the even variant the request log is written to a SQLite table, and its failure is shown with a styled 500 page. The form rejects empty and whitespace values, text that is too long and negative numbers using limits from a separate file, and every record has a unique creation time. The form is protected by a CSRF token, and the server by security headers and a rate limit. The design is taken from Part 1 of the project. Automatic tests cover all the code, and screenshots of the pages are given in the text.

## Appendix A (mandatory) Listing of the file requestLogger.js

```js
import { safeLogText } from './security.js';

// Writes the request into the request_log table BEFORE the route runs, so a database failure
// reaches the error handler and the user sees the styled 500 page. Status and duration are added
// to the same row when the response finishes.
export const requestLogger =
  (log, write = console.log, urlMax = 500) =>
  (req, res, next) => {
    const startedAt = Date.now();
    // The address is user input: line breaks and control characters are escaped and the length is cut (log injection).
    const url = safeLogText(req.originalUrl, urlMax);
    let id;
    try {
      id = log.start({ time: new Date(startedAt).toISOString(), method: req.method, url });
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
      write(`[${new Date(startedAt).toISOString()}] ${req.method} ${url} ${res.statusCode} ${ms}ms`);
    });
    return next();
  };
```

## Appendix B (mandatory) Listing of the file requestLog.js with the log table

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
    close: () => {
      // A second close must not throw: the connection is closed once and then forgotten.
      if (db) db.close();
      db = null;
    },
  };
};
```

## Appendix C (mandatory) Listing of the file fakeAuth.js

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

## Appendix D (mandatory) Listing of the file errorHandlers.js

```js
import { safeLogText } from './security.js';

export const notFound = (req, res) => {
  res.status(404).render('404', { title: 'Not found', url: req.originalUrl });
};

const HEADINGS = { 403: 'Request refused', 413: 'Request too large', 429: 'Too many requests' };

// Last resort when even the 500 template fails: still a styled page, never a bare text screen.
const fallbackPage = (status) =>
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${status} – DSLKit</title><link rel="stylesheet" href="/dslkit.css"><link rel="stylesheet" href="/pz.css"></head>` +
  `<body class="page"><main class="main"><section class="error"><p class="error__code">Error code: ${status}</p><h1 class="error__title">${status} – server error</h1><p class="error__text">The error page could not be drawn. The error was logged.</p><a class="button button--primary" href="/">Back to the list</a></section></main></body></html>`;

// Four parameters mark this as the error-handling middleware. It is mounted after every route and
// middleware, so any failure ends on the 500 page (or the 4xx variant for client errors).
export const serverError =
  (write = console.error) =>
  (err, req, res, _next) => {
    write(`[error] ${safeLogText(req.method)} ${safeLogText(req.originalUrl)}`, err);
    if (res.headersSent) return res.end();
    if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));
    // Errors from body-parser and others carry their own 4xx/5xx status.
    const status = err.status >= 400 && err.status < 600 ? err.status : 500;
    const heading = HEADINGS[status] ?? (status >= 500 ? 'Server error' : 'Bad request');
    const locals = {
      title: heading,
      heading,
      status,
      message: err.publicMessage ?? '',
      // The failure may happen before fakeAuth ran, so the page needs its own defaults.
      user: res.locals.user ?? { name: 'Guest', guest: true },
      authQuery: res.locals.authQuery ?? '',
      path: '',
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

## Appendix E (mandatory) Listing of the file diagrams.js with the form checks

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

## Appendix F (mandatory) The limits file limits.json

```json
{
  "title": { "maxLength": 80 },
  "description": { "maxLength": 500 },
  "code": { "maxLength": 5000 },
  "revision": { "min": 0, "max": 100000 },
  "bodyLimit": "20kb",
  "parameterLimit": 20,
  "logRows": 100,
  "logUrlMax": 500,
  "rateLimit": {
    "all": { "windowMs": 60000, "max": 300 },
    "write": { "windowMs": 60000, "max": 20 }
  }
}
```

## Appendix G (mandatory) Listing of the template index.ejs

```ejs
<%- include('partials/header') %>
<section class="section" aria-labelledby="page-title">
  <h1 class="section__title" id="page-title">Diagrams</h1>
  <p class="section__lead">The catalogue of diagrams stored by the server. Every record shows when it was created.</p>
  <% if (items.length === 0) { %>
    <p class="note">No diagrams yet.</p>
  <% } else { %>
    <ul class="cards">
      <% items.forEach((item) => { %>
        <li class="cards__item">
          <article class="card">
            <h2 class="card__title"><%= item.title %></h2>
            <p class="card__meta">
              <span class="badge"><%= item.notation %></span>
              <span>#<%= item.id %></span>
              <span>Created <time datetime="<%= item.createdAt %>"><%= formatTime(item.createdAt) %></time></span>
            </p>
            <p class="card__text"><%= item.description %></p>
            <a class="card__link" href="/item/<%= item.id %><%= authQuery %>">Open<span class="visually-hidden"> <%= item.title %></span></a>
          </article>
        </li>
      <% }) %>
    </ul>
  <% } %>
  <div class="page-actions">
    <a class="button button--primary" href="/add<%= authQuery %>">Add diagram</a>
  </div>
</section>
<%- include('partials/footer') %>
```

## Appendix H (mandatory) Listing of the file app.js

```js
import express from 'express';
import { fileURLToPath } from 'node:url';
import { createDiagramStore, validateDiagram, NOTATIONS } from './data/diagrams.js';
import { openRequestLog } from './data/requestLog.js';
import { requestLogger } from './middleware/requestLogger.js';
import { loadLimits } from './limits.js';
import { fakeAuth, requireAuth } from './middleware/fakeAuth.js';
import { notFound, serverError } from './middleware/errorHandlers.js';
import { csrf, rateLimit, securityHeaders } from './middleware/security.js';

const dir = (path) => fileURLToPath(new URL(path, import.meta.url));

const DEFAULT_DB_FILE = dir('../data/requests.db');

export const createApp = ({
  store = createDiagramStore(),
  limits = loadLimits(),
  log = openRequestLog(DEFAULT_DB_FILE),
  write = console.log,
  writeError = console.error,
  now = Date.now,
} = {}) => {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', dir('../views'));

  app.disable('x-powered-by');
  app.locals.limits = limits;
  // Records keep the exact ISO time for the machine; people read "2026-10-01 09:00:00.000 UTC".
  app.locals.formatTime = (iso) => String(iso).replace('T', ' ').replace('Z', ' UTC');

  // Order matters: headers first so every answer has them, then static files and the pure checks,
  // then the rate limits (a flood is refused before it reaches the database), then the logger (which can fail
  // and hand over to the error handler), the body parser and the CSRF check (the token is a form field), then the routes.
  // The two error handlers are the very last, so every failure ends on a styled page.
  app.use(securityHeaders);
  app.use(express.static(dir('../public')));
  app.use((req, res, next) => {
    res.locals.path = req.path;
    next();
  });
  app.use(fakeAuth);
  app.use(rateLimit({ ...limits.rateLimit.all, now }));
  app.use(rateLimit({ ...limits.rateLimit.write, only: ['POST'], now }));
  app.use(requestLogger(log, write, limits.logUrlMax));
  app.use(express.urlencoded({ extended: false, limit: limits.bodyLimit, parameterLimit: limits.parameterLimit }));
  app.use(csrf);

  app.get('/', (req, res) => res.render('index', { title: 'Diagrams', items: store.all() }));

  app.get('/item/:id', (req, res, next) => {
    // Only plain digits are a number: Number() would also accept "0x1" or "1e0".
    const item = /^\d{1,9}$/.test(req.params.id) ? store.find(Number(req.params.id)) : undefined;
    return item ? res.render('item', { title: item.title, item }) : next();
  });

  app.get('/add', requireAuth, (req, res) => res.render('add', { title: 'Add diagram', notations: NOTATIONS, errors: {}, values: { revision: '1' } }));

  app.post('/add', requireAuth, (req, res) => {
    const body = req.body; // the CSRF check has already proved that the form body exists
    // Repeated keys (arrays) must not crash: only plain strings count.
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
  app.get('/log', requireAuth, (req, res) => res.render('log', { title: 'Request log', rows: log.recent(limits.logRows) }));

  app.use(notFound);
  app.use(serverError(writeError));
  return app;
};
```

## Appendix I (mandatory) Listing of the file security.js

```js
import { randomBytes, timingSafeEqual } from 'node:crypto';

// Security headers set by hand, no extra package. The pages use only files from the same origin,
// so the policy can be strict: no inline script or style, no framing, forms post only to this site.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const securityHeaders = (req, res, next) => {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    // same-origin, not no-referrer: with no-referrer browsers send "Origin: null" with every form, and the Origin check below would refuse the site's own forms.
    'Referrer-Policy': 'same-origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
};

const COOKIE = 'dslkit_csrf';
const TOKEN = /^[0-9a-f]{48}$/;
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const readCookie = (header = '', name) => {
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
};

const sameToken = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const refused = (message) => Object.assign(new Error(message), { status: 403, publicMessage: message });

// CSRF protection with a double-submit token: the server puts a random token into a SameSite=Strict cookie
// and into a hidden field of every form. A state-changing request must send both and they must match.
// A page of another site can neither read the cookie nor guess the token. The Origin header is checked as well when it is present.
// It runs after the form parser, because the token is a field of the form body.
export const csrf = (req, res, next) => {
  let token = readCookie(req.headers.cookie, COOKIE);
  const known = TOKEN.test(token ?? '');
  if (UNSAFE.has(req.method)) {
    const origin = req.headers.origin;
    if (origin && origin !== `${req.protocol}://${req.headers.host}`) return next(refused('The request comes from another site and was refused.'));
    if (!known || !sameToken(token, req.body?._csrf)) return next(refused('The form token is missing or wrong. Open the form again and resend it.'));
  }
  if (!known) {
    token = randomBytes(24).toString('hex');
    res.append('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict${req.secure ? '; Secure' : ''}`);
  }
  res.locals.csrfToken = token;
  next();
};

const tooMany = (retryAfter) => Object.assign(new Error('Too many requests'), { status: 429, retryAfter, publicMessage: `Too many requests. Try again in ${retryAfter} s.` });

// Fixed-window rate limit per client address, kept in memory. `only` limits it to some methods.
export const rateLimit = ({ windowMs, max, only, now = Date.now }) => {
  const hits = new Map();
  return (req, res, next) => {
    if (only && !only.includes(req.method)) return next();
    const time = now();
    if (hits.size > 10000) for (const [key, entry] of hits) if (entry.reset <= time) hits.delete(key);
    const key = req.ip ?? 'unknown';
    let entry = hits.get(key);
    if (!entry || entry.reset <= time) {
      entry = { count: 0, reset: time + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count <= max) return next();
    const retryAfter = Math.max(1, Math.ceil((entry.reset - time) / 1000));
    res.set('Retry-After', String(retryAfter));
    return next(tooMany(retryAfter));
  };
};

// Control characters (line breaks, tabs, escape codes) in user input could forge extra lines in a log, so they are escaped.
// The text is also cut, so one huge address cannot fill the log.
export const safeLogText = (text, max = 500) => {
  let escaped = '';
  for (const char of String(text)) {
    const code = char.codePointAt(0);
    const control = code < 32 || (code >= 127 && code <= 159) || code === 0x2028 || code === 0x2029;
    escaped += control ? `\\u${code.toString(16).padStart(4, '0')}` : char;
  }
  return escaped.length > max ? `${escaped.slice(0, max)}…` : escaped;
};
```
