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
