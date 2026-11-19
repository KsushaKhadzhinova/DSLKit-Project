const clean = (text, max) =>
  String(text ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, '?')
    .slice(0, max);

// Security events go to the AuditEvents table. The detail is short text without passwords, tokens or codes; a failure to write
// is reported on the console and never breaks the request that caused the event.
const createAudit = ({ AuditEvent }) => ({
  record: async (type, { userId, actorId, ip, detail } = {}) => {
    try {
      await AuditEvent.create({ type, userId: userId ?? null, actorId: actorId ?? null, ip: clean(ip, 64), detail: clean(detail, 500) });
    } catch (error) {
      console.error('Cannot write the audit event:', error.message);
    }
  },
});

module.exports = { createAudit };
