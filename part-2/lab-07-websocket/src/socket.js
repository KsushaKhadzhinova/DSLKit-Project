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

// The state shared by every connection. `rooms` maps a diagram room to the users inside it,
// so the "who is editing" list needs no extra queries.
const createHub = (io, opts) => {
  // `history` can be injected (for example the MongoDB one); the default keeps messages in memory.
  const history = opts.history ?? createHistory(opts.historyLimit, opts.historyMaxRooms);
  const rooms = new Map();
  const online = new Map(); // socket id -> { id, username }
  const perAddress = new Map(); // client address -> number of open sockets
  let messageSeq = 0;
  const usersOf = (room) => [...(rooms.get(room)?.values() ?? [])];
  const onlineList = () => [...online.values()];
  return {
    io,
    opts,
    history,
    rooms,
    online,
    usersOf,
    onlineList,
    publishPresence: (room) => io.to(room).emit('presence:update', { room, users: usersOf(room) }),
    makeMessage: (user, text, extra) => ({ id: ++messageSeq, from: user.username, fromId: user.id, text, at: Date.now(), ...extra }),
    perAddress,
    isTaken: (username) => onlineList().some((u) => u.username.toLowerCase() === username.toLowerCase()),
  };
};

// Handshake: the name comes from a signed login token (`auth.token`, issued by POST /login) or, when
// tokens are not required, from `auth.username`. Every later event knows who sent it.
const createHandshake = (hub) => (socket, next) => {
  const { opts } = hub;
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
  if (hub.isTaken(username)) return next(new Error('This username is already taken'));
  if (hub.online.size >= opts.maxUsers) return next(new Error('The server is full, try again later'));
  // One client cannot take all the places of the server.
  if ((hub.perAddress.get(socket.handshake.address) ?? 0) >= opts.maxPerAddress) return next(new Error('Too many connections from your address'));
  socket.data.username = username;
  next();
};

// Room membership and presence of one connected socket. `conn` holds what belongs to this socket only.
const createRoomActions = (hub, conn) => {
  const { io, opts, history, rooms } = hub;
  const { socket, user, joined } = conn;

  const leave = (room) => {
    joined.delete(room);
    socket.leave(room);
    rooms.get(room)?.delete(socket.id);
    if (rooms.get(room)?.size === 0) rooms.delete(room);
    io.to(room).emit('room:left', { room, username: user.username, at: Date.now() });
    io.to(room).emit('typing', { room, username: user.username, typing: false });
    hub.publishPresence(room);
  };

  const join = async (payload, ack) => {
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
    hub.publishPresence(room);
    succeed(ack, { room, history: past, users: hub.usersOf(room) });
  };

  const leaveRoom = (payload, ack) => {
    const room = cleanRoom(payload?.room);
    if (!room || !joined.has(room)) return fail(ack, 'Not in this room');
    leave(room);
    succeed(ack, { room });
  };

  // "Who is editing": a user marks the diagram of a room as being edited right now.
  const editing = (payload, ack) => {
    const room = cleanRoom(payload?.room);
    if (!room || !joined.has(room)) return fail(ack, 'Join the room first');
    user.editing = Boolean(payload.editing);
    hub.publishPresence(room);
    succeed(ack, { editing: user.editing });
  };

  const typing = (payload) => {
    const room = cleanRoom(payload?.room);
    if (room && joined.has(room)) socket.to(room).emit('typing', { room, username: user.username, typing: Boolean(payload.typing) });
  };

  return { leave, join, leaveRoom, editing, typing };
};

// Chat messages: to a room and private.
const createMessageActions = (hub, conn) => {
  const { io, history } = hub;
  const { socket, user, joined, allowed } = conn;

  const toRoom = async (payload, ack) => {
    const room = cleanRoom(payload?.room);
    const text = cleanText(payload?.text);
    if (!room || !joined.has(room)) return fail(ack, 'Join the room first');
    if (!text) return fail(ack, `Message must be 1-${limits.textMaxLength} characters`);
    if (!allowed()) return fail(ack, 'Too many messages, slow down');
    const message = hub.makeMessage(user, text, { room });
    try {
      await history.add(room, message);
    } catch (error) {
      console.error('message was not saved:', error.message);
      return fail(ack, 'The message could not be saved, try again later');
    }
    io.to(room).emit('chat:message', message);
    succeed(ack, { id: message.id });
  };

  // Private message by socket id, delivered only to the target and echoed to the sender.
  // The sender is always taken from the connection, never from the payload.
  const toUser = (payload, ack) => {
    const text = cleanText(payload?.text);
    const target = typeof payload?.to === 'string' ? io.sockets.sockets.get(payload.to) : undefined;
    if (!target) return fail(ack, 'User not found');
    if (target.id === socket.id) return fail(ack, 'You cannot send a private message to yourself');
    if (!text) return fail(ack, `Message must be 1-${limits.textMaxLength} characters`);
    if (!allowed()) return fail(ack, 'Too many messages, slow down');
    const message = hub.makeMessage(user, text, { to: target.id, toName: target.data.username });
    target.emit('private:message', message);
    succeed(ack, { message });
  };

  return { toRoom, toUser };
};

const handleConnection = (hub, socket) => {
  const { opts } = hub;
  const user = { id: socket.id, username: socket.data.username, editing: false };
  const conn = { socket, user, joined: new Set(), allowed: createLimiter(opts.rateMax, opts.rateWindowMs) };
  const eventAllowed = createLimiter(opts.eventRateMax, opts.eventRateWindowMs);
  hub.online.set(socket.id, { id: user.id, username: user.username });
  const address = socket.handshake.address;
  hub.perAddress.set(address, (hub.perAddress.get(address) ?? 0) + 1);

  // Flood guard for every event (join, typing, editing...); chat messages have their own, stricter limit.
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

  socket.emit('welcome', { id: user.id, username: user.username, online: hub.onlineList() });
  socket.broadcast.emit('user:online', { id: user.id, username: user.username, at: Date.now() });

  const roomActions = createRoomActions(hub, conn);
  const messageActions = createMessageActions(hub, conn);
  on('room:join', roomActions.join);
  on('room:leave', roomActions.leaveRoom);
  on('chat:message', messageActions.toRoom);
  on('private:message', messageActions.toUser);
  on('typing', roomActions.typing);
  on('editing', roomActions.editing);

  // Cleanup: leave every room, forget the user and tell the others. Nothing is kept per socket afterwards.
  socket.on('disconnect', () => {
    [...conn.joined].forEach(roomActions.leave);
    hub.online.delete(socket.id);
    const left = (hub.perAddress.get(address) ?? 1) - 1;
    if (left > 0) hub.perAddress.set(address, left);
    else hub.perAddress.delete(address);
    socket.broadcast.emit('user:offline', { id: user.id, username: user.username, at: Date.now() });
  });
};

// Wires all Socket.IO events.
const attachSocket = (io, overrides = {}) => {
  const hub = createHub(io, { ...limits, ...overrides });
  io.use(createHandshake(hub));
  io.on('connection', (socket) => handleConnection(hub, socket));
};

module.exports = { attachSocket };
