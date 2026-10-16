const mongoose = require('mongoose');
const LIMITS = require('../../limits.json');

// Even variant (26): every request is written to a collection of the database, not to a file.
const requestLogSchema = new mongoose.Schema(
  {
    method: { type: String, required: true, maxlength: 10 },
    path: { type: String, required: true, maxlength: LIMITS.pathLog },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

const RequestLog = mongoose.models.RequestLog || mongoose.model('RequestLog', requestLogSchema);

module.exports = { RequestLog };
