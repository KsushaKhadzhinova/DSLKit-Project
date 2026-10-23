// A client that cannot keep up has a long queue of packets waiting in its connection (writeBuffer).
// Events nobody must wait for, like the "is typing" mark, are not sent to such a client and are dropped when a client is not ready (volatile),
// so one slow connection does not make the server pile up data. Chat messages and presence stay reliable.
const isSlow = (socket, max) => (socket.conn?.writeBuffer?.length ?? 0) > max;

// Sends a light event to everybody in a room except one socket and returns how many clients were skipped as slow.
const emitLight = (io, room, exceptId, event, payload, max) => {
  let skipped = 0;
  for (const id of io.sockets.adapter.rooms.get(room) ?? []) {
    const peer = id === exceptId ? undefined : io.sockets.sockets.get(id);
    if (!peer) continue;
    if (isSlow(peer, max)) skipped += 1;
    else peer.volatile.emit(event, payload);
  }
  return skipped;
};

module.exports = { isSlow, emitLight };
