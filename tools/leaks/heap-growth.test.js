import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeResources, assertGrowthBelow, extraResources, measureGrowth, sampleHeap, settle, slope, waitForNoExtraResources } from './heap-growth.js';

const noWait = () => Promise.resolve();

// Fake memory source: every read returns the next value of the counter.
const counter = (start, stepBy) => {
  let value = start;
  return () => ({ heapUsed: (value += stepBy) });
};
const fake = (memoryUsage) => ({ gc: () => {}, rounds: 1, yieldLoop: noWait, memoryUsage });

test('settle runs the collection once per round and yields to the loop', async () => {
  let gcCalls = 0;
  let yields = 0;
  await settle({ gc: () => (gcCalls += 1), rounds: 4, yieldLoop: async () => (yields += 1) });
  assert.equal(gcCalls, 4);
  assert.equal(yields, 4);
});

test('settle works with the default round count and the real event loop', async () => {
  let gcCalls = 0;
  await settle({ gc: () => (gcCalls += 1) });
  assert.equal(gcCalls, 3);
});

test('settle explains how to run when gc is missing', async () => {
  await assert.rejects(settle({ gc: null }), /--expose-gc/);
});

test('settle uses the global gc when it exists', async () => {
  const saved = globalThis.gc;
  let called = 0;
  globalThis.gc = () => (called += 1);
  try {
    await settle({ rounds: 1 });
  } finally {
    globalThis.gc = saved;
  }
  assert.equal(called, 1);
});

test('sampleHeap reads heapUsed after the collection', async () => {
  const order = [];
  const heap = await sampleHeap({
    gc: () => order.push('gc'),
    rounds: 1,
    yieldLoop: noWait,
    memoryUsage: () => {
      order.push('read');
      return { heapUsed: 42 };
    },
  });
  assert.equal(heap, 42);
  assert.deepEqual(order, ['gc', 'read']);
});

test('sampleHeap defaults to the real process memory', async () => {
  const heap = await sampleHeap({ gc: () => {}, rounds: 1, yieldLoop: noWait });
  assert.ok(heap > 0);
});

test('slope is the growth per iteration, zero for one point or a flat line', () => {
  assert.equal(
    slope([
      { iteration: 0, heapUsed: 100 },
      { iteration: 10, heapUsed: 200 },
      { iteration: 20, heapUsed: 300 },
    ]),
    10,
  );
  assert.equal(
    slope([
      { iteration: 0, heapUsed: 5 },
      { iteration: 10, heapUsed: 5 },
    ]),
    0,
  );
  assert.equal(slope([{ iteration: 3, heapUsed: 9 }]), 0);
});

test('measureGrowth runs warmup plus iterations and samples at even steps', async () => {
  const calls = [];
  const report = await measureGrowth(async (i) => calls.push(i), { iterations: 10, warmup: 2, samples: 5, ...fake(counter(1000, 50)) });
  assert.equal(calls.length, 12);
  assert.deepEqual(
    report.points.map((p) => p.iteration),
    [0, 2, 4, 6, 8, 10],
  );
  assert.equal(report.baseline, 1050);
  assert.equal(report.final, 1300);
  assert.equal(report.growthBytes, 250);
  assert.equal(report.iterations, 10);
  assert.equal(report.bytesPerIteration, 25);
});

test('measureGrowth clamps the step, shortens the last chunk and has defaults', async () => {
  let runs = 0;
  const report = await measureGrowth(async () => (runs += 1), { iterations: 7, warmup: 0, samples: 20, ...fake(counter(1, 0)) });
  assert.equal(runs, 7);
  assert.equal(report.points.length, 8);
  assert.equal(report.growthBytes, 0);
  let defaults = 0;
  await measureGrowth(async () => (defaults += 1), fake(counter(1, 0)));
  assert.equal(defaults, 2100);
  const uneven = await measureGrowth(async () => {}, { iterations: 10, warmup: 0, samples: 3, ...fake(counter(1, 0)) });
  assert.deepEqual(
    uneven.points.map((p) => p.iteration),
    [0, 3, 6, 9, 10],
  );
});

test('assertGrowthBelow passes under the limit and fails above it with the sample trail', () => {
  const report = {
    iterations: 4,
    growthBytes: 100,
    points: [
      { iteration: 0, heapUsed: 1 },
      { iteration: 4, heapUsed: 101 },
    ],
  };
  assert.equal(assertGrowthBelow(report, 100), report);
  assert.throws(() => assertGrowthBelow(report, 99), /grew by 100 bytes over 4 iterations \(limit 99\); 0:1 4:101/);
});

test('extraResources counts what appeared since the snapshot per type', () => {
  assert.deepEqual(extraResources(['Timeout', 'TCPServerWrap'], ['Timeout', 'Timeout', 'TCPServerWrap']), ['Timeout']);
  assert.deepEqual(extraResources(['A', 'B'], ['A']), []);
  assert.deepEqual(extraResources([], ['X', 'X']), ['X', 'X']);
});

test('activeResources reads the injected source or the real process', () => {
  assert.deepEqual(
    activeResources(() => ['A']),
    ['A'],
  );
  assert.ok(Array.isArray(activeResources()));
});

test('waitForNoExtraResources returns at once when nothing is left over', async () => {
  assert.deepEqual(await waitForNoExtraResources(['A'], { read: () => ['A'] }), []);
});

test('waitForNoExtraResources waits until the resource closes', async () => {
  const states = [['A', 'S'], ['A', 'S'], ['A']];
  let waits = 0;
  const extra = await waitForNoExtraResources(['A'], { read: () => states.shift() ?? ['A'], wait: async () => (waits += 1) });
  assert.deepEqual(extra, []);
  assert.equal(waits, 2);
});

test('waitForNoExtraResources gives up after the timeout and names the leftovers', async () => {
  let time = 0;
  const extra = await waitForNoExtraResources([], {
    read: () => ['TCPSocketWrap'],
    timeoutMs: 100,
    intervalMs: 40,
    now: () => time,
    wait: async (ms) => (time += ms),
  });
  assert.deepEqual(extra, ['TCPSocketWrap']);
  assert.equal(time, 120);
});

test('waitForNoExtraResources waits with real timers by default', async () => {
  const states = [['X'], []];
  const extra = await waitForNoExtraResources([], { read: () => states.shift() ?? [], intervalMs: 1 });
  assert.deepEqual(extra, []);
});
