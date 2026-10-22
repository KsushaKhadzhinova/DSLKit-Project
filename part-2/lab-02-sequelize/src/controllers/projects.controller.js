const { notFound } = require('../errors');
const { parseListQuery } = require('../middleware/list-query');

const PROJECT_SORTABLE = ['id', 'name', 'createdAt'];
const DIAGRAM_SORTABLE = ['id', 'title', 'notation', 'priority', 'owner', 'revision', 'createdAt'];

const missing = (id) => notFound(`Project ${id} not found`);

// A project groups diagrams. Creating a project with a name that already exists breaks the UNIQUE constraint,
// Sequelize throws SequelizeUniqueConstraintError and the error handler answers 409.
const createProjectsController = ({ Project, Diagram }) => ({
  list: async (req, res) => {
    const { limit, offset, sort, order } = parseListQuery(req.query, PROJECT_SORTABLE);
    const { count, rows } = await Project.findAndCountAll({
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
    const project = await Project.findByPk(req.projectId);
    return project ? res.json(project) : next(missing(req.projectId));
  },

  // The many side of the one-to-many link: all diagrams of one project, with the same paging as /diagrams.
  listDiagrams: async (req, res, next) => {
    const project = await Project.findByPk(req.projectId);
    if (!project) return next(missing(req.projectId));
    const { limit, offset, sort, order } = parseListQuery(req.query, DIAGRAM_SORTABLE);
    const { count, rows } = await Diagram.findAndCountAll({
      where: { projectId: project.id },
      order: [
        [sort, order.toUpperCase()],
        ['id', 'ASC'],
      ],
      limit,
      offset,
    });
    res.set('X-Total-Count', String(count));
    return res.json(rows);
  },

  create: async (req, res) => {
    const project = await Project.create(req.projectFields);
    res.status(201).location(`/projects/${project.id}`).json(project);
  },

  // The diagrams of the project stay, the database clears their projectId (ON DELETE SET NULL).
  remove: async (req, res, next) => {
    const removed = await Project.destroy({ where: { id: req.projectId } });
    return removed ? res.status(204).end() : next(missing(req.projectId));
  },
});

module.exports = { createProjectsController };
