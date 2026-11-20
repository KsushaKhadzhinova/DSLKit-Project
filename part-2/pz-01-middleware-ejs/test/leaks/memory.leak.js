import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { createDiagramStore } from '../../src/data/diagrams.js';
import { openRequestLog } from '../../src/data/requestLog.js';
import { loadLimits } from '../../src/limits.js';
import { activeResources, assertGrowthBelow, measureGrowth, waitForNoExtraResources } from '../../../../tools/leaks/heap-growth.js';

// Memory leak check, run with `npm run test:leaks` (node --expose-gc); it is not part of `npm test`.
// 2000 iterations against the real app in this process, each one request or one form round (pages, create then delete,
// a forged form, the log page, a 404). The heap that stays after a forced collection is compared with the heap after the warmup.
// LIMIT_BYTES is twice the largest growth measured over 3 runs, but not below 500 000 bytes: after a collection the runtime keeps
// or frees a few hundred kilobytes of its own state. The numbers are in docs/CI-CHECKS.md.
const ITERATIONS = Number(process.env.LEAK_ITERATIONS) || 2000;
const WARMUP = Number(process.env.LEAK_WARMUP) || 500;
const LIMIT_BYTES = 500_000;

test('2000 requests leave no growing heap and no open handles behind', async () => {
  const before = activeResources();
  const limits = loadLimits();
  limits.rateLimit.all.max = 1_000_000;
  limits.rateLimit.write.max = 1_000_000;
  const store = createDiagramStore();
  const log = openRequestLog();
  const server = createApp({ store, limits, log, write: () => {}, writeError: () => {} }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const send = async (path, init) => {
    const res = await fetch(base + path, init);
    return { res, text: await res.text() };
  };
  const session = async () => {
    const { res, text } = await send('/add?auth=1');
    return { cookie: res.headers.get('set-cookie').split(';')[0], token: text.match(/name="_csrf" value="([0-9a-f]+)"/)[1] };
  };
  const post = (path, fields, s) =>
    send(path, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', ...(s ? { cookie: s.cookie } : {}) },
      body: new URLSearchParams({ ...fields, ...(s ? { _csrf: s.token } : {}) }),
    });
  const form = (i) => ({ title: `Leak ${i}`, notation: 'UML', description: 'text', code: 'a -> b', revision: '1' });
  const kinds = [
    () => send('/health'),
    () => send('/'),
    () => send('/login'),
    async (i) => {
      const s = await session();
      const created = await post('/add?auth=1', form(i), s);
      assert.equal(created.res.status, 302);
      const item = store.all().find((x) => x.title === `Leak ${i}`);
      await post(`/item/${item.id}/delete?auth=1`, {}, s);
    },
    (i) => post('/add?auth=1', form(i), null),
    () => send('/log?auth=1'),
    (i) => send(`/missing/${i}`),
  ];
  let report;
  try {
    report = await measureGrowth((i) => kinds[i % kinds.length](i), { iterations: ITERATIONS, warmup: WARMUP });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    log.close();
  }
  console.log(`pz-01 growth ${report.growthBytes} bytes, ${report.bytesPerIteration.toFixed(2)} per iteration`);
  assertGrowthBelow(report, LIMIT_BYTES);
  const extra = await waitForNoExtraResources(before);
  assert.deepEqual(extra, [], `open handles after server.close(): ${extra.join(', ')}`);
});
