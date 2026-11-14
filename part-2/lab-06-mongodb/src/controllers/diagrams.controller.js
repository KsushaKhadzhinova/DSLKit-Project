const mongoose = require('mongoose');
const { badRequest, notFound } = require('../errors');
const { LIMITS } = require('../models/diagram.constants');

const missing = (id) => notFound(`Diagram ${id} not found`);
const missingComment = (id) => notFound(`Comment ${id} not found`);

// ?owner=anna&tag=shop narrows the list; tag matches when the tags array contains the value.
// commentAuthor looks inside the nested comments array with the dotted path comments.author.
const listFilter = ({ owner, tag, commentAuthor, q }) => ({
  ...(typeof q === 'string' && { $text: mongoose.trusted({ $search: q }) }),
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
    const sortKey = req.query.sort;
    const sort = sortKey ? { [sortKey.replace('-', '')]: sortKey.startsWith('-') ? -1 : 1, _id: 1 } : { _id: 1 };
    const filter = listFilter(req.query);
    res.set('X-Total-Count', String(await Diagram.countDocuments(filter)));
    res.json(await Diagram.find(filter).sort(sort).skip(skip).limit(limit));
  },

  // The record counter: how many diagrams match the same filters as the list.
  count: async (req, res) => res.json({ count: await Diagram.countDocuments(listFilter(req.query)) }),

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

  // PATCH changes only the fields that were sent; comments stay untouched.
  patch: async (req, res, next) => {
    const diagram = await Diagram.findByIdAndUpdate(req.diagramId, { $set: req.diagramFields }, options);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  remove: async (req, res, next) => {
    const diagram = await Diagram.findByIdAndDelete(req.diagramId);
    return diagram ? res.status(204).end() : next(missing(req.diagramId));
  },

  // $push appends to the nested array in one atomic update. The push runs only while the array has room:
  // update validators do not check the array length on $push, so the limit is part of the filter.
  addComment: async (req, res, next) => {
    // sanitizeFilter is on, so the operator is marked trusted: it is the server's own, not user input.
    const room = { [`comments.${LIMITS.comments - 1}`]: mongoose.trusted({ $exists: false }) };
    const diagram = await Diagram.findOneAndUpdate({ _id: req.diagramId, ...room }, { $push: { comments: req.commentFields } }, options);
    if (diagram) return res.status(201).json(diagram);
    const exists = await Diagram.exists({ _id: req.diagramId });
    return exists ? next(badRequest(`A diagram holds at most ${LIMITS.comments} comments`)) : next(missing(req.diagramId));
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
