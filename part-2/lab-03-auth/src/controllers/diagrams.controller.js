const { notFound, forbidden } = require('../errors');
const { Op, fn, col, where } = require('sequelize');
const { parseListQuery } = require('../middleware/list-query');
const { NOTATIONS, LIMITS } = require('../models/diagram.constants');

const missing = (id) => notFound(`Diagram ${id} not found`);

const SORTABLE = ['id', 'title', 'notation', 'priority', 'ownerId', 'createdAt'];

// A part of the title is searched with instr (SQLite) or strpos (PostgreSQL) on the lowercased title, not with LIKE,
// so the characters % and _ in the search text are plain characters and need no escaping.
const filterFor = (dialect, { notation, q }) => {
  const conditions = [];
  if (notation !== undefined) conditions.push({ notation });
  if (q !== undefined) conditions.push(where(fn(dialect === 'sqlite' ? 'instr' : 'strpos', fn('lower', col('title')), q), { [Op.gt]: 0 }));
  return conditions.length > 0 ? { [Op.and]: conditions } : {};
};

// Only the owner or an admin may change or delete a diagram.
const mayChange = (user, diagram) => user.role === 'admin' || diagram.ownerId === user.id;

// Express 5 forwards a rejected promise to the error handler, so no try/catch is needed here.
const createDiagramsController = ({ Diagram }) => ({
  // ?limit=&offset=&sort=&order= (see list-query.js) page and sort the result, the answer stays an array and X-Total-Count holds the full size.
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
    const diagram = await Diagram.create({ ...req.diagramFields, ownerId: req.user.id });
    res.status(201).location(`/diagrams/${diagram.id}`).json(diagram);
  },

  replace: async (req, res, next) => {
    const diagram = await Diagram.findByPk(req.diagramId);
    if (!diagram) return next(missing(req.diagramId));
    if (!mayChange(req.user, diagram)) return next(forbidden('Only the owner or an admin can change this diagram'));
    return res.json(await diagram.update(req.diagramFields));
  },

  // PATCH: only the sent fields change, the same owner-or-admin rule as PUT applies.
  update: async (req, res, next) => {
    const diagram = await Diagram.findByPk(req.diagramId);
    if (!diagram) return next(missing(req.diagramId));
    if (!mayChange(req.user, diagram)) return next(forbidden('Only the owner or an admin can change this diagram'));
    return res.json(await diagram.update(req.diagramFields));
  },

  remove: async (req, res, next) => {
    const diagram = await Diagram.findByPk(req.diagramId);
    if (!diagram) return next(missing(req.diagramId));
    if (!mayChange(req.user, diagram)) return next(forbidden('Only the owner or an admin can delete this diagram'));
    await diagram.destroy();
    return res.status(204).end();
  },
});

module.exports = { createDiagramsController };
