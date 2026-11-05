const { fn } = require('sequelize');
const { notFound, forbidden, badRequest } = require('../errors');
const { parseListQuery } = require('../middleware/list-query');
const { LIMITS } = require('../models/diagram.constants');

const SORTABLE = ['id', 'name'];

// Only the owner of a diagram or an admin may attach or detach its tags.
const mayChange = (user, diagram) => user.role === 'admin' || diagram.ownerId === user.id;

const createTagsController = ({ Diagram, Tag, DiagramTag }) => {
  const diagramMissing = (id) => notFound(`Diagram ${id} not found`);
  const tagMissing = (id) => notFound(`Tag ${id} not found`);
  const attributes = ['id', 'name'];

  return {
    // All tags with the number of diagrams that carry each one. The answer is an array, X-Total-Count holds the full size.
    list: async (req, res) => {
      const { limit, offset, sort, order } = parseListQuery(req.query, SORTABLE);
      const { count, rows } = await Tag.findAndCountAll({
        order: [
          [sort, order.toUpperCase()],
          ['id', 'ASC'],
        ],
        limit,
        offset,
      });
      const used = await DiagramTag.findAll({
        attributes: ['tagId', [fn('COUNT', '*'), 'diagrams']],
        where: { tagId: rows.map((tag) => tag.id) },
        group: ['tagId'],
        raw: true,
      });
      const counts = new Map(used.map((row) => [row.tagId, Number(row.diagrams)]));
      res.set('X-Total-Count', String(count));
      return res.json(rows.map((tag) => ({ ...tag.toJSON(), diagrams: counts.get(tag.id) ?? 0 })));
    },

    // Tags of one diagram, by name.
    listForDiagram: async (req, res, next) => {
      const diagram = await Diagram.findByPk(req.diagramId, { include: { model: Tag, attributes, through: { attributes: [] } } });
      if (!diagram) return next(diagramMissing(req.diagramId));
      return res.json([...diagram.Tags].sort((a, b) => a.name.localeCompare(b.name)));
    },

    // The tag is created on first use and linked to the diagram. A repeated name answers 200 with the same tag and changes nothing.
    attach: async (req, res, next) => {
      const diagram = await Diagram.findByPk(req.diagramId);
      if (!diagram) return next(diagramMissing(req.diagramId));
      if (!mayChange(req.user, diagram)) return next(forbidden('Only the owner or an admin can change the tags of this diagram'));
      const [tag] = await Tag.findOrCreate({ where: { name: req.tagFields.name } });
      if (await DiagramTag.findOne({ where: { diagramId: diagram.id, tagId: tag.id } })) return res.json(tag);
      if ((await DiagramTag.count({ where: { diagramId: diagram.id } })) >= LIMITS.tagsPerDiagram) {
        return next(badRequest(`A diagram can have at most ${LIMITS.tagsPerDiagram} tags`, [{ field: 'name', message: `limit of ${LIMITS.tagsPerDiagram} tags per diagram reached` }]));
      }
      await DiagramTag.create({ diagramId: diagram.id, tagId: tag.id });
      return res.status(201).location(`/diagrams/${diagram.id}/tags`).json(tag);
    },

    // Detaches one tag from the diagram; the tag itself stays for other diagrams.
    detach: async (req, res, next) => {
      const diagram = await Diagram.findByPk(req.diagramId);
      if (!diagram) return next(diagramMissing(req.diagramId));
      if (!mayChange(req.user, diagram)) return next(forbidden('Only the owner or an admin can change the tags of this diagram'));
      const removed = await DiagramTag.destroy({ where: { diagramId: diagram.id, tagId: req.tagId } });
      return removed ? res.status(204).end() : next(notFound(`Diagram ${diagram.id} has no tag ${req.tagId}`));
    },

    // Admin only: removes the tag from every diagram.
    remove: async (req, res, next) => {
      const tag = await Tag.findByPk(req.tagId);
      if (!tag) return next(tagMissing(req.tagId));
      await tag.destroy();
      return res.status(204).end();
    },
  };
};

module.exports = { createTagsController };
