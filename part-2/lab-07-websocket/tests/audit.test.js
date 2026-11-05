// Security, limits and cleanup checks added after the audit of the server and the client.
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { io: connect } = require('socket.io-client');
const { createServer } = require('../src/app');
const { createHistory } = require('../src/history');
const { cleanText } = require('../src/validate');
const { isOriginAllowed, parseAllowed } = require('../src/origin');

let server;
let url;
let clients;
let extra;

const listen = async (options) => {
  const s = createServer(options);
  await new Promise((resolve) => s.httpServer.listen(0, resolve));
  extra.push(s);
  return { server: s, url: `http://localhost:${s.httpServer.address().port}` };
};

beforeEach(async () => {
  clients = [];
  extra = [];
  ({ server, url } = await listen({ historyLimit: 3, rateMax: 3, rateWindowMs: 60_000 }));
});

afterEach(() => {
  clients.forEach((c) => c.close());
  extra.forEach((s) => s.io.close());
});

const open = (name, base = url, options = {}) => {
  const socket = connect(base, { forceNew: true, reconnection: false, transports: ['websocket'], auth: { username: name }, ...options });
  clients.push(socket);
  return socket;
};
const join = (name, base) =>
  new Promise((resolve, reject) => {
    const socket = open(name, base);
    socket.on('connect_error', reject);
    socket.on('welcome', (info) => resolve({ socket, info }));
  });
const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const ask = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const get = (p, base = url, headers = {}) => fetch(`${base}${p}`, { headers });

test('security headers are set and the framework name is hidden', async () => {
  const res = await get('/');
  assert.match(res.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('unknown addresses get the styled 404 page and broken ones do not leak details', async () => {
  const missing = await get('/nope');
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /Page not found/);
  const broken = await get('/%E0%A4%A');
  assert.equal(broken.status, 404);
  assert.doesNotMatch(await broken.text(), /URIError|node_modules/);
});

test('a real failure shows the styled 500 page without the error text', async () => {
  const { url: base } = await listen({
    setup: (app) =>
      app.get('/boom', () => {
        throw new Error('secret database path C:/data');
      }),
  });
  const res = await get('/boom', base);
  const body = await res.text();
  assert.equal(res.status, 500);
  assert.match(body, /Something went wrong/);
  assert.doesNotMatch(body, /secret database/);
});

test('the handshake from a foreign Origin is refused, the same origin and clients without Origin are accepted', async () => {
  let n = 0;
  const attempt = (headers) =>
    new Promise((resolve) => {
      const socket = open(`user${(n += 1)}`, url, { extraHeaders: headers });
      socket.on('connect', () => resolve(true));
      socket.on('connect_error', () => resolve(false));
    });
  assert.equal(await attempt({ Origin: 'http://evil.example' }), false);
  assert.equal(await attempt({ Origin: url }), true);
  assert.equal(await attempt({}), true);
});

test('extra origins from the allow list get CORS headers, other sites are refused, CORS is never a wildcard', async () => {
  const { url: base } = await listen({ allowedOrigins: ['http://app.example'] });
  const poll = '/socket.io/?EIO=4&transport=polling';
  const ok = await get(poll, base, { Origin: 'http://app.example' });
  const bad = await get(poll, base, { Origin: 'http://evil.example' });
  const plain = await get(poll);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://app.example');
  assert.equal(bad.status, 403);
  assert.equal(plain.headers.get('access-control-allow-origin'), null);
});

test('origin helper handles a missing, malformed and listed origin', () => {
  assert.equal(isOriginAllowed(undefined, 'a:1'), true);
  assert.equal(isOriginAllowed('not a url', 'a:1'), false);
  assert.equal(isOriginAllowed('http://a:1', 'a:1'), true);
  assert.equal(isOriginAllowed('http://b', 'a:1', ['http://b']), true);
  assert.deepEqual(parseAllowed(' http://a , ,http://b'), ['http://a', 'http://b']);
  assert.deepEqual(parseAllowed(undefined), []);
});

test('the client never parses text as HTML', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'client.js'), 'utf8');
  assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/);
});

test('messages are stored as plain text and invisible control characters are removed', async () => {
  const { socket } = await join('alice');
  await ask(socket, 'room:join', { room: 'd1' });
  const received = once(socket, 'chat:message');
  await ask(socket, 'chat:message', { room: 'd1', text: '<img src=x onerror=alert(1)>\u202e\u0000\u0007hi' });
  assert.equal((await received).text, '<img src=x onerror=alert(1)>hi');
  await assert.rejects(join('<script>'), /username/);
  assert.equal(cleanText('\u0000\u202e  '), null);
  assert.equal(cleanText('line one\nline two'), 'line one\nline two');
  assert.equal(cleanText('x'.repeat(100_000)), null);
});

test('usernames are unique regardless of letter case', async () => {
  await join('Alice');
  await assert.rejects(join('alice'), /already taken/);
});

test('room names are case-insensitive and normalised', async () => {
  const { socket: a } = await join('alice');
  const { socket: b } = await join('bob');
  assert.equal((await ask(a, 'room:join', { room: 'Diagram-1' })).room, 'diagram-1');
  const received = once(a, 'chat:message');
  await ask(b, 'room:join', { room: 'DIAGRAM-1' });
  await ask(b, 'chat:message', { room: 'diagram-1', text: 'same room' });
  assert.equal((await received).text, 'same room');
});

test('payloads that are not objects are answered with an error and do not crash the server', async () => {
  const { socket } = await join('alice');
  for (const payload of [null, undefined, 5, 'text', true, [], [1, 2]]) {
    for (const event of ['room:join', 'room:leave', 'chat:message', 'private:message', 'editing']) {
      const reply = await ask(socket, event, payload);
      assert.equal(reply.ok, false, `${event} with ${JSON.stringify(payload)}`);
    }
  }
  const odd = await ask(socket, 'chat:message', { room: ['d1'], text: { length: 3 } });
  assert.equal(odd.ok, false);
  socket.emit('typing', 'oops');
  socket.emit('unknown:event', { a: 1 });
  assert.equal((await ask(socket, 'room:join', { room: 'd1' })).ok, true);
});

test('an oversized packet closes only that connection', async () => {
  const { socket: big } = await join('big');
  const { socket: other } = await join('other');
  const closed = once(big, 'disconnect');
  big.emit('chat:message', { room: 'd1', text: 'x'.repeat(50_000) });
  await closed;
  assert.equal(big.connected, false);
  assert.equal(other.connected, true);
  assert.equal((await ask(other, 'room:join', { room: 'd1' })).ok, true);
});

test('a private message to yourself is refused and the sender cannot be forged', async () => {
  const { socket: alice, info } = await join('alice');
  const { socket: bob, info: bobInfo } = await join('bob');
  assert.equal((await ask(alice, 'private:message', { to: info.id, text: 'me' })).error, 'You cannot send a private message to yourself');
  const received = once(bob, 'private:message');
  await ask(alice, 'private:message', { to: bobInfo.id, text: 'hi', from: 'admin', fromId: 'x', username: 'admin' });
  const message = await received;
  assert.equal(message.from, 'alice');
  assert.equal(message.fromId, info.id);
  const room = await ask(alice, 'room:join', { room: 'd1', username: 'admin' });
  assert.deepEqual(
    room.users.map((u) => u.username),
    ['alice'],
  );
});

test('every event type is rate limited, not only messages', async () => {
  const { url: base } = await listen({ eventRateMax: 4, eventRateWindowMs: 60_000 });
  const { socket } = await join('spam', base);
  const results = [];
  for (let i = 0; i < 6; i += 1) results.push(await ask(socket, 'editing', { room: 'none', editing: true }));
  assert.equal(results.filter((r) => r.error === 'Too many requests, slow down').length, 2);
});

test('a user can be in a limited number of rooms and a room has a member limit', async () => {
  const { url: base } = await listen({ maxRoomsPerUser: 2, maxRoomMembers: 2 });
  const { socket: a } = await join('a', base);
  assert.equal((await ask(a, 'room:join', { room: 'r1' })).ok, true);
  assert.equal((await ask(a, 'room:join', { room: 'r2' })).ok, true);
  assert.match((await ask(a, 'room:join', { room: 'r3' })).error, /at most 2 rooms/);
  const { socket: b } = await join('b', base);
  assert.equal((await ask(b, 'room:join', { room: 'r1' })).ok, true);
  const { socket: c } = await join('c', base);
  assert.equal((await ask(c, 'room:join', { room: 'r1' })).error, 'This room is full');
});

test('the server refuses new users when it is full', async () => {
  const { url: base } = await listen({ maxUsers: 1 });
  await join('one', base);
  await assert.rejects(join('two', base), /full/);
});

test('one address cannot take more than its share of connections, and the place is free again after a disconnect', async () => {
  const { url: base } = await listen({ maxPerAddress: 2 });
  const { socket: first } = await join('one', base);
  await join('two', base);
  await assert.rejects(join('three', base), /Too many connections from your address/);
  first.close();
  await new Promise((resolve) => setTimeout(resolve, 100));
  await join('three', base);
});

test('a production server refuses to start with the built-in token secret', () => {
  const saved = { env: process.env.NODE_ENV, secret: process.env.TOKEN_SECRET };
  process.env.NODE_ENV = 'production';
  delete process.env.TOKEN_SECRET;
  try {
    assert.throws(() => createServer(), /TOKEN_SECRET is required/);
    assert.doesNotThrow(() => createServer({ tokenSecret: 'a-real-secret-of-some-length-0123456789' }).io.close());
  } finally {
    process.env.NODE_ENV = saved.env;
    if (saved.secret !== undefined) process.env.TOKEN_SECRET = saved.secret;
  }
});

test('history keeps a limited number of rooms and drops the least recently used one', () => {
  const history = createHistory(5, 2);
  history.add('a', 1);
  history.add('b', 2);
  history.add('a', 3);
  history.add('c', 4);
  assert.deepEqual(history.list('b'), []);
  assert.deepEqual(history.list('a'), [1, 3]);
  assert.deepEqual(history.list('c'), [4]);
});

test('after a disconnect the user is gone from the online list, the room and the typing note', async () => {
  const { socket: alice } = await join('alice');
  const { socket: bob, info: bobInfo } = await join('bob');
  await ask(alice, 'room:join', { room: 'd1' });
  await ask(bob, 'room:join', { room: 'd1' });
  const stopped = new Promise((resolve) => alice.on('typing', (t) => t.typing === false && resolve(t)));
  const offline = once(alice, 'user:offline');
  bob.close();
  assert.equal((await offline).id, bobInfo.id);
  assert.equal((await stopped).username, 'bob');
  const { info } = await join('carol');
  assert.deepEqual(info.online.map((u) => u.username).sort(), ['alice', 'carol']);
  const { socket: dave } = await join('dave');
  const reply = await ask(dave, 'room:join', { room: 'd1' });
  assert.deepEqual(reply.users.map((u) => u.username).sort(), ['alice', 'dave']);
});

test('a client that reconnects can join again and gets the history', async () => {
  const { socket } = await join('alice');
  await ask(socket, 'room:join', { room: 'd1' });
  await ask(socket, 'chat:message', { room: 'd1', text: 'before' });
  socket.close();
  await new Promise((resolve) => setTimeout(resolve, 50));
  const again = await join('alice');
  const reply = await ask(again.socket, 'room:join', { room: 'd1' });
  assert.deepEqual(
    reply.history.map((m) => m.text),
    ['before'],
  );
});

test('the client pages exist and share the Part 1 header, footer, skip link and a single h1', async () => {
  for (const page of ['/', '/404.html', '/500.html', '/dslkit.css', '/logo.svg', '/theme.js']) assert.equal((await get(page)).status, 200, page);
  const html = await (await get('/')).text();
  assert.match(html, /class="header"/);
  assert.match(html, /class="footer"/);
  assert.match(html, /skip-link/);
  assert.equal(html.match(/<h1[ >]/g).length, 1);
  assert.equal(server.httpServer.listening, true);
});
