const { appendFileSync } = require('node:fs');

// There is no mail server in this lab. The "email" is a line in the server log, or in an outbox file when MAIL_OUTBOX_FILE is set.
// The text is never part of an HTTP response, so a reset link cannot be read by someone who only knows an address.
// In production without an outbox file only the fact is logged: the link is a credential and must not sit in a log.
const createMailer =
  ({ outboxFile, production = false } = {}) =>
  async ({ to, subject, text }) => {
    if (outboxFile) return appendFileSync(outboxFile, `${JSON.stringify({ at: new Date().toISOString(), to, subject, text })}\n`, { mode: 0o600 });
    if (production) return console.warn(`Mail "${subject}" for ${to} was not sent: no mail transport is configured (set MAIL_OUTBOX_FILE or replace the mailer)`);
    return console.log(`[mail] to=${to} subject=${subject}\n${text}`);
  };

module.exports = { createMailer };
