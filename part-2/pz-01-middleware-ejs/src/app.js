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
