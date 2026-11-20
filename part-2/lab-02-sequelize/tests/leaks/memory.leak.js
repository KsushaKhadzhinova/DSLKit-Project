const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createModels } = require('../../src/models');
const { createTempDatabase } = require('../helpers');

// Memory leak check, run with `npm run test:leaks` (node --expose-gc); it is not part of `npm test`.
// 2000 iterations against the real app over a migrated temporary SQLite database, each one request (reads, create then
// delete, a rejected body, a 404). The heap that stays after a forced collection is compared with the heap after the warmup.
// LIMIT_BYTES is twice the largest growth measured over 3 runs, but not below 500 000 bytes: after a collection the runtime keeps
// or frees a few hundred kilobytes of its own state. The numbers are in docs/CI-CHECKS.md.
const ITERATIONS = Number(process.env.LEAK_ITERATIONS) || 2000;
const WARMUP = Number(process.env.LEAK_WARMUP) || 500;
const LIMIT_BYTES = 500_000;
const json = { 'Content-Type': 'application/json' };
const valid = { title: 'Leak', notation: 'UML', sourceCode: 'a -> b', priority: 'low', owner: 'bot' };

test('2000 requests leave no growing heap and no open handles behind', async () => {
  const { measureGrowth, assertGrowthBelow, activeResources, waitForNoExtraResources } = await import('../../../../tools/leaks/heap-growth.js');
  const db = createTempDatabase();
  db.cli('db:migrate');
  const before = activeResources();
  const models = createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
  const server = createApp(models).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const send = async (path, init) => {
    const res = await fetch(base + path, init);
    return { status: res.status, text: await res.text() };
  };
  const kinds = [
    () => send('/health'),
    (i) => send(`/diagrams?limit=5&offset=${i % 3}`),
    async (i) => {
      const created = await send('/diagrams', { method: 'POST', headers: json, body: JSON.stringify({ ...valid, title: `Leak ${i}` }) });
      assert.equal(created.status, 201, created.text);
      await send(`/diagrams/${JSON.parse(created.text).id}`, { method: 'DELETE' });
    },
    () => send('/diagrams', { method: 'POST', headers: json, body: '{"broken' }),
    (i) => send(`/missing/${i}`),
  ];
  let report;
  try {
    report = await measureGrowth((i) => kinds[i % kinds.length](i), { iterations: ITERATIONS, warmup: WARMUP });
  } finally {
    // Row updates of the request log still run after a response, so they get a moment before the database closes.
    await new Promise((resolve) => setTimeout(resolve, 200));
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await models.sequelize.close();
    db.cleanup();
  }
  console.log(`lab-02 growth ${report.growthBytes} bytes, ${report.bytesPerIteration.toFixed(2)} per iteration`);
  assertGrowthBelow(report, LIMIT_BYTES);
  const extra = await waitForNoExtraResources(before);
  assert.deepEqual(extra, [], `open handles after server.close(): ${extra.join(', ')}`);
});
