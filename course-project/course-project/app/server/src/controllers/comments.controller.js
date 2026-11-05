const { notFound, forbidden } = require('../errors');
const { parseListQuery } = require('../middleware/list-query');

const SORTABLE = ['id', 'createdAt'];

// Only the author or an admin may change or delete a comment.
const mayChange = (user, comment) => user.role === 'admin' || comment.authorId === user.id;

const createCommentsController = ({ Diagram, Comment }) => {
  const diagramMissing = (id) => notFound(`Diagram ${id} not found`);
  const commentMissing = (id) => notFound(`Comment ${id} not found`);

  return {
    // Comments of one diagram, oldest first. The answer is an array, X-Total-Count holds the full size.
    list: async (req, res, next) => {
      if (!(await Diagram.findByPk(req.diagramId, { attributes: ['id'] }))) return next(diagramMissing(req.diagramId));
      const { limit, offset, sort, order } = parseListQuery(req.query, SORTABLE);
      const { count, rows } = await Comment.findAndCountAll({
        where: { diagramId: req.diagramId },
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

    // The author comes from the token and the diagram from the URL, the body holds only the text.
    create: async (req, res, next) => {
      if (!(await Diagram.findByPk(req.diagramId, { attributes: ['id'] }))) return next(diagramMissing(req.diagramId));
      const comment = await Comment.create({ ...req.commentFields, diagramId: req.diagramId, authorId: req.user.id });
      return res.status(201).location(`/comments/${comment.id}`).json(comment);
    },

    update: async (req, res, next) => {
      const comment = await Comment.findByPk(req.commentId);
      if (!comment) return next(commentMissing(req.commentId));
      if (!mayChange(req.user, comment)) return next(forbidden('Only the author or an admin can change this comment'));
      return res.json(await comment.update(req.commentFields));
    },

    remove: async (req, res, next) => {
      const comment = await Comment.findByPk(req.commentId);
      if (!comment) return next(commentMissing(req.commentId));
      if (!mayChange(req.user, comment)) return next(forbidden('Only the author or an admin can delete this comment'));
      await comment.destroy();
      return res.status(204).end();
    },
  };
};

module.exports = { createCommentsController };
