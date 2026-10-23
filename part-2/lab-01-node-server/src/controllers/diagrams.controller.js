const { notFound } = require('../errors');
const { parseListQuery } = require('../middleware/list-query');
const { NOTATIONS, LIMITS } = require('../models/diagram.model');

const missing = (id) => notFound(`Diagram ${id} not found`);

const SORTABLE = ['id', 'title', 'notation', 'priority', 'owner', 'createdAt'];

// Numbers compare as numbers, text with the locale rules, equal values keep the order of ids.
const byField = (sort, order) => (a, b) => {
  const result = typeof a[sort] === 'number' ? a[sort] - b[sort] : String(a[sort]).localeCompare(String(b[sort]));
  return (order === 'desc' ? -result : result) || a.id - b.id;
};

const createDiagramsController = (store) => ({
  // ?limit=&offset=&sort=&order=&notation=&q= (see list-query.js). The answer stays an array, the size of the filtered list comes in X-Total-Count.
  list: (req, res) => {
    const { limit, offset, sort, order, notation, q } = parseListQuery(req.query, SORTABLE, { notations: NOTATIONS, maxQuery: LIMITS.title });
    const all = store
      .findAll()
      .filter((d) => (notation === undefined || d.notation === notation) && (q === undefined || d.title.toLowerCase().includes(q)))
      .sort(byField(sort, order));
    res.set('X-Total-Count', String(all.length));
    res.json(all.slice(offset, limit === undefined ? undefined : offset + limit));
  },

  get: (req, res, next) => {
    const diagram = store.findById(req.diagramId);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  create: (req, res) => {
    const diagram = store.create(req.diagramFields);
    res.status(201).location(`/diagrams/${diagram.id}`).json(diagram);
  },

  replace: (req, res, next) => {
    const diagram = store.replace(req.diagramId, req.diagramFields);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  update: (req, res, next) => {
    const diagram = store.update(req.diagramId, req.diagramFields);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  remove: (req, res, next) => (store.remove(req.diagramId) ? res.status(204).end() : next(missing(req.diagramId))),
});

module.exports = { createDiagramsController };
