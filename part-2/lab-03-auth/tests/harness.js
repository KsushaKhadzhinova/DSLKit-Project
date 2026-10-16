const { createApp } = require('../src/app');
const { createModels } = require('../src/models');
const { createTempDatabase } = require('./helpers');

const SECRET = 'test-secret-test-secret-test-secret-123';
const PASSWORD = 'correct horse 42';
// Four rounds keep bcrypt fast enough for tests.
const SETTINGS = { jwtSecret: SECRET, bcryptRounds: 4 };

// Starts the real app on a free port over a migrated temporary SQLite database.
const startServer = async (settings = {}) => {
  const db = createTempDatabase();
  db.cli('db:migrate');
  const models = createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
  const server = createApp(models, { ...SETTINGS, ...settings }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://localhost:${server.address().port}`;

  const call = async (method, path, { body, token, raw, headers = {} } = {}) => {
    const sent = { ...headers };
    if (body !== undefined && method !== 'GET') sent['Content-Type'] = 'application/json';
    if (token) sent.Authorization = `Bearer ${token}`;
    const res = await fetch(base + path, { method, headers: sent, body: raw ?? (body === undefined || method === 'GET' ? undefined : JSON.stringify(body)) });
    const text = await res.text();
    return { res, body: text ? JSON.parse(text) : undefined };
  };

  // Registers the user, optionally sets the role directly in the database, logs in and returns the token.
  const tokenFor = async (email, role = 'user') => {
    await call('POST', '/auth/register', { body: { email, password: PASSWORD } });
    if (role !== 'user') await models.User.update({ role }, { where: { email } });
    return (await call('POST', '/auth/login', { body: { email, password: PASSWORD } })).body.token;
  };

  const close = async () => {
    server.close();
    await models.sequelize.close();
    db.cleanup();
  };

  return { models, call, tokenFor, close };
};

module.exports = { startServer, SECRET, PASSWORD };
