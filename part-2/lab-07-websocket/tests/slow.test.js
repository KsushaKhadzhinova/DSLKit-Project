const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isSlow, emitLight } = require('../src/slow-clients');

const fakeSocket = (queued) => {
  const sent = [];
  return { conn: { writeBuffer: new Array(queued).fill('packet') }, volatile: { emit: (event, payload) => sent.push([event, payload]) }, sent };
};

const fakeIo = (members) => ({
  sockets: { adapter: { rooms: new Map([['room', new Set(Object.keys(members))]]) }, sockets: new Map(Object.entries(members)) },
});

test('a client is slow when more than the allowed packets wait in its connection', () => {
  assert.equal(isSlow(fakeSocket(5), 20), false);
  assert.equal(isSlow(fakeSocket(20), 20), false);
  assert.equal(isSlow(fakeSocket(21), 20), true);
  assert.equal(isSlow({}, 20), false);
  assert.equal(isSlow({ conn: {} }, 20), false);
});

test('a light event reaches fast clients as a volatile packet, skips the sender and counts the slow ones', () => {
  const members = { me: fakeSocket(0), fast: fakeSocket(3), slow: fakeSocket(50) };
  const skipped = emitLight(fakeIo(members), 'room', 'me', 'typing', { typing: true }, 20);
  assert.equal(skipped, 1);
  assert.deepEqual(members.fast.sent, [['typing', { typing: true }]]);
  assert.deepEqual(members.slow.sent, []);
  assert.deepEqual(members.me.sent, []);
});

test('a room that does not exist and a socket that left are ignored', () => {
  const io = fakeIo({ gone: fakeSocket(0) });
  io.sockets.sockets.delete('gone');
  assert.equal(emitLight(io, 'room', 'me', 'typing', {}, 20), 0);
  assert.equal(emitLight(io, 'nowhere', 'me', 'typing', {}, 20), 0);
});
