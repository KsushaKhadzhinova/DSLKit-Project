import express from 'express';
import { ApiError, errorBody, notFound } from './errors.js';
import { createResourceRouter, listItems, parseId } from './resource.js';
import { createStores } from './store.js';

export const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];

export const schemas = {
  users: {
    name: { type: 'string', required: true, max: 60 },
    email: { type: 'string', required: true, max: 120, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    role: { type: 'string', enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
  },
  projects: {
    name: { type: 'string', required: true, max: 80 },
    description: { type: 'string', max: 500, default: '' },
    ownerId: { type: 'integer', required: true },
  },
  diagrams: {
    title: { type: 'string', required: true, max: 80 },
    notation: { type: 'string', enum: NOTATIONS, required: true },
    code: { type: 'string', max: 10000, default: '' },
    projectId: { type: 'integer', required: true },
    status: { type: 'string', enum: ['draft', 'published'], default: 'draft' },
  },
};

const missingReference = (field, collection, value) =>
  value !== undefined && !collection.find(value) ? [{ field, message: `${field} refers to a record that does not exist` }] : [];

const conflict = (message) => new ApiError(409, 'conflict', message);

export const createApp = ({ stores = createStores(), writeError = console.error } = {}) => {
  const { users, projects, diagrams } = stores;
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  api.use(
    '/users',
    createResourceRouter({
      label: 'User',
      collection: users,
      schema: schemas.users,
      hooks: {
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
    writeError(`[error] ${req.method} ${req.originalUrl}`, err);
    return res.status(500).json(errorBody(new ApiError(500, 'internal_error', 'Internal server error')));
  });
  return app;
};
