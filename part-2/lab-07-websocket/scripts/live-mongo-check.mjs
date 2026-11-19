// Live check of the MongoDB history against a real cluster. NOT part of `npm test`.
// Run: node --env-file=<file with MONGODB_URI> scripts/live-mongo-check.mjs   (LIVE_SKIP_TTL=1 skips the TTL wait of 1-3 minutes)
// It only touches collections named lab7_test_* in the database of the URI and drops only those it created.
// The URI is never printed.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

if (!process.env.MONGODB_URI) {
  console.log('SKIP: MONGODB_URI is not set, the live MongoDB check needs a real cluster (see figures-live/README.md).');
  process.exit(0);
}

const { MongoClient, ObjectId } = require('mongodb');
const { io: connect } = require('socket.io-client');
const { createServer } = require('../src/app');
const { createMongoHistory } = require('../src/history');

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const suffix = Date.now().toString(36);
const names = [];
const collName = (tag) => {
  const name = `lab7_test_${tag}_${suffix}`;
  names.push(name);
  return name;
};

const client = await MongoClient.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
const db = client.db();

const boot = async (collection, ttlSeconds = 0) => {
  const history = createMongoHistory(collection, undefined, { ObjectId, ttlSeconds });
  await history.init();
  const server = createServer({ history, rateMax: 50, rateWindowMs: 2000, maxPerAddress: 100 });
  await new Promise((resolve) => server.httpServer.listen(0, resolve));
  const url = `http://localhost:${server.httpServer.address().port}`;
  const stop = async () => {
    server.io.close();
    await new Promise((resolve) => server.httpServer.close(resolve)).catch(() => {});
  };
  return { url, stop };
};
const open = (url, username) =>
  new Promise((resolve, reject) => {
    const socket = connect(url, { auth: { username }, forceNew: true, transports: ['websocket'] });
    socket.on('connect_error', reject);
    socket.on('welcome', () => resolve(socket));
  });
const ask = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

try {
  // Messages in two rooms, a restart, history, ids, index.
  const main = db.collection(collName('main'));
  let srv = await boot(main);
  const alice = await open(srv.url, 'alice');
  const bob = await open(srv.url, 'bob');
  for (const s of [alice, bob]) {
    await ask(s, 'room:join', { room: 'r1' });
    await ask(s, 'room:join', { room: 'r2' });
  }
  const sentR1 = [];
  for (let i = 0; i < 6; i++) {
    const res = await ask(i % 2 ? alice : bob, 'chat:message', { room: 'r1', text: `r1 message ${i}` });
    sentR1.push(res.id);
  }
  await ask(alice, 'chat:message', { room: 'r2', text: 'r2 only' });
  check('messages are acknowledged with ids', sentR1.every((id) => typeof id === 'string' && id.length === 24));
  check('the documents are in the collection', (await main.countDocuments({ room: 'r1' })) === 6 && (await main.countDocuments({ room: 'r2' })) === 1);
  alice.close();
  bob.close();
  await srv.stop();

  srv = await boot(main); // restart: a new server, a new history object, the same collection
  const carol = await open(srv.url, 'carol');
  const joined = await ask(carol, 'room:join', { room: 'r1' });
  check('history survives a server restart in the original order', same(joined.history.map((m) => m.text), [0, 1, 2, 3, 4, 5].map((i) => `r1 message ${i}`)));
  check('rooms do not leak into each other', (await ask(carol, 'room:join', { room: 'r2' })).history.length === 1);
  const after = [];
  for (let i = 6; i < 9; i++) after.push((await ask(carol, 'chat:message', { room: 'r1', text: `r1 message ${i}` })).id);
  const dave = await open(srv.url, 'dave');
  const again = (await ask(dave, 'room:join', { room: 'r1' })).history;
  const ids = again.map((m) => m.id);
  check('ids are unique after the restart', new Set(ids).size === ids.length && !after.some((id) => sentR1.includes(id)));
  check('ids grow in order across the restart', ids.every((id, i) => i === 0 || id > ids[i - 1]) && after[0] > sentR1.at(-1));
  check('history after the restart has the old and the new messages in order', again.length === 9 && again.at(-1).text === 'r1 message 8');
  dave.close();

  const indexes = await main.indexes();
  check('index {room:1,_id:-1} exists in Atlas', indexes.some((ix) => same(ix.key, { room: 1, _id: -1 })));
  check('no TTL index when HISTORY_TTL_SECONDS is not set', !indexes.some((ix) => ix.expireAfterSeconds !== undefined));

  // Concurrent clients in one room.
  const crowd = await Promise.all(Array.from({ length: 10 }, (_, i) => open(srv.url, `crowd${i}`)));
  await Promise.all(crowd.map((s) => ask(s, 'room:join', { room: 'busy' })));
  const acks = await Promise.all(crowd.flatMap((s, n) => Array.from({ length: 5 }, (_, k) => ask(s, 'chat:message', { room: 'busy', text: `c${n}-${k}` }))));
  const stored = await main.find({ room: 'busy' }).toArray();
  check('50 concurrent messages from 10 clients are all saved', acks.every((a) => a.ok) && stored.length === 50);
  check('concurrent ids are unique', new Set(stored.map((d) => String(d._id))).size === 50);
  crowd.forEach((s) => s.close());

  // Reconnection of a client.
  const eve = await open(srv.url, 'eve');
  await ask(eve, 'room:join', { room: 'r1' });
  eve.close();
  await sleep(300);
  const eve2 = await open(srv.url, 'eve');
  const back = await ask(eve2, 'room:join', { room: 'r1' });
  check('a reconnected client gets the history again', back.ok && back.history.length === 9);
  const live = new Promise((resolve) => eve2.once('chat:message', resolve));
  await ask(carol, 'chat:message', { room: 'r1', text: 'after reconnect' });
  check('a reconnected client receives new messages', (await live).text === 'after reconnect');
  [carol, eve2].forEach((s) => s.close());
  await srv.stop();

  // TTL.
  const ttlColl = db.collection(collName('ttl'));
  srv = await boot(ttlColl, 2);
  const ttlIx = (await ttlColl.indexes()).find((ix) => ix.expireAfterSeconds !== undefined);
  check('the TTL index is created with HISTORY_TTL_SECONDS', ttlIx?.expireAfterSeconds === 2 && same(ttlIx.key, { createdAt: 1 }));
  const frank = await open(srv.url, 'frank');
  await ask(frank, 'room:join', { room: 'ttl' });
  await ask(frank, 'chat:message', { room: 'ttl', text: 'short lived' });
  frank.close();
  await srv.stop();
  if (process.env.LIVE_SKIP_TTL === '1') {
    console.log('SKIP  TTL deletion (LIVE_SKIP_TTL=1)');
  } else {
    // The TTL monitor of MongoDB runs about once a minute, so the document disappears within a few minutes.
    const started = Date.now();
    let left = 1;
    while (left > 0 && Date.now() - started < 240_000) {
      await sleep(5000);
      left = await ttlColl.countDocuments({ room: 'ttl' });
    }
    check('an expired message is deleted by MongoDB', left === 0, `${Math.round((Date.now() - started) / 1000)} s`);
  }
} catch (error) {
  check('the run finished without an exception', false, String(error.message).split(process.env.MONGODB_URI).join('<uri>'));
} finally {
  for (const name of names) await db.collection(name).drop().catch(() => {});
  await client.close();
}
const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed; test collections dropped`);
process.exit(failed ? 1 : 0);
