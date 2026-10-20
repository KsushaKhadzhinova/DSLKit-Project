const { notFound, badRequest } = require('../errors');
const { parseListQuery } = require('../middleware/list-query');

const missing = (id) => notFound(`Diagram ${id} not found`);

const SORTABLE = ['id', 'title', 'notation', 'priority', 'owner', 'revision', 'createdAt'];

// Express 5 forwards a rejected promise to the error handler, so no try/catch is needed here.
const createDiagramsController = ({ Diagram, Project }) => {
  // The foreign key is also guarded by the database, but a clear 400 beats a database error for a project that does not exist.
  const ensureProject = async (projectId) => {
    if (projectId === undefined || projectId === null || (await Project.findByPk(projectId))) return;
    throw badRequest('Invalid diagram data', [{ field: 'projectId', message: `project ${projectId} does not exist` }]);
  };

  return {
    // ?limit=&offset=&sort=&order= (see list-query.js). The answer stays an array, the full size comes in X-Total-Count.
    list: async (req, res) => {
      const { limit, offset, sort, order } = parseListQuery(req.query, SORTABLE);
      const { count, rows } = await Diagram.findAndCountAll({
        order: [
          [sort, order.toUpperCase()],
          ['id', 'ASC'],
        ],
        limit,
        offset,
      });
      res.set('X-Total-Count', String(count));
      res.json(rows);
    },

    get: async (req, res, next) => {
      const diagram = await Diagram.findByPk(req.diagramId);
      return diagram ? res.json(diagram) : next(missing(req.diagramId));
    },

    create: async (req, res) => {
      await ensureProject(req.diagramFields.projectId);
      const diagram = await Diagram.create(req.diagramFields);
      res.status(201).location(`/diagrams/${diagram.id}`).json(diagram);
    },

    replace: async (req, res, next) => {
      await ensureProject(req.diagramFields.projectId);
      const [updated] = await Diagram.update(req.diagramFields, { where: { id: req.diagramId } });
      return updated ? res.json(await Diagram.findByPk(req.diagramId)) : next(missing(req.diagramId));
    },

    // PATCH: only the sent fields change, the model validators still run on them.
    update: async (req, res, next) => {
      const diagram = await Diagram.findByPk(req.diagramId);
      if (!diagram) return next(missing(req.diagramId));
      await ensureProject(req.diagramFields.projectId);
      await diagram.update(req.diagramFields);
      return res.json(diagram);
    },

    remove: async (req, res, next) => {
      const removed = await Diagram.destroy({ where: { id: req.diagramId } });
      return removed ? res.status(204).end() : next(missing(req.diagramId));
    },
  };
};

module.exports = { createDiagramsController };
