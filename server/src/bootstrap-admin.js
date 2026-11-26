'use strict';
const bcrypt = require('bcrypt');
const { rules } = require('./schema');

// Creates the very first administrator from ADMIN_EMAIL / ADMIN_PASSWORD when no admin exists yet.
async function bootstrapAdmin({ db, config, email, password }) {
  if (!email && !password) return { created: false, reason: 'not_configured' };
  const mail = rules.email(String(email || ''));
  if (mail.error) throw new Error(`ADMIN_EMAIL: ${mail.error}`);
  const pass = rules.password(String(password || ''));
  if (pass.error) throw new Error(`ADMIN_PASSWORD: ${pass.error}`);
  if (await db.User.count({ where: { role: 'admin' } })) return { created: false, reason: 'admin_exists' };
  await db.User.create({ email: mail.value, passwordHash: await bcrypt.hash(password, config.bcryptRounds), displayName: 'Administrator', role: 'admin' });
  return { created: true };
}

module.exports = { bootstrapAdmin };
