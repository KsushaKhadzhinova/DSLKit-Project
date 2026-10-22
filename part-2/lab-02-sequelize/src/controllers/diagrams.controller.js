const { notFound, badRequest } = require('../errors');
const { Op, fn, col, where } = require('sequelize');
const { parseListQuery } = require('../middleware/list-query');
const { NOTATIONS, LIMITS } = require('../models/diagram.constants');

const missing = (id) => notFound(`Diagram ${id} not found`);

const SORTABLE = ['id', 'title', 'notation', 'priority', 'owner', 'revision', 'createdAt'];

// A part of the title is searched with instr (SQLite) or strpos (PostgreSQL) on the lowercased title, not with LIKE,
// so the characters % and _ in the search text are plain characters and need no escaping.
const filterFor = (dialect, { notation, q }) => {
  const conditions = [];
  if (notation !== undefined) conditions.push({ notation });
  if (q !== undefined) conditions.push(where(fn(dialect === 'sqlite' ? 'instr' : 'strpos', fn('lower', col('title')), q), { [Op.gt]: 0 }));
  return conditions.length > 0 ? { [Op.and]: conditions } : {};
};

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
      const { limit, offset, sort, order, notation, q } = parseListQuery(req.query, SORTABLE, { notations: NOTATIONS, maxQuery: LIMITS.title });
      const { count, rows } = await Diagram.findAndCountAll({
        where: filterFor(Diagram.sequelize.getDialect(), { notation, q }),
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
