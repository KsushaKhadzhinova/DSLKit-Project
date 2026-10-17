const { notFound } = require('../errors');
const { parseListQuery } = require('../middleware/list-query');

const missing = (id) => notFound(`Diagram ${id} not found`);

const SORTABLE = ['id', 'title', 'notation', 'priority', 'owner', 'createdAt'];

// Express 5 forwards a rejected promise to the error handler, so no try/catch is needed here.
const createDiagramsController = ({ Diagram }) => ({
  // ?limit=&offset=&sort=&order= (see list-query.js). The answer stays an array, the full size comes in X-Total-Count.
  list: async (req, res) => {
    const { limit, offset, sort, order } = parseListQuery(req.query, SORTABLE);
    const { count, rows } = await Diagram.findAndCountAll({ order: [[sort, order.toUpperCase()], ['id', 'ASC']], limit, offset });
    res.set('X-Total-Count', String(count));
    res.json(rows);
  },

  get: async (req, res, next) => {
    const diagram = await Diagram.findByPk(req.diagramId);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  create: async (req, res) => {
    const diagram = await Diagram.create(req.diagramFields);
    res.status(201).location(`/diagrams/${diagram.id}`).json(diagram);
  },

  replace: async (req, res, next) => {
    const [updated] = await Diagram.update(req.diagramFields, { where: { id: req.diagramId } });
    return updated ? res.json(await Diagram.findByPk(req.diagramId)) : next(missing(req.diagramId));
  },

  remove: async (req, res, next) => {
    const removed = await Diagram.destroy({ where: { id: req.diagramId } });
    return removed ? res.status(204).end() : next(missing(req.diagramId));
  },
});

module.exports = { createDiagramsController };
