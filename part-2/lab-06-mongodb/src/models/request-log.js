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

// The log is a record of personal data (the address of the client is not stored, but paths and times are), so old rows delete themselves.
// MongoDB removes a row about a minute after it is older than the limit; this is the retention period of the log.
requestLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: LIMITS.logRetentionDays * 24 * 60 * 60 });

const RequestLog = mongoose.models.RequestLog || mongoose.model('RequestLog', requestLogSchema);

module.exports = { RequestLog };
