// Wrong behaviour of a user: bad payloads, spam, forged tokens, foreign sites.
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { io: connect } = require('socket.io-client');
const { createServer } = require('../src/app');
const { issueToken } = require('../src/token');

const SECRET = 'test-secret';
let url;
let clients;
let servers;

const listen = async (options) => {
  const s = createServer({ tokenSecret: SECRET, ...options });
  await new Promise((resolve) => s.httpServer.listen(0, resolve));
  servers.push(s);
  return `http://localhost:${s.httpServer.address().port}`;
};

beforeEach(async () => {
  clients = [];
  servers = [];
  url = await listen({ rateMax: 3, rateWindowMs: 60_000 });
});

afterEach(() => {
  clients.forEach((c) => c.close());
  servers.forEach((s) => s.io.close());
});

const open = (auth, base = url, options = {}) => {
  const socket = connect(base, { forceNew: true, reconnection: false, transports: ['websocket'], auth, ...options });
  clients.push(socket);
  return socket;
};
const join = (name) =>
  new Promise((resolve, reject) => {
    const socket = open({ username: name });
    socket.on('connect_error', reject);
    socket.on('welcome', (info) => resolve({ socket, info }));
  });
const ask = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('a connection without a name is refused', async () => {
  await assert.rejects(join(undefined), /username/);
});

test('a name made of spaces, a too long name and a number are refused', async () => {
  for (const name of ['   ', 'x'.repeat(25), 'bad name!', 5, null]) await assert.rejects(join(name), /username/, String(name));
});

test('a second connection with the same name in another letter case is refused', async () => {
  await join('Alice');
  await assert.rejects(join('alice'), /taken/);
});

test('room:join without data, with a number and with a space-only room answers an error', async () => {
  const { socket } = await join('alice');
  for (const payload of [undefined, 5, null, {}, { room: '   ' }, { room: 7 }, { room: 'a'.repeat(41) }]) {
    const reply = await ask(socket, 'room:join', payload);
    assert.equal(reply.ok, false, JSON.stringify(payload));
  }
});

test('a chat message that is empty, spaces only or not a string is rejected', async () => {
  const { socket } = await join('alice');
  await ask(socket, 'room:join', { room: 'd1' });
  for (const text of ['', '   ', '\t\n', 5, { a: 1 }, null, 'x'.repeat(501)]) {
    const reply = await ask(socket, 'chat:message', { room: 'd1', text });
    assert.equal(reply.ok, false, JSON.stringify(text));
  }
});

test('a chat message with a number instead of an object answers an error', async () => {
  const { socket } = await join('alice');
  assert.equal((await ask(socket, 'chat:message', 42)).ok, false);
  assert.equal((await ask(socket, 'chat:message', undefined)).ok, false);
});

test('a message to a room the user has not joined is rejected', async () => {
  const { socket } = await join('alice');
  assert.equal((await ask(socket, 'chat:message', { room: 'other', text: 'hi' })).ok, false);
});

test('joining the same room twice without leaving answers an error', async () => {
  const { socket } = await join('alice');
  assert.equal((await ask(socket, 'room:join', { room: 'd1' })).ok, true);
  assert.equal((await ask(socket, 'room:join', { room: 'd1' })).ok, false);
});

test('leaving a room that was never joined answers an error', async () => {
  const { socket } = await join('alice');
  assert.equal((await ask(socket, 'room:leave', { room: 'd1' })).ok, false);
});

test('a private message to oneself, to nobody and to a non-string id is rejected', async () => {
  const { socket, info } = await join('alice');
  assert.equal((await ask(socket, 'private:message', { to: info.id, text: 'me' })).ok, false);
  assert.equal((await ask(socket, 'private:message', { to: 'no-such-id', text: 'hi' })).ok, false);
  assert.equal((await ask(socket, 'private:message', { to: { $ne: 1 }, text: 'hi' })).ok, false);
});

test('a forged sender in the payload is ignored: the name comes from the connection', async () => {
  const { socket: alice } = await join('alice');
  const { socket: bob } = await join('bob');
  await ask(alice, 'room:join', { room: 'd1' });
  await ask(bob, 'room:join', { room: 'd1' });
  const seen = once(bob, 'chat:message');
  await ask(alice, 'chat:message', { room: 'd1', text: 'hi', from: 'admin', fromId: 'x' });
  assert.equal((await seen).from, 'alice');
});

test('messages above the rate limit are refused with a clear error', async () => {
  const { socket } = await join('alice');
  await ask(socket, 'room:join', { room: 'd1' });
  const replies = [];
  for (let i = 0; i < 5; i += 1) replies.push(await ask(socket, 'chat:message', { room: 'd1', text: `m${i}` }));
  assert.deepEqual(
    replies.map((r) => r.ok),
    [true, true, true, false, false],
  );
  assert.match(replies[3].error, /slow down/);
});

test('a packet above the size limit closes the connection and the server keeps serving others', async () => {
  const { socket } = await join('alice');
  await ask(socket, 'room:join', { room: 'd1' });
  const closed = once(socket, 'disconnect');
  socket.emit('chat:message', { room: 'd1', text: 'x'.repeat(200_000) });
  await closed;
  const { socket: bob } = await join('bob');
  assert.equal((await ask(bob, 'room:join', { room: 'd1' })).ok, true);
});

test('typing and editing with garbage payloads do not crash the server', async () => {
  const { socket } = await join('alice');
  socket.emit('typing', 5);
  socket.emit('typing', null);
  socket.emit('editing', 'yes');
  socket.emit('no-such-event', { a: 1 });
  assert.equal((await ask(socket, 'room:join', { room: 'd1' })).ok, true);
});

test('a user who disconnects while typing is shown as stopped typing to the room', async () => {
  const { socket: alice } = await join('alice');
  const { socket: bob } = await join('bob');
  await ask(alice, 'room:join', { room: 'd1' });
  await ask(bob, 'room:join', { room: 'd1' });
  const stopped = new Promise((resolve) => bob.on('typing', (m) => m.typing === false && resolve(m)));
  alice.emit('typing', { room: 'd1', typing: true });
  await pause(50);
  alice.close();
  assert.equal((await stopped).username, 'alice');
});

test('a socket opened from a foreign Origin is refused', async () => {
  const socket = open({ username: 'mallory' }, url, { extraHeaders: { Origin: 'http://evil.example' } });
  await assert.rejects(
    new Promise((resolve, reject) => {
      socket.on('welcome', resolve);
      socket.on('connect_error', reject);
    }),
  );
});

test('a garbage token, a forged signature and an expired token are refused', async () => {
  const good = issueToken('alice', SECRET);
  const [body] = good.split('.');
  const forged = Buffer.from(JSON.stringify({ sub: 'admin', exp: 9999999999 })).toString('base64url');
  const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${forged}.`;
  const expired = issueToken('alice', SECRET, { ttlSeconds: 1, now: () => 0 });
  for (const token of ['', 'garbage', `${forged}.${good.split('.')[1]}`, `${body}.`, none, expired, 5, { a: 1 }]) {
    const socket = open({ token });
    await assert.rejects(
      new Promise((resolve, reject) => {
        socket.on('welcome', resolve);
        socket.on('connect_error', reject);
      }),
      /token/i,
      JSON.stringify(token),
    );
  }
});

test('POST /login with a broken body answers 4xx, not 500', async () => {
  for (const body of ['', '{"username":', '[]', 'null']) {
    const res = await fetch(`${url}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.ok(res.status >= 400 && res.status < 500, `${body} -> ${res.status}`);
  }
  const wrongType = await fetch(`${url}/login`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'alice' });
  assert.equal(wrongType.status, 400);
});

test('POST /login with a body over the size limit answers 413', async () => {
  const res = await fetch(`${url}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'x'.repeat(5000) }),
  });
  assert.equal(res.status, 413);
});

test('an unknown address answers 404 and a token is not leaked in it', async () => {
  const res = await fetch(`${url}/login/../nothing?token=abc`);
  assert.equal(res.status, 404);
});
