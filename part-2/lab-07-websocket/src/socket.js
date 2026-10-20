const { cleanName, cleanRoom, cleanText, limits } = require('./validate');
const { createHistory } = require('./history');
const { createLimiter } = require('./rate-limit');
const { verifyToken } = require('./token');

const fail = (ack, error) => {
  if (typeof ack === 'function') ack({ ok: false, error });
};
const succeed = (ack, data = {}) => {
  if (typeof ack === 'function') ack({ ok: true, ...data });
};

// Wires all Socket.IO events. `rooms` maps a diagram room to the users inside it,
// so the "who is editing" list needs no extra queries.
const attachSocket = (io, overrides = {}) => {
  const opts = { ...limits, ...overrides };
  // `history` can be injected (for example the MongoDB one); the default keeps messages in memory.
  const history = opts.history ?? createHistory(opts.historyLimit, opts.historyMaxRooms);
  const rooms = new Map();
  const online = new Map(); // socket id -> { id, username }
  let messageSeq = 0;

  const usersOf = (room) => [...(rooms.get(room)?.values() ?? [])];
  const onlineList = () => [...online.values()];
  const publishPresence = (room) => io.to(room).emit('presence:update', { room, users: usersOf(room) });
  const makeMessage = (user, text, extra) => ({ id: ++messageSeq, from: user.username, fromId: user.id, text, at: Date.now(), ...extra });
  const isTaken = (username) => onlineList().some((u) => u.username.toLowerCase() === username.toLowerCase());

  // Handshake: the name comes from a signed login token (`auth.token`, issued by POST /login) or, when
  // tokens are not required, from `auth.username`. Every later event knows who sent it.
  io.use((socket, next) => {
    const { token, username: plain } = socket.handshake.auth ?? {};
    let given = plain;
    if (token !== undefined) {
      given = verifyToken(token, opts.tokenSecret);
      if (!given) return next(new Error('Invalid or expired token, log in again'));
    } else if (opts.requireToken) {
      return next(new Error('A login token is required'));
    }
    const username = cleanName(given);
    if (!username) return next(new Error(`A username of 1-${limits.nameMaxLength} letters, digits, dots, dashes or underscores is required`));
    if (isTaken(username)) return next(new Error('This username is already taken'));
    if (online.size >= opts.maxUsers) return next(new Error('The server is full, try again later'));
    socket.data.username = username;
    next();
  });

  io.on('connection', (socket) => {
    const user = { id: socket.id, username: socket.data.username, editing: false };
    const joined = new Set();
    const allowed = createLimiter(opts.rateMax, opts.rateWindowMs);
    const eventAllowed = createLimiter(opts.eventRateMax, opts.eventRateWindowMs);
    online.set(socket.id, { id: user.id, username: user.username });

    // Flood guard for every event (join, typing, editing...); chat messages have their own, stricter limit below.
    socket.use((packet, next) => {
      if (eventAllowed()) return next();
      fail(packet.at(-1), 'Too many requests, slow down');
    });

    // Handlers of one socket run one after another, so a leave sent right after a join waits for the history.
    let tail = Promise.resolve();
    const on = (event, handler) =>
      socket.on(event, (...args) => {
        tail = tail.then(() => handler(...args)).catch((error) => console.error(event, error.message));
      });

    socket.emit('welcome', { id: user.id, username: user.username, online: onlineList() });
    socket.broadcast.emit('user:online', { id: user.id, username: user.username, at: Date.now() });

    const leave = (room) => {
      joined.delete(room);
      socket.leave(room);
      rooms.get(room)?.delete(socket.id);
      if (rooms.get(room)?.size === 0) rooms.delete(room);
      io.to(room).emit('room:left', { room, username: user.username, at: Date.now() });
      io.to(room).emit('typing', { room, username: user.username, typing: false });
      publishPresence(room);
    };

    on('room:join', async (payload, ack) => {
      const room = cleanRoom(payload?.room);
      if (!room) return fail(ack, 'Invalid room name');
      if (joined.has(room)) return fail(ack, 'Already in this room');
      if (joined.size >= opts.maxRoomsPerUser) return fail(ack, `You can be in at most ${opts.maxRoomsPerUser} rooms`);
      if ((rooms.get(room)?.size ?? 0) >= opts.maxRoomMembers) return fail(ack, 'This room is full');
      let past;
      try {
        past = await history.list(room);
      } catch (error) {
        console.error('history unavailable:', error.message);
        return fail(ack, 'History is unavailable, try again later');
      }
      if (joined.has(room) || !socket.connected) return fail(ack, 'Already in this room');
      joined.add(room);
      socket.join(room);
      if (!rooms.has(room)) rooms.set(room, new Map());
      rooms.get(room).set(socket.id, user);
      socket.to(room).emit('room:joined', { room, username: user.username, at: Date.now() });
      publishPresence(room);
      succeed(ack, { room, history: past, users: usersOf(room) });
    });

    on('room:leave', (payload, ack) => {
      const room = cleanRoom(payload?.room);
      if (!room || !joined.has(room)) return fail(ack, 'Not in this room');
      leave(room);
      succeed(ack, { room });
    });

    on('chat:message', async (payload, ack) => {
      const room = cleanRoom(payload?.room);
      const text = cleanText(payload?.text);
      if (!room || !joined.has(room)) return fail(ack, 'Join the room first');
      if (!text) return fail(ack, `Message must be 1-${limits.textMaxLength} characters`);
      if (!allowed()) return fail(ack, 'Too many messages, slow down');
      const message = makeMessage(user, text, { room });
      try {
        await history.add(room, message);
      } catch (error) {
        console.error('message was not saved:', error.message);
        return fail(ack, 'The message could not be saved, try again later');
      }
      io.to(room).emit('chat:message', message);
      succeed(ack, { id: message.id });
    });

    // Private message by socket id, delivered only to the target and echoed to the sender.
    // The sender is always taken from the connection, never from the payload.
    on('private:message', (payload, ack) => {
      const text = cleanText(payload?.text);
      const target = typeof payload?.to === 'string' ? io.sockets.sockets.get(payload.to) : undefined;
      if (!target) return fail(ack, 'User not found');
      if (target.id === socket.id) return fail(ack, 'You cannot send a private message to yourself');
      if (!text) return fail(ack, `Message must be 1-${limits.textMaxLength} characters`);
      if (!allowed()) return fail(ack, 'Too many messages, slow down');
      const message = makeMessage(user, text, { to: target.id, toName: target.data.username });
      target.emit('private:message', message);
      succeed(ack, { message });
    });

    on('typing', (payload) => {
      const room = cleanRoom(payload?.room);
      if (room && joined.has(room)) socket.to(room).emit('typing', { room, username: user.username, typing: Boolean(payload.typing) });
    });

    // "Who is editing": a user marks the diagram of a room as being edited right now.
    on('editing', (payload, ack) => {
      const room = cleanRoom(payload?.room);
      if (!room || !joined.has(room)) return fail(ack, 'Join the room first');
      user.editing = Boolean(payload.editing);
      publishPresence(room);
      succeed(ack, { editing: user.editing });
    });

    // Cleanup: leave every room, forget the user and tell the others. Nothing is kept per socket afterwards.
    socket.on('disconnect', () => {
      [...joined].forEach(leave);
      online.delete(socket.id);
      socket.broadcast.emit('user:offline', { id: user.id, username: user.username, at: Date.now() });
    });
  });
};

module.exports = { attachSocket };
