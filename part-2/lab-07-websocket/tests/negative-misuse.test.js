// Wrong behaviour of a user: empty and odd payloads, spam and recovery, forged or expired tokens,
// strange names and addresses, wrong HTTP methods. Each test is one scenario.
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
const join = (name, base = url) =>
  new Promise((resolve, reject) => {
    const socket = open({ username: name }, base);
    socket.on('connect_error', reject);
    socket.on('welcome', (info) => resolve({ socket, info }));
  });
// Resolves with the connection error when the server refuses the socket, rejects if it lets the socket in.
const refusal = (auth, options = {}, base = url) =>
  new Promise((resolve, reject) => {
    const socket = open(auth, base, options);
    socket.on('welcome', () => reject(new Error('the socket was accepted')));
    socket.on('connect_error', resolve);
  });
const ask = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('room:join, room:leave, editing and chat message without data answer an error', async () => {
  const { socket } = await join('alice');
  for (const event of ['room:join', 'room:leave', 'editing', 'chat:message', 'private:message']) {
    assert.equal((await ask(socket, event)).ok, false, event);
  }
  socket.emit('typing');
  assert.equal((await ask(socket, 'room:join', { room: 'd1' })).ok, true);
});

test('an array or a string instead of an object is refused by join, message and private message', async () => {
  const { socket } = await join('alice');
  await ask(socket, 'room:join', { room: 'd1' });
  for (const payload of [[], ['d1'], 'd1']) {
    assert.equal((await ask(socket, 'room:join', payload)).ok, false, JSON.stringify(payload));
    assert.equal((await ask(socket, 'chat:message', payload)).ok, false, JSON.stringify(payload));
    assert.equal((await ask(socket, 'private:message', payload)).ok, false, JSON.stringify(payload));
  }
});

test('a 20 KB private message closes only the sender, and the next user can still join', async () => {
  const { socket: alice } = await join('alice');
  const closed = once(alice, 'disconnect');
  alice.emit('private:message', { to: 'no-such-id', text: 'y'.repeat(20_000) });
  await closed;
  const { socket: bob } = await join('bob');
  assert.equal((await ask(bob, 'room:join', { room: 'd1' })).ok, true);
});

test('a room name of spaces or with a leading space is refused by leave, editing and message', async () => {
  const { socket } = await join('alice');
  await ask(socket, 'room:join', { room: 'd1' });
  for (const room of ['   ', ' d1']) {
    assert.equal((await ask(socket, 'room:leave', { room })).ok, false, JSON.stringify(room));
    assert.equal((await ask(socket, 'editing', { room, editing: true })).ok, false, JSON.stringify(room));
    assert.equal((await ask(socket, 'chat:message', { room, text: 'hi' })).ok, false, JSON.stringify(room));
  }
});

test('a private message of spaces, tabs or only hidden characters is refused and never reaches the target', async () => {
  const { socket: alice } = await join('alice');
  const { socket: bob, info: bobInfo } = await join('bob');
  let received = false;
  bob.on('private:message', () => {
    received = true;
  });
  for (const text of ['   ', '\t\n', '\u0000\u0007', '‮⁦']) {
    const reply = await ask(alice, 'private:message', { to: bobInfo.id, text });
    assert.equal(reply.ok, false, JSON.stringify(text));
    assert.match(reply.error, /characters/);
  }
  await pause(50);
  assert.equal(received, false);
});

test('a private message to a user who has just left is answered "User not found"', async () => {
  const { socket: alice } = await join('alice');
  const { socket: bob, info: bobInfo } = await join('bob');
  const gone = once(alice, 'user:offline');
  bob.close();
  await gone;
  const reply = await ask(alice, 'private:message', { to: bobInfo.id, text: 'are you there?' });
  assert.equal(reply.ok, false);
  assert.match(reply.error, /not found/);
});

test('a private message to oneself is refused and no copy reaches the sender', async () => {
  const { socket, info } = await join('alice');
  let copies = 0;
  socket.on('private:message', () => {
    copies += 1;
  });
  assert.equal((await ask(socket, 'private:message', { to: info.id, text: 'note to me' })).ok, false);
  await pause(50);
  assert.equal(copies, 0);
});

test('spam over the rate limit is refused, and the same user can write again after the window', async () => {
  const base = await listen({ rateMax: 2, rateWindowMs: 100 });
  const { socket } = await join('alice', base);
  await ask(socket, 'room:join', { room: 'd1' });
  const replies = [];
  for (let i = 0; i < 3; i += 1) replies.push(await ask(socket, 'chat:message', { room: 'd1', text: `m${i}` }));
  assert.deepEqual(
    replies.map((r) => r.ok),
    [true, true, false],
  );
  await pause(150);
  assert.equal((await ask(socket, 'chat:message', { room: 'd1', text: 'again' })).ok, true);
});

test('joining the same room twice keeps one entry for the user in the room list', async () => {
  const { socket: alice } = await join('alice');
  await join('bob');
  const { socket: carol } = await join('carol');
  assert.equal((await ask(alice, 'room:join', { room: 'd1' })).ok, true);
  assert.equal((await ask(alice, 'room:join', { room: 'd1' })).ok, false);
  const reply = await ask(carol, 'room:join', { room: 'd1' });
  assert.deepEqual(
    reply.users.filter((u) => u.username === 'alice').map((u) => u.username),
    ['alice'],
  );
});

test('a user who disconnects while editing leaves the presence list of the room', async () => {
  const { socket: alice } = await join('alice');
  const { socket: bob } = await join('bob');
  await ask(alice, 'room:join', { room: 'd1' });
  await ask(bob, 'room:join', { room: 'd1' });
  assert.equal((await ask(alice, 'editing', { room: 'd1', editing: true })).ok, true);
  const gone = new Promise((resolve) =>
    bob.on('presence:update', (m) => {
      if (!m.users.some((u) => u.username === 'alice')) resolve(m);
    }),
  );
  alice.close();
  assert.deepEqual((await gone).users.map((u) => u.username), ['bob']);
});

test('a socket from an Origin of "null" or of another port on the same host is refused', async () => {
  for (const origin of ['null', 'http://localhost:1']) {
    const error = await refusal({ username: 'mallory' }, { extraHeaders: { Origin: origin } });
    assert.ok(error instanceof Error, origin);
  }
});

test('a token whose signature has one character changed is refused', async () => {
  const [body, signature] = issueToken('alice', SECRET).split('.');
  const flipped = signature[0] === 'A' ? `B${signature.slice(1)}` : `A${signature.slice(1)}`;
  const error = await refusal({ token: `${body}.${flipped}` });
  assert.match(error.message, /token/i);
});

test('a token that expires in the current second is refused', async () => {
  const token = issueToken('alice', SECRET, { ttlSeconds: 0 });
  const error = await refusal({ token });
  assert.match(error.message, /token/i);
});

test('a token of a name that is online now is refused as taken', async () => {
  await join('alice');
  const error = await refusal({ token: issueToken('alice', SECRET) });
  assert.match(error.message, /taken/);
});

test('POST /login with a name of spaces, a path, markup, a number or a list answers 400 and no token', async () => {
  const names = ['   ', '\t', '../admin', '<script>alert(1)</script>', 'a b', 'x'.repeat(25), '\u0000', 123, ['alice'], { name: 'alice' }];
  for (const username of names) {
    const res = await fetch(`${url}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const text = await res.text();
    assert.equal(res.status, 400, JSON.stringify(username));
    assert.doesNotMatch(text, /token/, JSON.stringify(username));
  }
});

test('unknown paths such as /.env, /admin and an encoded traversal answer 404 without file details', async () => {
  for (const path of ['/.env', '/admin', '/login.html', '/%2e%2e%2fpackage.json']) {
    const res = await fetch(`${url}${path}`);
    const text = await res.text();
    assert.equal(res.status, 404, path);
    assert.doesNotMatch(text, /ENOENT|node_modules|\.js:\d+/, path);
  }
});

test('GET or PUT on /login and POST on /health answer 405 with an Allow header', async () => {
  const cases = [
    ['GET', '/login', 'POST'],
    ['PUT', '/login', 'POST'],
    ['POST', '/health', 'GET'],
  ];
  for (const [method, path, allow] of cases) {
    const res = await fetch(`${url}${path}`, { method });
    assert.equal(res.status, 405, `${method} ${path}`);
    assert.equal(res.headers.get('allow'), allow, `${method} ${path}`);
  }
});
