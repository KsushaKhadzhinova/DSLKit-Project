import express from 'express';
import { fileURLToPath } from 'node:url';
import { createDiagramStore, validateDiagram, NOTATIONS } from './data/diagrams.js';
import { createRequestLog, requestLogger } from './middleware/requestLogger.js';
import { fakeAuth, requireAuth } from './middleware/fakeAuth.js';
import { notFound, serverError } from './middleware/errorHandlers.js';

const dir = (path) => fileURLToPath(new URL(path, import.meta.url));

export const createApp = ({ store = createDiagramStore(), log = createRequestLog(), write = console.log, writeError = console.error } = {}) => {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', dir('../views'));

  app.use(express.static(dir('../public')));
  app.use(requestLogger(log, write));
  app.use(fakeAuth);
  app.use(express.urlencoded({ extended: false }));

  app.get('/', (req, res) => res.render('index', { title: 'Diagrams', items: store.all() }));

  app.get('/item/:id', (req, res, next) => {
    const item = store.find(Number(req.params.id));
    return item ? res.render('item', { title: item.title, item }) : next();
  });

  app.get('/add', requireAuth, (req, res) => res.render('add', { title: 'Add diagram', notations: NOTATIONS, errors: {}, values: {} }));

  app.post('/add', requireAuth, (req, res) => {
    const body = req.body ?? {};
    // Missing body or repeated keys (arrays) must not crash: only plain strings count.
    const text = (value) => (typeof value === 'string' ? value.trim() : '');
    const values = { title: text(body.title), notation: text(body.notation), description: text(body.description), code: text(body.code) };
    const errors = validateDiagram(values);
    if (Object.keys(errors).length) {
      return res.status(400).render('add', { title: 'Add diagram', notations: NOTATIONS, errors, values });
    }
    store.add(values);
    return res.redirect(`/${res.locals.authQuery}`);
  });

  app.get('/login', (req, res) => res.render('login', { title: 'Sign in' }));
  app.get('/log', (req, res) => res.render('log', { title: 'Request log', rows: log.all() }));

  // Deliberate failure to demonstrate the 500 page.
  app.get('/boom', () => {
    throw new Error('Demo failure');
  });

  app.use(notFound);
  app.use(serverError(writeError));
  return app;
};
