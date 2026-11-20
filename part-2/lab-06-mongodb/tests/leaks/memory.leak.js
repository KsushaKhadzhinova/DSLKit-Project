const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('../helpers');

// Memory leak check, run with `npm run test:leaks` (node --expose-gc); it is not part of `npm test`.
// 2000 iterations against the real app over a throwaway MongoDB (the same helper as the other tests), each one request
// (reads, create then delete, a rejected body, a 404). The heap that stays after a forced collection is compared with
// the heap after the warmup. Open handles are checked after stop() (server, Mongoose connection and mongod).
// LIMIT_BYTES is twice the largest growth measured over 3 runs, but not below 500 000 bytes: after a collection the runtime keeps
// or frees a few hundred kilobytes of its own state. The numbers are in docs/CI-CHECKS.md.
const ITERATIONS = Number(process.env.LEAK_ITERATIONS) || 2000;
const WARMUP = Number(process.env.LEAK_WARMUP) || 500;
const LIMIT_BYTES = 500_000;
const json = { 'Content-Type': 'application/json' };
const valid = { title: 'Leak', notation: 'UML', sourceCode: 'a -> b', priority: 1, owner: 'bot', tags: ['leak'] };

test('2000 requests leave no growing heap behind and stop() leaves no open handles', async () => {
  const { measureGrowth, assertGrowthBelow, activeResources, waitForNoExtraResources } = await import('../../../../tools/leaks/heap-growth.js');
  const before = activeResources();
  const ctx = await startTestServer();
  const send = async (path, init) => {
    const res = await fetch(ctx.base + path, init);
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
    () => send('/diagrams/not-an-id'),
    (i) => send(`/missing/${i}`),
  ];
  let report;
  try {
    report = await measureGrowth((i) => kinds[i % kinds.length](i), { iterations: ITERATIONS, warmup: WARMUP });
  } finally {
    await ctx.stop();
  }
  console.log(`lab-06 growth ${report.growthBytes} bytes, ${report.bytesPerIteration.toFixed(2)} per iteration`);
  assertGrowthBelow(report, LIMIT_BYTES);
  const extra = await waitForNoExtraResources(before, { timeoutMs: 10000 });
  assert.deepEqual(extra, [], `open handles after stop(): ${extra.join(', ')}`);
});
