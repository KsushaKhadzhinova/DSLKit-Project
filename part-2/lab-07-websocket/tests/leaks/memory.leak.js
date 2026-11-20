const { test } = require('node:test');
const assert = require('node:assert/strict');
const { io: connect } = require('socket.io-client');
const { createServer } = require('../../src/app');

// Memory leak checks, run with `npm run test:leaks` (node --expose-gc); they are not part of `npm test`.
// The chat history keeps the last 50 messages of a room (limits.json), so the socket warmup (300) must fill the 5 rooms
// of the test first; what is kept after that is the bounded history, not a leak.
// 1) 2000 HTTP requests, 2) 500 clients that connect, join a room, send a message and disconnect. The heap that stays
// after a forced collection is compared with the heap after the warmup; after the sockets are gone the server must hold
// no client, no socket, no room and no extra listeners, and after close() no handle may stay open.
// LIMIT_BYTES is twice the largest growth measured over 3 runs, but not below 500 000 bytes: after a collection the runtime keeps
// or frees a few hundred kilobytes of its own state. The numbers are in docs/CI-CHECKS.md.
const HTTP_ITERATIONS = Number(process.env.LEAK_ITERATIONS) || 2000;
const WARMUP = Number(process.env.LEAK_WARMUP) || 500;
const HTTP_LIMIT_BYTES = 800_000;
const SOCKET_ITERATIONS = Number(process.env.LEAK_SOCKETS) || 500;
const SOCKET_LIMIT_BYTES = 600_000;
const json = { 'Content-Type': 'application/json' };

const boot = async () => {
  const { httpServer, io } = createServer({ maxPerAddress: 100000, maxUsers: 100000, rateMax: 1000000, eventRateMax: 1000000 });
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  return { httpServer, io, port: httpServer.address().port };
};

const stop = async ({ httpServer, io }) => {
  httpServer.closeAllConnections();
  await new Promise((resolve) => io.close(resolve));
};

test('2000 HTTP requests leave no growing heap behind', async () => {
  const { measureGrowth, assertGrowthBelow } = await import('../../../../tools/leaks/heap-growth.js');
  const app = await boot();
  const base = `http://127.0.0.1:${app.port}`;
  const send = async (path, init) => {
    const res = await fetch(base + path, init);
    return { status: res.status, text: await res.text() };
  };
  const kinds = [
    () => send('/health'),
    () => send('/limits.json'),
    (i) => send('/login', { method: 'POST', headers: json, body: JSON.stringify({ username: `user${i % 50}` }) }),
    () => send('/login', { method: 'POST', headers: json, body: '{"broken' }),
    (i) => send(`/missing/${i}`),
  ];
  try {
    const report = await measureGrowth((i) => kinds[i % kinds.length](i), { iterations: HTTP_ITERATIONS, warmup: WARMUP });
    console.log(`lab-07 http growth ${report.growthBytes} bytes, ${report.bytesPerIteration.toFixed(2)} per iteration`);
    assertGrowthBelow(report, HTTP_LIMIT_BYTES);
  } finally {
    await stop(app);
  }
});

test('500 clients that connect and disconnect leave no sockets, rooms, listeners, heap growth or open handles', async () => {
  const { measureGrowth, assertGrowthBelow, activeResources, waitForNoExtraResources } = await import('../../../../tools/leaks/heap-growth.js');
  const before = activeResources();
  const app = await boot();
  const url = `http://127.0.0.1:${app.port}`;
  const listeners = () => ['request', 'upgrade', 'connection'].map((event) => app.httpServer.listenerCount(event));
  const ioListeners = () => app.io.listenerCount('connection');
  const listenersAtStart = listeners();
  const ioListenersAtStart = ioListeners();

  const visit = (i) =>
    new Promise((resolve, reject) => {
      const socket = connect(url, { auth: { username: `leak${i}` }, forceNew: true, transports: ['websocket'], reconnection: false });
      socket.on('connect_error', reject);
      socket.on('welcome', () => {
        socket.emit('room:join', { room: `room${i % 5}` }, () => {
          socket.emit('chat:message', { room: `room${i % 5}`, text: `hello ${i}` }, () => {
            socket.once('disconnect', resolve);
            socket.close();
          });
        });
      });
    });
  const report = await measureGrowth(visit, { iterations: SOCKET_ITERATIONS, warmup: Number(process.env.LEAK_WARMUP) || 300 });
  console.log(`lab-07 socket growth ${report.growthBytes} bytes, ${report.bytesPerIteration.toFixed(2)} per iteration`);
  assertGrowthBelow(report, SOCKET_LIMIT_BYTES);

  // The server notices the last disconnects a moment after the clients do.
  for (let i = 0; i < 100 && (app.io.engine.clientsCount > 0 || app.io.of('/').sockets.size > 0); i += 1)
    await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(app.io.engine.clientsCount, 0, 'engine clients left');
  assert.equal(app.io.of('/').sockets.size, 0, 'sockets left');
  assert.equal(app.io.of('/').adapter.rooms.size, 0, 'rooms left');
  assert.deepEqual(listeners(), listenersAtStart, 'listeners on the http server grew');
  assert.equal(ioListeners(), ioListenersAtStart, 'connection listeners on io grew');

  await stop(app);
  const extra = await waitForNoExtraResources(before);
  assert.deepEqual(extra, [], `open handles after close: ${extra.join(', ')}`);
});
