const mongoose = require('mongoose');
const { NOTATIONS, PRIORITIES, DEFAULT_PRIORITY } = require('./diagram.constants');

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
    author: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON },
);

const diagramSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    notation: { type: String, required: true, enum: NOTATIONS },
    sourceCode: { type: String, required: true },
    priority: { type: String, required: true, enum: PRIORITIES, default: DEFAULT_PRIORITY },
    owner: { type: String, required: true, trim: true, index: true },
    tags: { type: [{ type: String, trim: true, minlength: 1 }], index: true },
    comments: [commentSchema],
  },
  { timestamps: true, toJSON },
);

const Diagram = mongoose.models.Diagram || mongoose.model('Diagram', diagramSchema);

module.exports = { Diagram };
