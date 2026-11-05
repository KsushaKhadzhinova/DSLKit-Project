const test = require('node:test');
const assert = require('node:assert/strict');
const { createModels } = require('../src/models');
const { purgeOldLogs, startLogRetention } = require('../src/middleware/request-log');
const { createTempDatabase } = require('./helpers');

// Data minimisation: the request log holds addresses of clients, so old rows must go.
const DAY = 24 * 60 * 60 * 1000;

const open = async () => {
  const db = createTempDatabase();
  db.cli('db:migrate');
  const models = createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
  return { models, close: async () => { await models.sequelize.close(); db.cleanup(); } };
};

test('rows older than the retention period are deleted, newer ones stay', async () => {
  const { models, close } = await open();
  try {
    const row = (daysAgo) => ({ method: 'GET', path: '/x', ip: '203.0.113.7', status: 200, createdAt: new Date(Date.now() - daysAgo * DAY) });
    await models.RequestLog.bulkCreate([row(0), row(29), row(31), row(400)]);
    assert.equal(await purgeOldLogs(models, 30), 2);
    assert.equal(await models.RequestLog.count(), 2);
    assert.equal(await purgeOldLogs(models, 30), 0, 'a second purge finds nothing');
    assert.equal(await purgeOldLogs(models, 0), 2, 'a retention of zero days removes everything older than now');
  } finally {
    await close();
  }
});

test('the clock is injectable and the default period is thirty days', async () => {
  const { models, close } = await open();
  try {
    await models.RequestLog.create({ method: 'GET', path: '/x', ip: 'a', status: 200 });
    assert.equal(await purgeOldLogs(models, undefined, () => Date.now() + 29 * DAY), 0);
    assert.equal(await purgeOldLogs(models, undefined, () => Date.now() + 31 * DAY), 1);
  } finally {
    await close();
  }
});

test('the retention job runs at once, does not keep the process alive and survives a database error', async (t) => {
  const { models, close } = await open();
  try {
    await models.RequestLog.create({ method: 'GET', path: '/old', ip: 'a', status: 200, createdAt: new Date(Date.now() - 90 * DAY) });
    const timer = startLogRetention(models, 30);
    assert.equal(timer.hasRef(), false, 'the timer would keep the process alive');
    clearInterval(timer);
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(await models.RequestLog.count(), 0, 'the first purge did not run at the start');
    t.mock.method(console, 'error', () => {});
    t.mock.method(models.RequestLog, 'destroy', async () => {
      throw new Error('disk gone');
    });
    clearInterval(startLogRetention(models, 30));
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(console.error.mock.calls.length, 1);
  } finally {
    await close();
  }
});
