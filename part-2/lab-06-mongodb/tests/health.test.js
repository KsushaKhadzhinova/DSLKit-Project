const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

const start = async (isReady) => {
  const server = createApp({}, { isReady }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return { base: `http://localhost:${server.address().port}`, close: () => server.close() };
};

test('GET /health answers 200 while the database is connected', async () => {
  const { base, close } = await start(() => true);
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
  close();
});

test('GET /health answers 503 itself while the database is down, other routes answer 503 too', async () => {
  const { base, close } = await start(() => false);
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { status: 'unavailable' });
  assert.equal((await fetch(`${base}/diagrams`)).status, 503);
  close();
});
