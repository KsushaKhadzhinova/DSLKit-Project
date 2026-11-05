const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createModels } = require('../src/models');
const { createTempDatabase } = require('./helpers');

const db = createTempDatabase();
let server;
let base;
let models;

before(async () => {
  db.cli('db:migrate');
  models = createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
  server = createApp(models).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  await models.sequelize.close();
  db.cleanup();
});

test('GET /health answers 200 while the database is reachable and does not fill the request log', async () => {
  const count = await models.RequestLog.count();
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
  assert.equal(await models.RequestLog.count(), count);
});

test('GET /health answers 503 when the database cannot be reached', async () => {
  const original = models.sequelize.authenticate;
  models.sequelize.authenticate = async () => {
    throw new Error('down');
  };
  try {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { status: 'unavailable' });
  } finally {
    models.sequelize.authenticate = original;
  }
});
