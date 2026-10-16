const { notFound } = require('../errors');

const missing = (id) => notFound(`Diagram ${id} not found`);
const missingComment = (id) => notFound(`Comment ${id} not found`);

// ?owner=anna&tag=shop narrows the list; tag matches when the tags array contains the value.
const listFilter = ({ owner, tag }) => ({
  ...(typeof owner === 'string' && { owner }),
  ...(typeof tag === 'string' && { tags: tag }),
});

const options = { new: true, runValidators: true };

// Express 5 forwards a rejected promise to the error handler, so no try/catch is needed here.
const createDiagramsController = ({ Diagram }) => ({
  list: async (req, res) => res.json(await Diagram.find(listFilter(req.query)).sort({ _id: 1 })),

  get: async (req, res, next) => {
    const diagram = await Diagram.findById(req.diagramId);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  create: async (req, res) => {
    const diagram = await Diagram.create(req.diagramFields);
    res.status(201).location(`/diagrams/${diagram.id}`).json(diagram);
  },

  replace: async (req, res, next) => {
    const diagram = await Diagram.findByIdAndUpdate(req.diagramId, req.diagramFields, options);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  remove: async (req, res, next) => {
    const diagram = await Diagram.findByIdAndDelete(req.diagramId);
    return diagram ? res.status(204).end() : next(missing(req.diagramId));
  },

  // $push appends to the nested array in one atomic update.
  addComment: async (req, res, next) => {
    const diagram = await Diagram.findByIdAndUpdate(req.diagramId, { $push: { comments: req.commentFields } }, options);
    return diagram ? res.status(201).json(diagram) : next(missing(req.diagramId));
  },

  // The positional operator $ updates only the array element matched by the filter.
  updateComment: async (req, res, next) => {
    const diagram = await Diagram.findOneAndUpdate(
      { _id: req.diagramId, 'comments._id': req.commentId },
      { $set: { 'comments.$.text': req.commentFields.text } },
      options,
    );
    return diagram ? res.json(diagram) : next(missingComment(req.commentId));
  },

  removeComment: async (req, res, next) => {
    const diagram = await Diagram.findOneAndUpdate(
      { _id: req.diagramId, 'comments._id': req.commentId },
      { $pull: { comments: { _id: req.commentId } } },
      options,
    );
    return diagram ? res.json(diagram) : next(missingComment(req.commentId));
  },
});

module.exports = { createDiagramsController };
