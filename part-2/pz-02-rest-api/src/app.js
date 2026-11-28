import express from 'express';
import { ApiError, errorBody, forbidden, notFound, routeNotFound } from './errors.js';
import { createResourceRouter, listItems, methodsOnly, parseId } from './resource.js';
import { identify, logSafe, rateLimit, requestId, securityHeaders } from './security.js';
import { PAGE_CSP, renderErrorPage, wantsHtml } from './error-page.js';
import { buildOpenApi } from './openapi.js';
import { createJournal, journaling } from './journal.js';
import { LIMITS } from './limits.js';
import { createStores } from './store.js';
import { normalizeEmail } from './validation.js';

export { LIMITS };

export const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];

const ID = { type: 'integer', required: true, min: 1, max: LIMITS.idMax };

// Local part: ASCII, no leading/trailing/doubled dot. Domain: one or more dot-separated labels, no leading,
// trailing or doubled hyphen or dot. Every alternation below is a single, disjoint character class repeated
// with its own quantifier, so there is no ambiguity for the engine to backtrack over; matching stays linear
// in the length of the string even for a deliberately pathological input.
const LOCAL_PART = "[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*";
const DOMAIN_LABEL = '[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?';
const EMAIL_PATTERN = new RegExp(`^${LOCAL_PART}@${DOMAIN_LABEL}(?:\\.${DOMAIN_LABEL})+$`);

export const schemas = {
  users: {
    name: { type: 'string', required: true, max: LIMITS.userName },
    email: { type: 'string', required: true, max: LIMITS.userEmail, pattern: EMAIL_PATTERN, transform: normalizeEmail },
    role: { type: 'string', enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
  },
  projects: {
    name: { type: 'string', required: true, max: LIMITS.projectName },
    description: { type: 'string', max: LIMITS.projectDescription, default: '', multiline: true },
    ownerId: ID,
  },
  diagrams: {
    title: { type: 'string', required: true, max: LIMITS.diagramTitle },
    notation: { type: 'string', enum: NOTATIONS, required: true },
    code: { type: 'string', max: LIMITS.diagramCode, default: '', multiline: true },
    projectId: ID,
    status: { type: 'string', enum: ['draft', 'published'], default: 'draft' },
  },
};

const CLIENT_ERRORS = {
  400: ['bad_request', 'The request URL or headers are malformed'],
  415: ['unsupported_media_type', 'The request encoding or charset is not supported'],
};

// A reference to a record that is gone (deleted a moment ago, or never existed) is a conflict with the current state
// of the data, not a malformed body: 409, one error format, nothing is stored.
const missingReference = (field, collection, value) => {
  if (value === undefined || collection.find(value)) return [];
  const message = `${field} refers to a record that does not exist`;
  throw new ApiError(409, 'parent_missing', message, [{ field, message }]);
};

const conflict = (message) => new ApiError(409, 'conflict', message);

// Methods that normally send no body; a body on one of these is simply not read rather than being a reason
// to reject the request (a non-JSON Content-Type is only an error on a request that is meant to carry JSON).
const BODYLESS_METHODS = new Set(['GET', 'HEAD', 'DELETE']);

export const createApp = ({
  stores = createStores(undefined, LIMITS.maxRecordsPerCollection),
  writeError = console.error,
  limit = { windowMs: LIMITS.rateWindowMs, max: LIMITS.rateMax, maxClients: LIMITS.rateMaxClients },
  now = Date.now,
  journal = createJournal(),
} = {}) => {
  const { users, projects, diagrams } = stores;
  const app = express();
  app.disable('x-powered-by');
  app.use(requestId);
  app.use(securityHeaders);
  // Liveness probe, before the rate limit so monitoring never uses up the quota.
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  // Refused before the body is read, so a flood costs little.
  app.use(rateLimit({ ...limit, now }));
  // Every request is written to the journal table before it runs; a failed write answers 500 and nothing else happens.
  app.use(journaling(journal, writeError));
  // This API answers only JSON; a client that explicitly asks for something else gets 406 instead of JSON it
  // did not ask for. A request with no Accept header, or "*/*", is always welcome.
  app.use((req, res, next) => {
    const accept = req.headers.accept;
    if (!accept) return next();
    const acceptsJson = accept.split(',').some((part) => {
      const type = part.split(';')[0].trim().toLowerCase();
      return type === '*/*' || type === 'application/*' || type === 'application/json' || type === 'text/html';
    });
    if (!acceptsJson) return next(new ApiError(406, 'not_acceptable', 'This API only returns application/json'));
    return next();
  });
  // A declared charset other than UTF-8 is rejected up front with 415, instead of being read as UTF-8 anyway
  // and failing JSON parsing later with the unrelated 400 invalid_json.
  app.use((req, res, next) => {
    const match = /charset=("?)([^;"]+)\1/i.exec(req.headers['content-type'] ?? '');
    if (match && match[2].trim().toLowerCase() !== 'utf-8') return next(new ApiError(415, 'unsupported_media_type', 'Only charset=utf-8 is supported'));
    return next();
  });
  app.use(express.json({ limit: LIMITS.bodyBytes }));
  // A body that express.json did not read (another Content-Type) is refused with 415, not taken as a missing
  // body - but only for a method that is meant to carry one; GET/HEAD/DELETE never need a JSON body, so any
  // body they do carry is simply ignored instead of failing the request over an unrelated Content-Type.
  app.use((req, res, next) => {
    if (BODYLESS_METHODS.has(req.method)) return next();
    const hasBody = Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined;
    if (hasBody && req.body === undefined) return next(new ApiError(415, 'unsupported_media_type', 'Content-Type must be application/json'));
    return next();
  });

  app.use(identify((id) => users.find(id)));

  // Ownership rules for a caller who named itself with X-User-Id. A "restricted" caller is a non-admin user; an
  // anonymous caller and an administrator are not restricted. A project belongs to its owner and a diagram to the
  // owner of its project.
  const restricted = (actor) => actor.userId !== undefined && actor.role !== 'admin';
  const ownsProject = (actor, projectId) => !restricted(actor) || projects.find(projectId)?.ownerId === actor.userId;
  const deny = (what) => {
    throw forbidden(`You may not ${what}`);
  };

  const api = express.Router();
  // The machine-readable description of the API, built from the schemas above.
  api.get('/openapi.json', (req, res) => res.json(buildOpenApi(schemas, { hidden: { users: ['email'] } })));
  api.all('/openapi.json', methodsOnly('GET'));
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
        authorize: (actor, action, user) => {
          if (restricted(actor) && actor.userId !== user.id) deny(`${action} another user's record`);
        },
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
        authorize: (actor, action, project) => {
          if (action === 'remove' && restricted(actor)) deny('delete a project, only an administrator may');
          if (restricted(actor) && project.ownerId !== actor.userId) deny("change another user's project");
        },
        authorizeData: (actor, data) => {
          if (restricted(actor) && data.ownerId !== undefined && data.ownerId !== actor.userId) deny('give a project to another user');
        },
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
  const ownDiagram = (req, what) => {
    const found = diagram(req);
    if (!ownsProject(req.actor, found.projectId)) deny(`${what} a diagram of another user's project`);
    return found;
  };
  api.post('/diagrams/:id/publish', (req, res) => res.json(diagrams.update(ownDiagram(req, 'publish'), { status: 'published' })));
  api.post('/diagrams/:id/duplicate', (req, res) => {
    const { id, createdAt, ...rest } = ownDiagram(req, 'copy');
    // Cut by code points, not by UTF-16 units: slicing a surrogate pair in half would store (and re-serve) a
    // lone surrogate, which is not valid Unicode text.
    const title = [...`${rest.title} (copy)`].slice(0, LIMITS.diagramTitle).join('');
    res.status(201).json(diagrams.create({ ...rest, title, status: 'draft' }));
  });
  api.all('/diagrams/:id/publish', methodsOnly('POST'));
  api.all('/diagrams/:id/duplicate', methodsOnly('POST'));
  api.use(
    '/diagrams',
    createResourceRouter({
      label: 'Diagram',
      collection: diagrams,
      schema: schemas.diagrams,
      hooks: {
        authorize: (actor, action, item) => {
          if (!ownsProject(actor, item.projectId)) deny(`${action} a diagram of another user's project`);
        },
        authorizeData: (actor, data) => {
          if (data.projectId !== undefined && !ownsProject(actor, data.projectId)) deny("put a diagram into another user's project");
        },
        check: (data) => missingReference('projectId', projects, data.projectId),
      },
    }),
  );

  app.use('/api', api);
  app.use((req, res, next) => next(routeNotFound()));

  // Turns any thrown value into the ApiError that describes it. Anything unknown is a server failure (500).
  const toApiError = (err, req, res) => {
    if (err instanceof ApiError) return err;
    if (err.type === 'entity.parse.failed') return new ApiError(400, 'invalid_json', 'Request body is not valid JSON');
    if (err.type === 'entity.too.large') return new ApiError(413, 'payload_too_large', 'Request body is too large');
    // Errors of the framework and of the body parser that blame the client keep their 4xx status: a broken
    // percent escape in the URL is 400 and an unsupported Content-Encoding is 415, neither is a server failure.
    const status = err.status ?? err.statusCode;
    if (status >= 400 && status < 500) {
      const known = CLIENT_ERRORS[status] ?? ['bad_request', 'The request cannot be processed'];
      return new ApiError(status, known[0], known[1]);
    }
    writeError(`[error] request ${res.locals.requestId} ${logSafe(req.method)} ${logSafe(req.originalUrl)}`, err);
    return new ApiError(500, 'internal_error', 'Internal server error');
  };

  // Four parameters: the single place where every error is answered, as JSON for a client and as a described page
  // for a browser, always with the Request ID.
  app.use((err, req, res, _next) => {
    const apiError = toApiError(err, req, res);
    if (wantsHtml(req)) {
      const page = renderErrorPage({ status: apiError.status, code: apiError.code, message: apiError.message, details: apiError.details, requestId: res.locals.requestId });
      return res.status(apiError.status).set('Content-Security-Policy', PAGE_CSP).type('html').send(page);
    }
    return res.status(apiError.status).json(errorBody(apiError, res.locals.requestId));
  });
  return app;
};
