// Checks added after the review: message ids from the store, history indexes and TTL, editing per room,
// the TRUST_PROXY address and the production secret rule.
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { io: connect } = require('socket.io-client');
const { ObjectId } = require('mongodb');
const { createServer } = require('../src/app');
const { createMongoHistory } = require('../src/history');

let clients = [];
let servers = [];
afterEach(() => {
  clients.forEach((c) => c.close());
  servers.forEach((s) => s.io.close());
  clients = [];
  servers = [];
});

const listen = async (options) => {
  const s = createServer(options);
  await new Promise((resolve) => s.httpServer.listen(0, resolve));
  servers.push(s);
  return `http://localhost:${s.httpServer.address().port}`;
};
const join = (url, username, extraHeaders) =>
  new Promise((resolve, reject) => {
    const socket = connect(url, { auth: { username }, forceNew: true, reconnection: false, transports: ['websocket'], extraHeaders });
    clients.push(socket);
    socket.on('connect_error', reject);
    socket.on('welcome', () => resolve(socket));
  });
const ask = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

// A stand-in for a MongoDB collection that also records the indexes it was asked to build.
const fakeCollection = () => {
  const docs = [];
  const indexes = [];
  const key = (id) => (typeof id === 'object' ? id.toHexString() : String(id));
  return {
    docs,
    indexes,
    createIndex: async (spec, options) => void indexes.push({ spec, options }),
    insertOne: async (doc) => void docs.push({ _id: new ObjectId(), ...doc }),
    find: (filter) => {
      let rows = docs.filter((d) => d.room === filter.room);
      const cursor = {
        sort: () => ((rows = [...rows].sort((a, b) => (key(b._id) < key(a._id) ? -1 : 1))), cursor),
        limit: (n) => ((rows = rows.slice(0, n)), cursor),
        toArray: async () => rows,
      };
      return cursor;
    },
  };
};

test('the Mongo history builds the room and newest index, and the TTL index only when asked', async () => {
  const plain = fakeCollection();
  await createMongoHistory(plain, 50, { ObjectId }).init();
  assert.deepEqual(plain.indexes, [{ spec: { room: 1, _id: -1 }, options: undefined }]);

  const withTtl = fakeCollection();
  await createMongoHistory(withTtl, 50, { ObjectId, ttlSeconds: 3600 }).init();
  assert.deepEqual(withTtl.indexes[1], { spec: { createdAt: 1 }, options: { expireAfterSeconds: 3600 } });

  // A collection without createIndex (a minimal stand-in) is fine too.
  await createMongoHistory({}).init();
});

test('message ids come from the store, are the document _id and do not repeat after a restart', async () => {
  const collection = fakeCollection();
  const ids = [];
  for (const name of ['first', 'second']) {
    // Each pass is a fresh server and a fresh history object over the same collection: a restart.
    const url = await listen({ tokenSecret: 'test-secret', history: createMongoHistory(collection, 50, { ObjectId }) });
    const socket = await join(url, name);
    await ask(socket, 'room:join', { room: 'd1' });
    for (let i = 0; i < 3; i += 1) ids.push((await ask(socket, 'chat:message', { room: 'd1', text: `${name} ${i}` })).id);
  }
  assert.equal(new Set(ids).size, 6);
  assert.deepEqual(
    collection.docs.map((d) => d._id.toHexString()),
    ids,
  );
  assert.ok(collection.docs.every((d) => d.createdAt instanceof Date));

  const url = await listen({ tokenSecret: 'test-secret', history: createMongoHistory(collection, 50, { ObjectId }) });
  const reader = await join(url, 'reader');
  const { history } = await ask(reader, 'room:join', { room: 'd1' });
  assert.deepEqual(
    history.map((m) => m.id),
    ids,
  );
  assert.equal(history[0].createdAt, undefined);
  assert.equal(history[0]._id, undefined);
});

test('the editing flag belongs to one room: editing in one room does not mark the user in another', async () => {
  const url = await listen({});
  const alice = await join(url, 'alice');
  const bob = await join(url, 'bob');
  await ask(alice, 'room:join', { room: 'a' });
  await ask(alice, 'room:join', { room: 'b' });
  const seen = {};
  bob.on('presence:update', (p) => (seen[p.room] = p.users));
  await ask(bob, 'room:join', { room: 'a' });
  await ask(bob, 'room:join', { room: 'b' });
  assert.deepEqual(await ask(alice, 'editing', { room: 'a', editing: true }), { ok: true, editing: true });
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(seen.a.find((u) => u.username === 'alice').editing, true);
  assert.equal(seen.b.find((u) => u.username === 'alice').editing, false);

  // Leaving and joining again starts without the flag.
  await ask(alice, 'room:leave', { room: 'a' });
  await ask(alice, 'room:join', { room: 'a' });
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(seen.a.find((u) => u.username === 'alice').editing, false);
});

test('maxPerAddress counts the socket address by default and the X-Forwarded-For address with trustProxy', async () => {
  const direct = await listen({ maxPerAddress: 1 });
  await join(direct, 'one', { 'X-Forwarded-For': '10.0.0.1' });
  await assert.rejects(join(direct, 'two', { 'X-Forwarded-For': '10.0.0.2' }), /Too many connections/);

  const proxied = await listen({ maxPerAddress: 1, trustProxy: true });
  await join(proxied, 'one', { 'X-Forwarded-For': 'spoofed, 10.0.0.1' });
  await join(proxied, 'two', { 'X-Forwarded-For': 'spoofed, 10.0.0.2' });
  await assert.rejects(join(proxied, 'three', { 'X-Forwarded-For': 'other, 10.0.0.1' }), /Too many connections/);
  // Without the header the socket address is used.
  await join(proxied, 'four');
});

test('POST /login gives a token to any valid free name without a password, and a production server refuses the public secret', async () => {
  const url = await listen({ tokenSecret: 'test-secret' });
  const reply = await fetch(`${url}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'anyone' }) });
  assert.equal(reply.status, 200);
  assert.equal((await reply.json()).username, 'anyone');

  const saved = { env: process.env.NODE_ENV, secret: process.env.TOKEN_SECRET };
  process.env.NODE_ENV = 'production';
  delete process.env.TOKEN_SECRET;
  try {
    assert.throws(() => createServer(), /TOKEN_SECRET is required/);
    assert.throws(() => createServer({ tokenSecret: 'local-development-secret-do-not-use-in-production' }), /TOKEN_SECRET is required/);
  } finally {
    process.env.NODE_ENV = saved.env;
    if (saved.secret !== undefined) process.env.TOKEN_SECRET = saved.secret;
  }
});
