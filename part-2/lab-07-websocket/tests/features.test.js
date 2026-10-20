// Chat history in a store that can be swapped (MongoDB-shaped) and login by a signed token.
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { io: connect } = require('socket.io-client');
const { createServer } = require('../src/app');
const { createMongoHistory } = require('../src/history');
const { issueToken, verifyToken } = require('../src/token');

const SECRET = 'test-secret';
let clients = [];
let servers = [];

afterEach(() => {
  clients.forEach((c) => c.close());
  servers.forEach((s) => s.io.close());
  clients = [];
  servers = [];
});

// A tiny stand-in for a MongoDB collection: insertOne and find().sort().limit().toArray().
const fakeCollection = () => {
  const docs = [];
  return {
    docs,
    insertOne: async (doc) => void docs.push({ _id: docs.length + 1, ...doc }),
    find: (filter) => {
      let rows = docs.filter((d) => d.room === filter.room);
      const cursor = {
        sort: () => ((rows = [...rows].sort((a, b) => b._id - a._id)), cursor),
        limit: (n) => ((rows = rows.slice(0, n)), cursor),
        toArray: async () => rows,
      };
      return cursor;
    },
  };
};

const start = async (options) => {
  const s = createServer({ tokenSecret: SECRET, ...options });
  await new Promise((resolve) => s.httpServer.listen(0, resolve));
  servers.push(s);
  return `http://localhost:${s.httpServer.address().port}`;
};
const open = (url, auth) => {
  const socket = connect(url, { forceNew: true, reconnection: false, transports: ['websocket'], auth });
  clients.push(socket);
  return socket;
};
const ready = (socket) =>
  new Promise((resolve, reject) => {
    socket.on('welcome', resolve);
    socket.on('connect_error', reject);
  });
const ask = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const login = async (url, username) =>
  (await fetch(`${url}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) })).json();

test('messages are written to the injected store and a new connection reads them back after a restart', async () => {
  const collection = fakeCollection();
  const url = await start({ history: createMongoHistory(collection) });
  const alice = open(url, { username: 'alice' });
  await ready(alice);
  await ask(alice, 'room:join', { room: 'd1' });
  await ask(alice, 'chat:message', { room: 'd1', text: 'first' });
  await ask(alice, 'chat:message', { room: 'd1', text: 'second' });
  assert.equal(collection.docs.length, 2);
  assert.equal(collection.docs[0].room, 'd1');

  const url2 = await start({ history: createMongoHistory(collection) });
  const bob = open(url2, { username: 'bob' });
  await ready(bob);
  const reply = await ask(bob, 'room:join', { room: 'd1' });
  assert.deepEqual(
    reply.history.map((m) => m.text),
    ['first', 'second'],
  );
  assert.equal(reply.history[0]._id, undefined);
});

test('the Mongo history returns only the newest messages up to its limit and only for the asked room', async () => {
  const collection = fakeCollection();
  const history = createMongoHistory(collection, 2);
  for (const text of ['a', 'b', 'c']) await history.add('r1', { text });
  await history.add('r2', { text: 'other' });
  assert.deepEqual(
    (await history.list('r1')).map((m) => m.text),
    ['b', 'c'],
  );
  assert.deepEqual(await history.list('empty'), []);
});

test('a failing store answers an error instead of crashing, and the room can be joined later', async () => {
  let broken = true;
  const store = {
    list: async () => {
      if (broken) throw new Error('db down');
      return [];
    },
    add: async () => {
      if (broken) throw new Error('db down');
    },
  };
  const url = await start({ history: store });
  const alice = open(url, { username: 'alice' });
  await ready(alice);
  const failed = await ask(alice, 'room:join', { room: 'd1' });
  assert.equal(failed.ok, false);
  assert.match(failed.error, /unavailable/);
  broken = false;
  assert.equal((await ask(alice, 'room:join', { room: 'd1' })).ok, true);
  broken = true;
  const saved = await ask(alice, 'chat:message', { room: 'd1', text: 'hello' });
  assert.equal(saved.ok, false);
});

test('POST /login returns a token that the socket accepts in place of a name', async () => {
  const url = await start();
  const { token, username } = await login(url, 'carol');
  assert.equal(username, 'carol');
  const socket = open(url, { token });
  const welcome = await ready(socket);
  assert.equal(welcome.username, 'carol');
});

test('the name inside the token wins over a name sent next to it', async () => {
  const url = await start();
  const { token } = await login(url, 'carol');
  const welcome = await ready(open(url, { token, username: 'admin' }));
  assert.equal(welcome.username, 'carol');
});

test('POST /login rejects a missing or invalid name with 400', async () => {
  const url = await start();
  for (const username of [undefined, '', '   ', 'bad name!', 'x'.repeat(25), 5]) {
    const res = await fetch(`${url}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
    assert.equal(res.status, 400, String(username));
  }
});

test('with requireToken a socket without a token is refused, a socket with one is accepted', async () => {
  const url = await start({ requireToken: true });
  await assert.rejects(ready(open(url, { username: 'alice' })), /token is required/);
  const { token } = await login(url, 'alice');
  assert.equal((await ready(open(url, { token }))).username, 'alice');
});

test('tokens: a valid one verifies, a tampered, foreign-secret or expired one does not', () => {
  const token = issueToken('dave', SECRET);
  assert.equal(verifyToken(token, SECRET), 'dave');
  assert.equal(verifyToken(token, 'another-secret'), null);
  assert.equal(verifyToken(`${token}x`, SECRET), null);
  const [body, sig] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ sub: 'admin', exp: 9999999999 })).toString('base64url');
  assert.equal(verifyToken(`${forged}.${sig}`, SECRET), null);
  assert.equal(verifyToken(body, SECRET), null);
  const old = issueToken('dave', SECRET, { ttlSeconds: 10, now: () => 0 });
  assert.equal(verifyToken(old, SECRET, { now: () => 5000 }), 'dave');
  assert.equal(verifyToken(old, SECRET, { now: () => 11000 }), null);
  assert.equal(verifyToken(undefined, SECRET), null);
});
