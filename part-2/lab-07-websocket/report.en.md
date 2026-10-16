# Lab 7. Real-Time Communication with WebSocket

## 1 Purpose of the Work

To master the WebSocket technology for two-way real-time communication and the Socket.IO library. The work is done for DSLKit, a web editor for diagrams as code: the server gives each diagram its own room where users exchange messages, get notified when someone joins or leaves, and see who has the diagram open and who is editing it.

## 2 Brief Theory

**Limits of HTTP.** In the request-response model the server cannot send data to the client on its own. To learn about a new message the client has to poll the server, which adds load and delay.

**WebSocket.** A connection starts as an ordinary HTTP request with the `Upgrade: websocket` header. The server answers with status 101, and the same TCP connection stays open: both sides send messages at any moment without new headers.

**Socket.IO.** The library sits on top of WebSocket and adds named events with data, delivery acknowledgements, rooms, automatic reconnection and a long polling fallback when WebSocket is unavailable.

**Broadcasting.** There are three ways to send: `socket.emit` to this client only, `socket.broadcast.emit` to everyone except it, and `io.emit` to everyone connected. The `to(room)` method limits recipients to a room.

## 3 Work Progress

### 3.1 How it works

The client and server interact in these steps.

1. The client opens the page, enters a name and calls `io({ auth: { username } })`. The server checks the name in the `io.use` middleware and either rejects or accepts the connection.
2. After the connection the server sends `welcome` to the client and `user:online` to everyone else.
3. The client sends `room:join` with the diagram room name. The server adds the socket to the room, notifies the others with `room:joined`, broadcasts `presence:update` and confirms the join with the history of the latest messages.
4. The client sends `chat:message`, the server saves it to the history and delivers it to everyone in the room. The `typing` event goes to the other members, and `editing` updates the list.
5. When the tab is closed the server receives `disconnect`, removes the user from the rooms and sends `room:left` and `user:offline`.

The exchange sequence is shown in figure 1: the three participants are at the top, and the arrows below show the events in the order they happen, with client A sending to the right and the server answering to the left.

![Event exchange between two clients and the server](figures/event-flow.svg)

Figure 1 – Event exchange on connect, room join, message and disconnect

### 3.2 Client choice and project structure

The client is plain HTML and JavaScript. The chat page is small and needs no bundler. Express serves it from the `public` folder at the same address as the server, so no CORS setup is needed, and checking the app takes one address opened in two windows. The event protocol does not depend on the client, so a React component for the main project can reuse it unchanged. The project structure is shown in table 1.

Table 1 – Project structure

| File                | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `server.js`         | Reads `.env`, starts the server on `PORT` or 3000             |
| `src/app.js`        | The `createServer` function: Express, static files, Socket.IO |
| `src/socket.js`     | Handlers of all events                                        |
| `src/validate.js`   | Checks the name, the room name and the message text           |
| `src/history.js`    | In-memory message history, the last 50 per room               |
| `src/rate-limit.js` | Message rate limit                                            |
| `public/`           | Client: page, script and styles                               |
| `tests/`            | Tests built on `socket.io-client`                             |

### 3.3 Events

Events and their recipients are listed in table 2.

Table 2 – Protocol events

| Event             | Direction       | Recipients                                 |
| ----------------- | --------------- | ------------------------------------------ |
| `welcome`         | server → client | the connecting user only                   |
| `user:online`     | server → client | everyone except the connecting user        |
| `user:offline`    | server → client | everyone else                              |
| `room:join`       | client → server | answer through an acknowledgement          |
| `room:joined`     | server → client | the other members of the room              |
| `room:leave`      | client → server | answer through an acknowledgement          |
| `room:left`       | server → client | everyone in the room                       |
| `presence:update` | server → client | everyone in the room, with users and flags |
| `chat:message`    | both ways       | everyone in the room, including the author |
| `private:message` | both ways       | the target chosen by `socket.id` only      |
| `typing`          | both ways       | the other members, never stored            |
| `editing`         | client → server | refreshes the list via `presence:update`   |

### 3.4 Extra features

The work includes extras from the assignment and a few of its own.

**Rooms.** A room name matches a diagram, for example `diagram-1`. Messages, notifications and the user list stay inside the room. The name is checked with a regular expression, so a client cannot create a room with a service-like name.

**Who is editing.** For each room the server keeps the list of users with an `editing` flag. Any change of the members or of the flag is sent as `presence:update`, and the client shows an editing mark next to the name.

**History.** The last 50 messages of a room live in memory and reach a newcomer in the answer to `room:join`. The `history.js` module has only `add` and `list`, so it can later be replaced by MongoDB storage without touching the handlers. Database storage is not part of this lab, so the history is empty after a server restart.

**Private messages.** The `private:message` event takes the recipient `socket.id`, delivers the text to that user only and returns an acknowledgement with a copy to the sender.

**Typing notifications.** The `typing` event goes to the other members of the room and is not stored. The client sends `true` on input and `false` one second after the last key.

**Acknowledgements and limits.** Every event with a reply returns `{ ok, error }`. Text length, message rate and packet size are set in `limits.json`, described in section 3.6. The client renders text with `textContent`, so a message cannot inject markup.

### 3.5 Verification

The work is checked by automated tests: 19 tests start a real server on a free port and connect several `socket.io-client` clients over WebSocket. The scenarios are summarized in table 3. Manual checking uses two browser windows and the steps from the README file.

Table 3 – Automated test scenarios

| Scenario                                        | Expected result                                          |
| ----------------------------------------------- | -------------------------------------------------------- |
| Connect with a valid name                       | `welcome` arrives with the list of connected users       |
| Empty, invalid or taken name                    | the connection is rejected with a clear message          |
| A second client connects and disconnects        | the first one gets `user:online` and `user:offline`      |
| Join a room                                     | history, user list, `room:joined` for the others         |
| Message in a room                               | everyone in the room gets it, other rooms get nothing    |
| Message outside a room, empty, long or too fast | refusal with an error text in the acknowledgement        |
| Fourth message in a row with a limit of three   | refusal `Too many messages, slow down`                   |
| Newcomer after four messages                    | gets only the last three (the history limit in the test) |
| Leave and disconnect                            | `room:left` and an updated user list                     |
| Typing                                          | other members get the event, the sender does not         |
| Editing flag                                    | the list shows the author with `editing`                 |
| Private message                                 | only the target gets it, an unknown target is refused    |
| Client files and `/health`                      | the page and an `ok` answer are served                   |

### 3.6 Input validation and limits

All limits live in a separate `limits.json` file: user name length (24), room name (40), message length (500), history size (50), message rate (5 per 2 seconds) and packet size. The server reads the file at start and serves it to the client at `/limits.json`, so the client and the server use the same numbers.

Three cases are checked. An empty message is rejected. A message of only spaces becomes empty after trimming and is rejected the same way. A message over the limit is rejected, and one of exactly the maximum length is accepted. The client checks whitespace-only text before sending and caps the field with the `maxLength` attribute, and the server repeats the check because a client cannot be trusted. The error comes back in the acknowledgement and shows under the form.

Each message gets an `at` timestamp when the server receives it. The client shows the date and time with seconds next to the author, so two messages never look the same, and a newcomer sees the time on messages from the history too.

#### 3.7 Answers to the control questions

9. How do you send a private message to a specific user by socket.id?

   Every connection has a unique `socket.id`. The server finds the socket with `io.sockets.sockets.get(id)` and calls `emit` on it, so only the recipient gets the text. The short form `io.to(id).emit(...)` works because each socket automatically joins a room named after its id. In this work the `private:message` event takes `to` and the text and returns an acknowledgement with a copy to the sender. If no socket has that id, the sender gets the error "User not found".

10. How do you implement a message acknowledgement in Socket.IO?

    The last argument of `emit` is a function: `socket.emit('chat:message', data, (reply) => {...})`. On the other side the event handler receives this function as its last parameter and calls it with the answer. The client learns that the server accepted or refused the message and can receive data, for example the history on joining a room. In this work every event with a reply returns an object `{ ok, error }`.

11. How do you scale a Socket.IO application to several servers, for example with Redis? (theoretically)

    Each process knows only its own connections, so a room broadcast does not reach clients on another server. The Redis adapter (`@socket.io/redis-adapter`) forwards events between processes through Redis Pub/Sub, and `io.to(room).emit` reaches everyone. A sticky load balancer is needed too to keep a client on one server during the long polling handshake. Data such as the history and the user list must move from process memory to a shared store.


Listing of server.js is given in appendix A. Listing of app.js is given in appendix B. Listing of socket.js is given in appendix C. Listing of validate.js is given in appendix D. Listing of history.js is given in appendix E. Listing of rate-limit.js is given in appendix F. Listing of client.js is given in appendix G. Listing of index.html is given in appendix H.

## Conclusion

For DSLKit, a server on Express and Socket.IO with an HTML and JavaScript client was built. Users exchange messages in real time, get notifications about connecting, disconnecting, joining a room and leaving it, and for each diagram see the list of people and those who are editing it. On top of that the work adds an in-memory history, private messages, a typing indicator, acknowledgements and a rate limit. 19 automated tests confirm the behavior of every event. Limits are kept in `limits.json`, and every message carries a timestamp. MongoDB history storage and screenshots of two windows are not included.

## Appendix A (mandatory) Listing of server.js

```js
const { createServer } = require('./src/app');

try {
  process.loadEnvFile();
} catch {
  // .env is optional, defaults apply
}

const port = Number(process.env.PORT) || 3000;

createServer().httpServer.listen(port, () => console.log(`Server running on http://localhost:${port}`));
```

## Appendix B (mandatory) Listing of app.js

```js
const http = require('node:http');
const path = require('node:path');
const express = require('express');
const { Server } = require('socket.io');
const { attachSocket } = require('./socket');
const { limits } = require('./validate');

// Builds the HTTP server with the static client and Socket.IO on top of it.
// The server is returned unstarted so tests can listen on a free port.
const createServer = (options = {}) => {
  const app = express();
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.get('/limits.json', (req, res) => res.json(limits));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' }, maxHttpBufferSize: limits.maxPacketBytes });
  attachSocket(io, options);
  return { app, httpServer, io };
};

module.exports = { createServer };
```

## Appendix C (mandatory) Listing of socket.js

```js
const { cleanName, cleanRoom, cleanText, limits } = require('./validate');
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
const attachSocket = (io, { historyLimit = limits.historyLimit, rateMax = limits.rateMax, rateWindowMs = limits.rateWindowMs } = {}) => {
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
    if (!username) return next(new Error(`A username of 1-${limits.nameMaxLength} letters, digits, dots, dashes or underscores is required`));
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
      if (!text) return fail(ack, `Message must be 1-${limits.textMaxLength} characters`);
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
      if (!text) return fail(ack, `Message must be 1-${limits.textMaxLength} characters`);
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
```

## Appendix D (mandatory) Listing of validate.js

```js
const limits = require('../limits.json');

const NAME_RE = new RegExp(String.raw`^[\p{L}\p{N}_.-]{1,${limits.nameMaxLength}}$`, 'u');
const ROOM_RE = new RegExp(`^[a-z0-9][a-z0-9_-]{0,${limits.roomMaxLength - 1}}$`, 'i');

const cleanName = (value) => (typeof value === 'string' && NAME_RE.test(value.trim()) ? value.trim() : null);

const cleanRoom = (value) => (typeof value === 'string' && ROOM_RE.test(value) ? value : null);

// A whitespace-only text trims to an empty string and is rejected like an empty one.
const cleanText = (value) => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= limits.textMaxLength ? text : null;
};

module.exports = { cleanName, cleanRoom, cleanText, limits };
```

## Appendix E (mandatory) Listing of history.js

```js
// In-memory message history, one capped list per room. A database (lab 6) can replace it
// later: the socket handlers only use `add` and `list`.
const createHistory = (limit = 50) => {
  const rooms = new Map();
  return {
    add(room, message) {
      const list = rooms.get(room) ?? [];
      list.push(message);
      if (list.length > limit) list.shift();
      rooms.set(room, list);
    },
    list(room) {
      return [...(rooms.get(room) ?? [])];
    },
  };
};

module.exports = { createHistory };
```

## Appendix F (mandatory) Listing of rate-limit.js

```js
// Sliding window: at most `max` events per `windowMs` for one socket.
const createLimiter = (max, windowMs, now = Date.now) => {
  let stamps = [];
  return () => {
    const t = now();
    stamps = stamps.filter((s) => t - s < windowMs);
    if (stamps.length >= max) return false;
    stamps.push(t);
    return true;
  };
};

module.exports = { createLimiter };
```

## Appendix G (mandatory) Listing of client.js

```js
/* global io */
const $ = (id) => document.getElementById(id);
let socket;
let currentRoom = null;
let typingTimer;

// Text is always inserted with textContent, so a message can never inject HTML.
const addLine = (text, className = '') => {
  const li = document.createElement('li');
  li.textContent = text;
  li.className = className;
  $('log').append(li);
  li.scrollIntoView({ block: 'end' });
};

// Full date and time, so two messages never look the same.
const time = (at) => new Date(at).toLocaleString();
const showError = (message) => ($('status').textContent = message || '');
const check = (reply) => showError(reply.ok ? '' : reply.error);

const renderMembers = (users) => {
  $('members').textContent = users.length ? users.map((u) => (u.editing ? `${u.username} (editing)` : u.username)).join(', ') : 'nobody';
};

const bind = () => {
  socket.on('welcome', ({ username, id, online }) => {
    $('me').textContent = `${username} (id ${id})`;
    $('online').textContent = online.join(', ');
    $('login').hidden = true;
    $('workspace').hidden = false;
  });
  socket.on('user:online', ({ username }) => addLine(`${username} connected`, 'system'));
  socket.on('user:offline', ({ username }) => addLine(`${username} disconnected`, 'system'));
  socket.on('room:joined', ({ username, room }) => addLine(`${username} joined ${room}`, 'system'));
  socket.on('room:left', ({ username, room }) => addLine(`${username} left ${room}`, 'system'));
  socket.on('presence:update', ({ room, users }) => room === currentRoom && renderMembers(users));
  socket.on('chat:message', (m) => addLine(`[${time(m.at)}] ${m.from}: ${m.text}`));
  socket.on('private:message', (m) => addLine(`[private] ${m.from} (${m.fromId}): ${m.text}`, 'private'));
  socket.on('typing', ({ username, typing }) => ($('typing').textContent = typing ? `${username} is typing...` : ''));
  socket.on('disconnect', () => showError('Connection lost, trying to reconnect...'));
  socket.io.on('reconnect', () => {
    showError('');
    if (currentRoom) joinRoom(currentRoom);
  });
};

const joinRoom = (room) =>
  socket.emit('room:join', { room }, (reply) => {
    check(reply);
    if (!reply.ok) return;
    currentRoom = room;
    renderMembers(reply.users);
    reply.history.forEach((m) => addLine(`[${time(m.at)}] ${m.from}: ${m.text}`));
  });

$('login').addEventListener('submit', (event) => {
  event.preventDefault();
  socket = io({ auth: { username: $('username').value } });
  socket.on('connect_error', (error) => ($('login-error').textContent = error.message));
  bind();
});

$('room-form').addEventListener('submit', (event) => {
  event.preventDefault();
  joinRoom($('room').value);
});

$('leave').addEventListener('click', () => {
  socket.emit('room:leave', { room: currentRoom }, (reply) => {
    check(reply);
    if (reply.ok) {
      currentRoom = null;
      renderMembers([]);
    }
  });
});

$('editing').addEventListener('change', (event) => socket.emit('editing', { room: currentRoom, editing: event.target.checked }, check));

$('text').addEventListener('input', () => {
  socket.emit('typing', { room: currentRoom, typing: true });
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => socket.emit('typing', { room: currentRoom, typing: false }), 1000);
});

// Same rules as the server: limits.json is served at /limits.json.
fetch('/limits.json')
  .then((r) => r.json())
  .then((limits) => {
    $('text').maxLength = limits.textMaxLength;
    $('username').maxLength = limits.nameMaxLength;
    $('room').maxLength = limits.roomMaxLength;
  });

$('chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('text').value;
  if (!text.trim()) return showError('Message must not be empty or only spaces');
  const to = $('to').value.trim();
  const reply = (r) => {
    check(r);
    if (!r.ok) return;
    $('text').value = '';
    if (r.message) addLine(`[private to ${r.message.toName}] ${text}`, 'private');
  };
  if (to) socket.emit('private:message', { to, text }, reply);
  else socket.emit('chat:message', { room: currentRoom, text }, reply);
});
```

## Appendix H (mandatory) Listing of index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DSLKit live rooms</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main class="app">
      <h1>DSLKit live rooms</h1>

      <form id="login" class="card">
        <label>Username <input id="username" maxlength="24" autocomplete="off" required /></label>
        <button type="submit">Connect</button>
        <p id="login-error" class="error" role="alert"></p>
      </form>

      <section id="workspace" class="card" hidden>
        <p>Connected as <strong id="me"></strong>. Online: <span id="online"></span></p>

        <form id="room-form">
          <label>Diagram room <input id="room" value="diagram-1" maxlength="40" /></label>
          <button type="submit">Join</button>
          <button type="button" id="leave">Leave</button>
          <label class="inline"><input type="checkbox" id="editing" /> I am editing</label>
        </form>

        <p>In room: <span id="members">nobody</span></p>
        <ul id="log" class="log" aria-live="polite"></ul>
        <p id="typing" class="hint"></p>

        <form id="chat-form">
          <input id="text" maxlength="500" autocomplete="off" placeholder="Message" />
          <input id="to" placeholder="Private to (socket id)" />
          <button type="submit">Send</button>
        </form>
        <p id="status" class="error" role="alert"></p>
      </section>
    </main>
    <script src="/socket.io/socket.io.js"></script>
    <script src="client.js"></script>
  </body>
</html>
```
