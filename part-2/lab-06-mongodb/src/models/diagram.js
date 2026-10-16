const mongoose = require('mongoose');
const { NOTATIONS, PRIORITY, LIMITS } = require('./diagram.constants');

// Query filters are never trusted: operators sent as values are stripped, unknown fields are ignored.
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

// Responses expose "id" instead of Mongo's "_id" and "__v".
const toJSON = {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
  },
};

// A comment lives inside the diagram document: no separate collection, no join.
const commentSchema = new mongoose.Schema(
  {
    author: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.author },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.commentText },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON, strict: true },
);

const diagramSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.title },
    notation: { type: String, required: true, enum: NOTATIONS },
    sourceCode: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.sourceCode },
    priority: {
      type: Number,
      required: true,
      min: PRIORITY.min,
      max: PRIORITY.max,
      default: PRIORITY.default,
      validate: { validator: Number.isInteger, message: 'priority must be an integer' },
    },
    owner: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.owner, index: true },
    tags: {
      type: [{ type: String, trim: true, minlength: 1, maxlength: LIMITS.tag }],
      index: true,
      validate: { validator: (v) => v.length <= LIMITS.tags, message: 'too many tags' },
    },
    comments: { type: [commentSchema], validate: { validator: (v) => v.length <= LIMITS.comments, message: 'too many comments' } },
  },
  { timestamps: true, toJSON, strict: true },
);

const Diagram = mongoose.models.Diagram || mongoose.model('Diagram', diagramSchema);

module.exports = { Diagram };
