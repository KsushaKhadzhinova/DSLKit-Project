// Reusable helper for memory leak checks: runs an async action many times, samples the used heap after a forced
// garbage collection at several points and reports how much memory stayed behind. Node must run with --expose-gc.
// Everything that touches the process (gc, memoryUsage, the event loop, the list of active resources) is injectable,
// so the helper itself is tested without real garbage collection.

const tick = () => new Promise((resolve) => setImmediate(resolve));

// Forces a full collection a few times, with a turn of the event loop between rounds so finalizers and
// close callbacks can run and release what they hold.
export const settle = async ({ gc = globalThis.gc, rounds = 3, yieldLoop = tick } = {}) => {
  if (typeof gc !== 'function') throw new Error('global.gc is not available: run node with --expose-gc');
  for (let round = 0; round < rounds; round += 1) {
    gc();
    await yieldLoop();
  }
};

export const sampleHeap = async ({ memoryUsage = process.memoryUsage, ...options } = {}) => {
  await settle(options);
  return memoryUsage().heapUsed;
};

// Least squares slope of the points: how many bytes the heap grows per iteration over the whole run.
export const slope = (points) => {
  const n = points.length;
  const meanX = points.reduce((sum, p) => sum + p.iteration, 0) / n;
  const meanY = points.reduce((sum, p) => sum + p.heapUsed, 0) / n;
  const covariance = points.reduce((sum, p) => sum + (p.iteration - meanX) * (p.heapUsed - meanY), 0);
  const variance = points.reduce((sum, p) => sum + (p.iteration - meanX) ** 2, 0);
  return variance === 0 ? 0 : covariance / variance;
};

// Runs action(i) `iterations` times after `warmup` runs that are not measured (they fill caches, compile code,
// open the connection pool). The heap is sampled after the warmup and then `samples` times at even steps.
export const measureGrowth = async (action, { iterations = 2000, warmup = 100, samples = 5, ...options } = {}) => {
  for (let i = 0; i < warmup; i += 1) await action(i);
  const baseline = await sampleHeap(options);
  const points = [{ iteration: 0, heapUsed: baseline }];
  const step = Math.max(1, Math.floor(iterations / samples));
  let done = 0;
  while (done < iterations) {
    const upTo = Math.min(iterations, done + step);
    for (; done < upTo; done += 1) await action(done);
    points.push({ iteration: done, heapUsed: await sampleHeap(options) });
  }
  const final = points[points.length - 1].heapUsed;
  return { iterations, baseline, final, growthBytes: final - baseline, bytesPerIteration: slope(points), points };
};

// Fails when the heap that stayed behind after collection is above the limit.
export const assertGrowthBelow = (report, maxBytes) => {
  if (report.growthBytes > maxBytes) {
    const trail = report.points.map((p) => `${p.iteration}:${p.heapUsed}`).join(' ');
    throw new Error(`heap grew by ${report.growthBytes} bytes over ${report.iterations} iterations (limit ${maxBytes}); ${trail}`);
  }
  return report;
};

// Names of the active resources of the process (sockets, servers, timers) as Node reports them.
export const activeResources = (read = () => process.getActiveResourcesInfo()) => read();

// What is in `after` and was not in `before`, counted per type (a multiset difference).
export const extraResources = (before, after) => {
  const left = new Map();
  before.forEach((name) => left.set(name, (left.get(name) ?? 0) + 1));
  const extra = [];
  after.forEach((name) => {
    const count = left.get(name) ?? 0;
    if (count > 0) left.set(name, count - 1);
    else extra.push(name);
  });
  return extra;
};

// Closing is asynchronous: waits until nothing is left over compared with the snapshot taken before, or the time ends.
export const waitForNoExtraResources = async (
  before,
  { timeoutMs = 3000, intervalMs = 20, read, now = Date.now, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {},
) => {
  const started = now();
  let extra = extraResources(before, activeResources(read));
  while (extra.length > 0 && now() - started < timeoutMs) {
    await wait(intervalMs);
    extra = extraResources(before, activeResources(read));
  }
  return extra;
};
