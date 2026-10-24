import express from 'express';
import { fileURLToPath } from 'node:url';
import { createDiagramStore, validateDiagram, NOTATIONS } from './data/diagrams.js';
import { describeFile, exportLog, sendLogFile } from './data/logFile.js';
import { openRequestLog } from './data/requestLog.js';
import { requestLogger } from './middleware/requestLogger.js';
import { loadLimits } from './limits.js';
import { fakeAuth, requireAuth } from './middleware/fakeAuth.js';
import { notFound, serverError } from './middleware/errorHandlers.js';
import { csrf, rateLimit, securityHeaders } from './middleware/security.js';

const dir = (path) => fileURLToPath(new URL(path, import.meta.url));

const DEFAULT_DB_FILE = dir('../data/requests.db');
const DEFAULT_LOG_FILE = dir('../data/request-log.txt');

export const createApp = ({
  store = createDiagramStore(),
  limits = loadLimits(),
  log = openRequestLog(DEFAULT_DB_FILE),
  logFile = process.env.LOG_EXPORT_FILE || DEFAULT_LOG_FILE,
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
  // Liveness probe for Docker and monitoring: placed before the rate limit and the log, so probes neither use up the quota nor fill the table.
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
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

  // Only plain digits are a number: Number() would also accept "0x1" or "1e0".
  const findItem = (req) => (/^\d{1,9}$/.test(req.params.id) ? store.find(Number(req.params.id)) : undefined);

  // Adding and editing share one template, only the texts and the address differ.
  const formView = { notations: NOTATIONS, heading: 'Add diagram', action: '/add', submit: 'Save diagram' };
  const editView = (item) => ({ ...formView, heading: 'Edit diagram', action: `/item/${item.id}/edit`, submit: 'Save changes' });

  // Repeated keys (arrays) must not crash: only plain strings count.
  const readForm = (body) => {
    const text = (value) => (typeof value === 'string' ? value.trim() : '');
    return {
      title: text(body.title),
      notation: text(body.notation),
      description: text(body.description),
      code: text(body.code),
      revision: text(body.revision),
    };
  };

  app.get('/item/:id', (req, res, next) => {
    const item = findItem(req);
    return item ? res.render('item', { title: item.title, item }) : next();
  });

  // The address of one record answers only to GET: another method is a mistake of the client, not a missing page.
  app.all('/item/:id', (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    res.set('Allow', 'GET, HEAD');
    return next(
      Object.assign(new Error('Method not allowed'), { status: 405, publicMessage: 'This address only answers GET. To change the record use its edit form.' }),
    );
  });

  app.get('/add', requireAuth, (req, res) => res.render('add', { ...formView, title: 'Add diagram', errors: {}, values: { revision: '1' } }));

  app.post('/add', requireAuth, (req, res) => {
    const values = readForm(req.body); // the CSRF check has already proved that the form body exists
    const errors = validateDiagram(values, limits);
    if (Object.keys(errors).length) {
      return res.status(400).render('add', { ...formView, title: 'Add diagram', errors, values });
    }
    store.add({ ...values, revision: Number(values.revision) });
    return res.redirect(`/${res.locals.authQuery}`);
  });

  // Edit and delete change data, so both need the simulated sign-in and the CSRF token (the delete button is a form, not a link).
  app.get('/item/:id/edit', requireAuth, (req, res, next) => {
    const item = findItem(req);
    if (!item) return next();
    return res.render('add', { ...editView(item), title: 'Edit diagram', errors: {}, values: { ...item, revision: String(item.revision) } });
  });

  app.post('/item/:id/edit', requireAuth, (req, res, next) => {
    const item = findItem(req);
    if (!item) return next();
    const values = readForm(req.body);
    const errors = validateDiagram(values, limits);
    if (Object.keys(errors).length) {
      return res.status(400).render('add', { ...editView(item), title: 'Edit diagram', errors, values });
    }
    store.update(item.id, { ...values, revision: Number(values.revision) });
    return res.redirect(`/item/${item.id}${res.locals.authQuery}`);
  });

  app.post('/item/:id/delete', requireAuth, (req, res, next) => {
    const item = findItem(req);
    if (!item) return next();
    store.remove(item.id);
    return res.redirect(`/${res.locals.authQuery}`);
  });

  app.get('/login', (req, res) => res.render('login', { title: 'Sign in' }));
  app.get('/log', requireAuth, async (req, res, next) => {
    try {
      res.render('log', { title: 'Request log', rows: log.recent(limits.logRows), file: await describeFile(logFile), exported: req.query.exported === '1' });
    } catch (error) {
      next(error);
    }
  });

  // The log can be written to a text file and downloaded; both steps use streams and every failure has its own page (see logFile.js and errors.js).
  app.post('/log/export', requireAuth, async (req, res, next) => {
    try {
      await exportLog(log, logFile);
      res.redirect(`/log?exported=1${res.locals.authQuery.replace('?', '&')}`);
    } catch (error) {
      next(error);
    }
  });

  app.get('/log/download', requireAuth, async (req, res, next) => {
    try {
      await sendLogFile(res, logFile, writeError);
    } catch (error) {
      next(error);
    }
  });

  // Clearing the log changes data, so it needs the simulated sign-in and the CSRF token, and it is a form, not a link.
  app.post('/log/clear', requireAuth, (req, res) => {
    log.clear();
    return res.redirect(`/log${res.locals.authQuery}`);
  });

  app.use(notFound);
  app.use(serverError(writeError));
  return app;
};
