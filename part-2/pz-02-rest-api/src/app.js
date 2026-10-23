import { readFileSync } from 'node:fs';
import express from 'express';
import { ApiError, errorBody, notFound } from './errors.js';
import { createResourceRouter, listItems, methodsOnly, parseId } from './resource.js';
import { logSafe, rateLimit, securityHeaders } from './security.js';
import { buildOpenApi } from './openapi.js';
import { createStores } from './store.js';

// All sizes live in limits.json, not in the code.
export const LIMITS = JSON.parse(readFileSync(new URL('../limits.json', import.meta.url), 'utf8'));

export const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];

const ID = { type: 'integer', required: true, min: 1, max: LIMITS.idMax };

export const schemas = {
  users: {
    name: { type: 'string', required: true, max: LIMITS.userName },
    email: { type: 'string', required: true, max: LIMITS.userEmail, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    role: { type: 'string', enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
  },
  projects: {
    name: { type: 'string', required: true, max: LIMITS.projectName },
    description: { type: 'string', max: LIMITS.projectDescription, default: '' },
    ownerId: ID,
  },
  diagrams: {
    title: { type: 'string', required: true, max: LIMITS.diagramTitle },
    notation: { type: 'string', enum: NOTATIONS, required: true },
    code: { type: 'string', max: LIMITS.diagramCode, default: '' },
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

export const createApp = ({ stores = createStores(), writeError = console.error, limit = { windowMs: LIMITS.rateWindowMs, max: LIMITS.rateMax }, now = Date.now } = {}) => {
  const { users, projects, diagrams } = stores;
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  // Liveness probe, before the rate limit so monitoring never uses up the quota.
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  // Refused before the body is read, so a flood costs little.
  app.use(rateLimit({ ...limit, now }));
  app.use(express.json({ limit: LIMITS.bodyBytes }));
  // A body that express.json did not read (another Content-Type) is refused with 415, not taken as a missing body.
  app.use((req, res, next) => {
    const hasBody = Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined;
    if (hasBody && req.body === undefined) return next(new ApiError(415, 'unsupported_media_type', 'Content-Type must be application/json'));
    return next();
  });

  const api = express.Router();
  // The machine-readable description of the API, built from the schemas above.
  api.get('/openapi.json', (req, res) => res.json(buildOpenApi(schemas, { hidden: { users: ['email'] } })));
  // Link between resources: the projects that belong to one user. It is mounted before the standard router so it wins over /:id.
  api.get('/users/:id/projects', (req, res) => {
    const user = users.find(parseId(req.params.id));
    if (!user) throw notFound('User');
    res.json(
      listItems(
        projects.all().filter((p) => p.ownerId === user.id),
        schemas.projects,
        req.query,
      ),
    );
  });
  api.all('/users/:id/projects', methodsOnly('GET'));
  api.use(
    '/users',
    createResourceRouter({
      label: 'User',
      collection: users,
      schema: schemas.users,
      // The email is personal data: the list shows id, name and role, the email only comes with one user.
      hiddenInList: ['email'],
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
    res.status(201).json(diagrams.create({ ...rest, title: `${rest.title} (copy)`.slice(0, LIMITS.diagramTitle), status: 'draft' }));
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
