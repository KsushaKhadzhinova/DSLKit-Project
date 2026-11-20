const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, PASSWORD } = require('../harness');

// Memory leak check, run with `npm run test:leaks` (node --expose-gc); it is not part of `npm test`.
// 2000 iterations against the real app over a migrated temporary SQLite database, each one request (reads with a token,
// create then delete, logins, a missing token, a rejected body, a 404). The heap that stays after a forced collection is
// compared with the heap after the warmup.
// LIMIT_BYTES is twice the largest growth measured over 3 runs, but not below 500 000 bytes: after a collection the runtime keeps
// or frees a few hundred kilobytes of its own state. The numbers are in docs/CI-CHECKS.md.
const ITERATIONS = Number(process.env.LEAK_ITERATIONS) || 2000;
const WARMUP = Number(process.env.LEAK_WARMUP) || 500;
const LIMIT_BYTES = 500_000;
const valid = { title: 'Leak', notation: 'UML', sourceCode: 'a -> b', priority: 'low', owner: 'bot' };

test('2000 requests leave no growing heap and no open handles behind', async () => {
  const { measureGrowth, assertGrowthBelow, activeResources, waitForNoExtraResources } = await import('../../../../tools/leaks/heap-growth.js');
  const before = activeResources();
  const app = await startServer();
  const token = await app.tokenFor('leak@example.com');
  // A new login ends the older session of the same user, so the logins of the test use another account.
  await app.tokenFor('login@example.com');
  const kinds = [
    () => app.call('GET', '/health'),
    (i) => app.call('GET', `/diagrams?limit=5&offset=${i % 3}`, { token }),
    async (i) => {
      const created = await app.call('POST', '/diagrams', { token, body: { ...valid, title: `Leak ${i}` } });
      assert.equal(created.res.status, 201, JSON.stringify(created.body));
      await app.call('DELETE', `/diagrams/${created.body.id}`, { token });
    },
    () => app.call('POST', '/auth/login', { body: { email: 'login@example.com', password: PASSWORD } }),
    () => app.call('GET', '/diagrams'),
    () => app.call('POST', '/diagrams', { token, raw: '{"broken' }),
    (i) => app.call('GET', `/missing/${i}`),
  ];
  let report;
  try {
    report = await measureGrowth((i) => kinds[i % kinds.length](i), { iterations: ITERATIONS, warmup: WARMUP });
  } finally {
    await app.close();
  }
  console.log(`lab-03 growth ${report.growthBytes} bytes, ${report.bytesPerIteration.toFixed(2)} per iteration`);
  assertGrowthBelow(report, LIMIT_BYTES);
  const extra = await waitForNoExtraResources(before);
  assert.deepEqual(extra, [], `open handles after close: ${extra.join(', ')}`);
});
