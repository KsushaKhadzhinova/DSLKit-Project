const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./harness');

let app;
before(async () => {
  app = await startServer();
});
after(() => app.close());

test('GET /health answers 200 while the database is reachable and does not fill the request log', async () => {
  const before = await app.models.RequestLog.count();
  const { res, body } = await app.call('GET', '/health');
  assert.equal(res.status, 200);
  assert.deepEqual(body, { status: 'ok' });
  assert.equal(await app.models.RequestLog.count(), before);
});

test('GET /health answers 503 when the database cannot be reached', async () => {
  const original = app.models.sequelize.authenticate;
  app.models.sequelize.authenticate = async () => {
    throw new Error('down');
  };
  try {
    const { res, body } = await app.call('GET', '/health');
    assert.equal(res.status, 503);
    assert.deepEqual(body, { status: 'unavailable' });
  } finally {
    app.models.sequelize.authenticate = original;
  }
});
