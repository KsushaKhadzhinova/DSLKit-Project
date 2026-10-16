const { notFound } = require('../errors');
const { LIMITS } = require('../models/diagram.constants');

const missing = (id) => notFound(`Diagram ${id} not found`);
const missingComment = (id) => notFound(`Comment ${id} not found`);

// ?owner=anna&tag=shop narrows the list; tag matches when the tags array contains the value.
// commentAuthor looks inside the nested comments array with the dotted path comments.author.
const listFilter = ({ owner, tag, commentAuthor }) => ({
  ...(typeof owner === 'string' && { owner }),
  ...(typeof tag === 'string' && { tags: tag }),
  ...(typeof commentAuthor === 'string' && { 'comments.author': commentAuthor }),
});

const options = { new: true, runValidators: true };

// Express 5 forwards a rejected promise to the error handler, so no try/catch is needed here.
const createDiagramsController = ({ Diagram }) => ({
  list: async (req, res) => {
    const limit = Number(req.query.limit ?? LIMITS.listLimitMax);
    const skip = Number(req.query.skip ?? 0);
    res.json(await Diagram.find(listFilter(req.query)).sort({ _id: 1 }).skip(skip).limit(limit));
  },

  // Aggregation pipeline: group by notation, count the diagrams and average the priority, then sort the groups.
  stats: async (_req, res) =>
    res.json(
      await Diagram.aggregate([
        { $group: { _id: '$notation', count: { $sum: 1 }, avgPriority: { $avg: '$priority' }, comments: { $sum: { $size: '$comments' } } } },
        { $project: { _id: 0, notation: '$_id', count: 1, avgPriority: 1, comments: 1 } },
        { $sort: { notation: 1 } },
      ]),
    ),

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
