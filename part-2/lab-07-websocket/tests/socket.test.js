const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { io: connect } = require('socket.io-client');
const { createServer } = require('../src/app');
const { createLimiter } = require('../src/rate-limit');
const { createHistory } = require('../src/history');
const { cleanName, cleanRoom, cleanText } = require('../src/validate');

let server;
let url;
let clients;

beforeEach(async () => {
  server = createServer({ historyLimit: 3, rateMax: 3, rateWindowMs: 60_000 });
  await new Promise((resolve) => server.httpServer.listen(0, resolve));
  url = `http://localhost:${server.httpServer.address().port}`;
  clients = [];
});

afterEach(async () => {
  clients.forEach((c) => c.close());
  server.io.close();
});

// Connects a client and resolves after the welcome event, so tests start from a known state.
const join = (username) =>
  new Promise((resolve, reject) => {
    const socket = connect(url, { auth: { username }, forceNew: true, transports: ['websocket'] });
    clients.push(socket);
    socket.on('connect_error', reject);
    socket.on('welcome', (info) => resolve({ socket, info }));
  });

const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const ask = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

test('a client connects and receives a welcome with the online list', async () => {
  const { info } = await join('alice');
  assert.equal(info.username, 'alice');
  assert.deepEqual(info.online, ['alice']);
});

test('connection is rejected without a valid username', async () => {
  await assert.rejects(join(''), /username of 1-24/);
  await assert.rejects(join('bad name!'), /username of 1-24/);
});

test('connection is rejected when the username is already taken', async () => {
  await join('alice');
  await assert.rejects(join('alice'), /already taken/);
});

test('other clients are notified when a user goes online and offline', async () => {
  const { socket: alice } = await join('alice');
  const online = once(alice, 'user:online');
  const { socket: bob } = await join('bob');
  assert.equal((await online).username, 'bob');
  const offline = once(alice, 'user:offline');
  bob.close();
  assert.equal((await offline).username, 'bob');
});

test('joining a room returns history and users, and notifies the room', async () => {
  const { socket: alice } = await join('alice');
  await ask(alice, 'room:join', { room: 'diagram-1' });
  const { socket: bob } = await join('bob');
  const notice = once(alice, 'room:joined');
  const reply = await ask(bob, 'room:join', { room: 'diagram-1' });
  assert.equal(reply.ok, true);
  assert.deepEqual(reply.users.map((u) => u.username).sort(), ['alice', 'bob']);
  assert.equal((await notice).username, 'bob');
});

test('room:join validates the name and refuses a second join', async () => {
  const { socket } = await join('alice');
  assert.equal((await ask(socket, 'room:join', { room: '../x' })).ok, false);
  assert.equal((await ask(socket, 'room:join', undefined)).ok, false);
  assert.equal((await ask(socket, 'room:join', { room: 'd1' })).ok, true);
  assert.equal((await ask(socket, 'room:join', { room: 'd1' })).error, 'Already in this room');
});

test('a chat message reaches everyone in the room but nobody outside it', async () => {
  const { socket: alice } = await join('alice');
  const { socket: bob } = await join('bob');
  const { socket: carol } = await join('carol');
  await ask(alice, 'room:join', { room: 'd1' });
  await ask(bob, 'room:join', { room: 'd1' });
  await ask(carol, 'room:join', { room: 'd2' });
  let leaked = false;
  carol.on('chat:message', () => (leaked = true));
  const received = once(bob, 'chat:message');
  const echoed = once(alice, 'chat:message');
  const ack = await ask(alice, 'chat:message', { room: 'd1', text: ' hello ' });
  assert.equal(ack.ok, true);
  const message = await received;
  assert.equal(message.text, 'hello');
  assert.equal(message.from, 'alice');
  assert.equal((await echoed).id, ack.id);
  assert.equal(leaked, false);
});

test('chat:message is refused outside the room, with bad text, and over the rate limit', async () => {
  const { socket } = await join('alice');
  assert.equal((await ask(socket, 'chat:message', { room: 'd1', text: 'hi' })).error, 'Join the room first');
  await ask(socket, 'room:join', { room: 'd1' });
  assert.equal((await ask(socket, 'chat:message', { room: 'd1', text: '   ' })).ok, false);
  assert.equal((await ask(socket, 'chat:message', { room: 'd1', text: 'x'.repeat(501) })).ok, false);
  assert.equal((await ask(socket, 'chat:message', { room: 'd1', text: 'one' })).ok, true);
  assert.equal((await ask(socket, 'chat:message', { room: 'd1', text: 'two' })).ok, true);
  assert.equal((await ask(socket, 'chat:message', { room: 'd1', text: 'three' })).ok, true);
  assert.equal((await ask(socket, 'chat:message', { room: 'd1', text: 'four' })).error, 'Too many messages, slow down');
});

test('history keeps only the last messages and is sent to a newcomer', async () => {
  const { socket: alice } = await join('alice');
  await ask(alice, 'room:join', { room: 'd1' });
  for (const text of ['m1', 'm2', 'm3']) await ask(alice, 'chat:message', { room: 'd1', text });
  const { socket: bob } = await join('bob');
  const reply = await ask(bob, 'room:join', { room: 'd1' });
  assert.deepEqual(
    reply.history.map((m) => m.text),
    ['m1', 'm2', 'm3'],
  );
  await ask(bob, 'chat:message', { room: 'd1', text: 'm4' });
  const { socket: eve } = await join('eve');
  const reply2 = await ask(eve, 'room:join', { room: 'd1' });
  assert.deepEqual(
    reply2.history.map((m) => m.text),
    ['m2', 'm3', 'm4'],
  );
});

test('leaving a room notifies the room and updates presence', async () => {
  const { socket: alice } = await join('alice');
  const { socket: bob } = await join('bob');
  await ask(alice, 'room:join', { room: 'd1' });
  await ask(bob, 'room:join', { room: 'd1' });
  const left = once(alice, 'room:left');
  const presence = new Promise((resolve) => alice.on('presence:update', (p) => p.users.length === 1 && resolve(p)));
  assert.equal((await ask(bob, 'room:leave', { room: 'd1' })).ok, true);
  assert.equal((await left).username, 'bob');
  assert.deepEqual(
    (await presence).users.map((u) => u.username),
    ['alice'],
  );
  assert.equal((await ask(bob, 'room:leave', { room: 'd1' })).ok, false);
});

test('disconnecting removes the user from the rooms and tells the others', async () => {
  const { socket: alice } = await join('alice');
  const { socket: bob } = await join('bob');
  await ask(alice, 'room:join', { room: 'd1' });
  await ask(bob, 'room:join', { room: 'd1' });
  const left = once(alice, 'room:left');
  bob.close();
  assert.equal((await left).username, 'bob');
});

test('typing is sent to the others in the room, not to the sender', async () => {
  const { socket: alice } = await join('alice');
  const { socket: bob } = await join('bob');
  await ask(alice, 'room:join', { room: 'd1' });
  await ask(bob, 'room:join', { room: 'd1' });
  let echoed = false;
  alice.on('typing', () => (echoed = true));
  const seen = once(bob, 'typing');
  alice.emit('typing', { room: 'd1', typing: 1 });
  alice.emit('typing', { room: 'other', typing: true });
  alice.emit('typing');
  assert.deepEqual(await seen, { room: 'd1', username: 'alice', typing: true });
  assert.equal(echoed, false);
});

test('the editing flag shows up in the presence list', async () => {
  const { socket: alice } = await join('alice');
  const { socket: bob } = await join('bob');
  await ask(alice, 'room:join', { room: 'd1' });
  await ask(bob, 'room:join', { room: 'd1' });
  assert.equal((await ask(alice, 'editing', { room: 'nope', editing: true })).ok, false);
  const presence = new Promise((resolve) => bob.on('presence:update', (p) => p.users.some((u) => u.editing) && resolve(p)));
  assert.deepEqual(await ask(alice, 'editing', { room: 'd1', editing: true }), { ok: true, editing: true });
  const editors = (await presence).users.filter((u) => u.editing).map((u) => u.username);
  assert.deepEqual(editors, ['alice']);
});

test('a private message reaches only the target and is acknowledged', async () => {
  const { socket: alice } = await join('alice');
  const { socket: bob, info: bobInfo } = await join('bob');
  const { socket: carol } = await join('carol');
  let leaked = false;
  carol.on('private:message', () => (leaked = true));
  const received = once(bob, 'private:message');
  const ack = await ask(alice, 'private:message', { to: bobInfo.id, text: 'psst' });
  assert.equal(ack.ok, true);
  assert.equal(ack.message.toName, 'bob');
  assert.equal((await received).text, 'psst');
  assert.equal(leaked, false);
  assert.equal((await ask(alice, 'private:message', { to: 'nobody', text: 'x' })).error, 'User not found');
  assert.equal((await ask(alice, 'private:message', { to: bobInfo.id, text: '' })).ok, false);
});

test('private messages share the rate limit', async () => {
  const { socket: alice } = await join('alice');
  const { info } = await join('bob');
  for (let i = 0; i < 3; i += 1) await ask(alice, 'private:message', { to: info.id, text: 'hi' });
  assert.equal((await ask(alice, 'private:message', { to: info.id, text: 'hi' })).ok, false);
});

test('events without an acknowledgement callback do not crash the server', async () => {
  const { socket } = await join('alice');
  socket.emit('room:join', { room: 'bad room' });
  socket.emit('room:join', { room: 'd1' });
  socket.emit('chat:message', { room: 'd1', text: '' });
  assert.equal((await ask(socket, 'room:leave', { room: 'd1' })).ok, true);
});

test('the static client and the health check are served', async () => {
  const health = await fetch(`${url}/health`);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const page = await fetch(`${url}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /DSLKit/);
});

test('validators accept good input and reject bad input', () => {
  assert.equal(cleanName(' ann '), 'ann');
  assert.equal(cleanName(5), null);
  assert.equal(cleanRoom('diagram-1'), 'diagram-1');
  assert.equal(cleanRoom('a b'), null);
  assert.equal(cleanText(' ok '), 'ok');
  assert.equal(cleanText(7), null);
});

test('the limiter forgets old events and history copies its list', () => {
  let now = 0;
  const allowed = createLimiter(1, 100, () => now);
  assert.equal(allowed(), true);
  assert.equal(allowed(), false);
  now = 150;
  assert.equal(allowed(), true);
  const history = createHistory(2);
  history.add('r', 1);
  history.list('r').push(99);
  assert.deepEqual(history.list('r'), [1]);
  assert.deepEqual(history.list('none'), []);
});
