const { cleanName, cleanRoom, cleanText } = require('./validate');
const { createHistory } = require('./history');
const { createLimiter } = require('./rate-limit');

const fail = (ack, error) => {
  if (typeof ack === 'function') ack({ ok: false, error });
};
const succeed = (ack, data = {}) => {
  if (typeof ack === 'function') ack({ ok: true, ...data });
};

// Wires all Socket.IO events. `rooms` maps a diagram room to the users inside it,
// so the "who is editing" list needs no extra queries.
const attachSocket = (io, { historyLimit = 50, rateMax = 5, rateWindowMs = 2000 } = {}) => {
  const history = createHistory(historyLimit);
  const rooms = new Map();
  const online = new Map();
  let messageSeq = 0;

  const usersOf = (room) => [...(rooms.get(room)?.values() ?? [])];
  const publishPresence = (room) => io.to(room).emit('presence:update', { room, users: usersOf(room) });
  const makeMessage = (user, text, extra) => ({ id: ++messageSeq, from: user.username, fromId: user.id, text, at: Date.now(), ...extra });

  // Handshake: the username travels in `auth`, so every later event knows who sent it.
  io.use((socket, next) => {
    const username = cleanName(socket.handshake.auth?.username);
    if (!username) return next(new Error('A username of 1-24 letters, digits, dots, dashes or underscores is required'));
    if ([...online.values()].includes(username)) return next(new Error('This username is already taken'));
    socket.data.username = username;
    next();
  });

  io.on('connection', (socket) => {
    const user = { id: socket.id, username: socket.data.username, editing: false };
    const joined = new Set();
    const allowed = createLimiter(rateMax, rateWindowMs);
    online.set(socket.id, user.username);

    socket.emit('welcome', { id: user.id, username: user.username, online: [...online.values()] });
    socket.broadcast.emit('user:online', { username: user.username, at: Date.now() });

    const leave = (room) => {
      joined.delete(room);
      socket.leave(room);
      rooms.get(room)?.delete(socket.id);
      if (rooms.get(room)?.size === 0) rooms.delete(room);
      io.to(room).emit('room:left', { room, username: user.username, at: Date.now() });
      publishPresence(room);
    };

    socket.on('room:join', (payload, ack) => {
      const room = cleanRoom(payload?.room);
      if (!room) return fail(ack, 'Invalid room name');
      if (joined.has(room)) return fail(ack, 'Already in this room');
      joined.add(room);
      socket.join(room);
      if (!rooms.has(room)) rooms.set(room, new Map());
      rooms.get(room).set(socket.id, user);
      socket.to(room).emit('room:joined', { room, username: user.username, at: Date.now() });
      publishPresence(room);
      succeed(ack, { room, history: history.list(room), users: usersOf(room) });
    });

    socket.on('room:leave', (payload, ack) => {
      const room = cleanRoom(payload?.room);
      if (!room || !joined.has(room)) return fail(ack, 'Not in this room');
      leave(room);
      succeed(ack, { room });
    });

    socket.on('chat:message', (payload, ack) => {
      const room = cleanRoom(payload?.room);
      const text = cleanText(payload?.text);
      if (!room || !joined.has(room)) return fail(ack, 'Join the room first');
      if (!text) return fail(ack, 'Message must be 1-500 characters');
      if (!allowed()) return fail(ack, 'Too many messages, slow down');
      const message = makeMessage(user, text, { room });
      history.add(room, message);
      io.to(room).emit('chat:message', message);
      succeed(ack, { id: message.id });
    });

    // Private message by socket id, delivered only to the target and echoed to the sender.
    socket.on('private:message', (payload, ack) => {
      const text = cleanText(payload?.text);
      const target = typeof payload?.to === 'string' ? io.sockets.sockets.get(payload.to) : undefined;
      if (!target) return fail(ack, 'User not found');
      if (!text) return fail(ack, 'Message must be 1-500 characters');
      if (!allowed()) return fail(ack, 'Too many messages, slow down');
      const message = makeMessage(user, text, { to: target.id, toName: target.data.username });
      target.emit('private:message', message);
      succeed(ack, { message });
    });

    socket.on('typing', (payload) => {
      const room = cleanRoom(payload?.room);
      if (room && joined.has(room)) socket.to(room).emit('typing', { room, username: user.username, typing: Boolean(payload.typing) });
    });

    // "Who is editing": a user marks the diagram of a room as being edited right now.
    socket.on('editing', (payload, ack) => {
      const room = cleanRoom(payload?.room);
      if (!room || !joined.has(room)) return fail(ack, 'Join the room first');
      user.editing = Boolean(payload.editing);
      publishPresence(room);
      succeed(ack, { editing: user.editing });
    });

    socket.on('disconnect', () => {
      [...joined].forEach(leave);
      online.delete(socket.id);
      socket.broadcast.emit('user:offline', { username: user.username, at: Date.now() });
    });
  });
};

module.exports = { attachSocket };
