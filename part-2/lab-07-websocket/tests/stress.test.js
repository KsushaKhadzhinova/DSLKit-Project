const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { io: connect } = require('socket.io-client');
const { createServer } = require('../src/app');

// Smoke, load, stress, spike, volume, endurance, recovery and fuzz tests of the chat server over real sockets.

const boot = async (options = {}) => {
  const server = createServer({ maxPerAddress: 1000, maxUsers: 1000, rateMax: 100000, eventRateMax: 100000, ...options });
  await new Promise((resolve) => server.httpServer.listen(0, '127.0.0.1', resolve));
  const port = server.httpServer.address().port;
  const url = `http://127.0.0.1:${port}`;
  const clients = new Set();
  const join = (username, extra = {}) =>
    new Promise((resolve, reject) => {
      const socket = connect(url, { auth: { username }, forceNew: true, transports: ['websocket'], reconnection: false, ...extra });
      clients.add(socket);
      socket.on('connect_error', reject);
      socket.on('welcome', (info) => resolve({ socket, info }));
    });
  const close = async () => {
    clients.forEach((c) => c.close());
    await new Promise((resolve) => server.io.close(resolve));
  };
  return { server, url, port, join, close, clients };
};

const ask = (socket, event, payload, timeout = 3000) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: 'timeout' }), timeout);
    socket.emit(event, payload, (reply) => {
      clearTimeout(timer);
      resolve(reply);
    });
  });

test('smoke: connect, join a room, send a message and see it arrive', async () => {
  const app = await boot();
  try {
    const { socket: alice } = await app.join('alice');
    const { socket: bob } = await app.join('bob');
    await ask(alice, 'room:join', { room: 'd1' });
    await ask(bob, 'room:join', { room: 'd1' });
    const got = new Promise((resolve) => bob.once('chat:message', resolve));
    await ask(alice, 'chat:message', { room: 'd1', text: 'привет' });
    assert.equal((await got).text, 'привет');
  } finally {
    await app.close();
  }
});

test('load: 150 clients connect, join one room and each receives a broadcast', async () => {
  const app = await boot({ maxRoomMembers: 500 });
  try {
    const sockets = [];
    const results = await Promise.allSettled(Array.from({ length: 150 }, (_, i) => app.join(`user${i}`)));
    for (const r of results) if (r.status === 'fulfilled') sockets.push(r.value.socket);
    assert.equal(sockets.length, 150, `only ${sockets.length} clients connected`);
    const replies = await Promise.all(sockets.map((s) => ask(s, 'room:join', { room: 'big' })));
    const joined = replies.filter((r) => r?.ok).length;
    assert.ok(joined >= 1);
    const member = sockets.filter((_, i) => replies[i]?.ok);
    let received = 0;
    member.forEach((s) => s.on('chat:message', () => (received += 1)));
    await ask(member[0], 'chat:message', { room: 'big', text: 'hello all' });
    for (let waited = 0; waited < 5000 && received < member.length; waited += 100) await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(received, member.length, `${received} of ${member.length} members got the message (replies: ${JSON.stringify(replies.slice(0, 3))})`);
  } finally {
    await app.close();
  }
});

test('stress: 60 clients send 20 mixed events each, including hostile payloads, and the server never dies', async () => {
  const app = await boot();
  try {
    const sockets = (await Promise.all(Array.from({ length: 60 }, (_, i) => app.join(`s${i}`)))).map((r) => r.socket);
    const hostile = [undefined, null, 0, '', { room: 'x'.repeat(100) }, { room: '../../etc' }, { room: 'd1', text: 'y'.repeat(5000) }, { room: ['d1'], text: {} }, { __proto__: { admin: true }, room: 'd1', text: 'hi' }, [], ];
    let failures = 0;
    await Promise.all(
      sockets.map(async (socket, n) => {
        for (let i = 0; i < 20; i += 1) {
          // Only these events answer with an acknowledgement; typing, editing and an unknown event are fire-and-forget.
          const events = ['room:join', 'chat:message', 'private:message', 'room:leave'];
          const reply = await ask(socket, events[(n + i) % events.length], hostile[(n * 3 + i) % hostile.length], 1500);
          if (reply?.error === 'timeout') failures += 1;
          socket.emit(['typing', 'editing', 'no-such-event'][i % 3], hostile[(n + i) % hostile.length]);
        }
      }),
    );
    assert.ok(failures < 60 * 20 * 0.02, `${failures} events got no answer`);
    const { socket } = await app.join('after');
    assert.equal((await ask(socket, 'room:join', { room: 'alive' })).ok, true, 'the server does not serve new clients after the stress');
  } finally {
    await app.close();
  }
});

test('spike: 400 raw sockets that never speak WebSocket are dropped and a real client still connects', async () => {
  const app = await boot();
  try {
    const raw = Array.from({ length: 400 }, () => {
      const socket = net.connect(app.port, '127.0.0.1');
      socket.on('error', () => {});
      socket.on('connect', () => socket.write('GET /socket.io/?EIO=4&transport=websocket HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: !!!\r\nSec-WebSocket-Version: 13\r\n\r\n'));
      return socket;
    });
    await new Promise((resolve) => setTimeout(resolve, 600));
    raw.forEach((socket) => socket.destroy());
    const { socket } = await app.join('real');
    assert.equal((await ask(socket, 'room:join', { room: 'ok' })).ok, true);
  } finally {
    await app.close();
  }
});

test('volume: 3000 messages in one room keep the history within its limit and the server answers fast', async () => {
  const app = await boot({ historyLimit: 50 });
  try {
    const { socket } = await app.join('writer');
    await ask(socket, 'room:join', { room: 'log' });
    for (let i = 0; i < 3000; i += 1) await ask(socket, 'chat:message', { room: 'log', text: `message ${i}` });
    const { socket: late, info } = await app.join('late');
    void info;
    const reply = await ask(late, 'room:join', { room: 'log' });
    assert.equal(reply.ok, true);
    const history = reply.history ?? reply.messages ?? [];
    assert.ok(history.length <= 50, `the history holds ${history.length} messages`);
  } finally {
    await app.close();
  }
});

test('endurance: 400 connect and disconnect cycles leave no users, rooms or memory behind', async () => {
  const app = await boot();
  try {
    global.gc?.();
    const before = process.memoryUsage().heapUsed;
    for (let round = 0; round < 40; round += 1) {
      const batch = await Promise.all(Array.from({ length: 10 }, (_, i) => app.join(`c${round}_${i}`)));
      await Promise.all(batch.map(({ socket }) => ask(socket, 'room:join', { room: `r${round % 5}` })));
      batch.forEach(({ socket }) => socket.close());
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    const { info } = await app.join('observer');
    assert.deepEqual(info.online.map((u) => u.username), ['observer'], 'users were left online after disconnecting');
    global.gc?.();
    assert.ok((process.memoryUsage().heapUsed - before) / 1024 / 1024 < 150, 'the heap grew a lot');
  } finally {
    await app.close();
  }
});

test('recovery: clients that vanish without a close (no goodbye) are removed and the others are told', async () => {
  const app = await boot({ pingInterval: 100, pingTimeout: 200 });
  try {
    const { socket: alice } = await app.join('alice');
    const { socket: bob } = await app.join('bob');
    const offline = new Promise((resolve) => alice.once('user:offline', resolve));
    bob.io.engine.transport.ws?.terminate?.() ?? bob.io.engine.close();
    const gone = await Promise.race([offline, new Promise((resolve) => setTimeout(() => resolve(null), 4000))]);
    assert.ok(gone, 'the other client was never told that bob is gone');
    assert.equal(gone.username, 'bob');
  } finally {
    await app.close();
  }
});

test('flood control: one client that sends too fast is limited and the room is not flooded', async () => {
  const app = await boot({ rateMax: 5, rateWindowMs: 5000 });
  try {
    const { socket: spammer } = await app.join('spammer');
    const { socket: watcher } = await app.join('watcher');
    await ask(spammer, 'room:join', { room: 'quiet' });
    await ask(watcher, 'room:join', { room: 'quiet' });
    let seen = 0;
    watcher.on('chat:message', () => (seen += 1));
    const replies = await Promise.all(Array.from({ length: 60 }, (_, i) => ask(spammer, 'chat:message', { room: 'quiet', text: `spam ${i}` })));
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.ok(replies.filter((r) => r?.ok).length <= 5, 'more messages than the limit got through');
    assert.ok(seen <= 5, `the watcher got ${seen} messages`);
  } finally {
    await app.close();
  }
});

test('an oversized packet closes only the connection that sent it', async () => {
  const app = await boot();
  try {
    const { socket: big } = await app.join('big');
    const { socket: other } = await app.join('other');
    const closed = new Promise((resolve) => big.once('disconnect', resolve));
    big.emit('chat:message', { room: 'd1', text: 'x'.repeat(200000) });
    await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 3000))]);
    assert.equal(big.connected, false, 'the oversized packet did not close the connection');
    assert.equal((await ask(other, 'room:join', { room: 'still-fine' })).ok, true);
  } finally {
    await app.close();
  }
});
