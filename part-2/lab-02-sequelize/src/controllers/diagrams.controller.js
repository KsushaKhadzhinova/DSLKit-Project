const { notFound } = require('../errors');

const missing = (id) => notFound(`Diagram ${id} not found`);

// Express 5 forwards a rejected promise to the error handler, so no try/catch is needed here.
const createDiagramsController = ({ Diagram }) => ({
  list: async (_req, res) => res.json(await Diagram.findAll({ order: [['id', 'ASC']] })),

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
