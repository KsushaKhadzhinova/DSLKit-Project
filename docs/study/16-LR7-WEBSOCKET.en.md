# Lab 7. WebSocket and Socket.IO: study notes for the defence

Branch `27`, folder `part-2/lab-07-websocket`. Russian version: `16-LR7-WEBSOCKET.md`. How to run is in `00-RUN-GUIDE.md`. This is an Express and Socket.IO server with a plain JavaScript client: a room per diagram, who is in it, who is editing, who is typing, a chat and private messages. Only what you must understand and be able to extend in front of the teacher is here.

## 1 What the lab does in one minute

A user logs in under a name (and receives a signed token), connects to the server over WebSocket and joins rooms named after diagrams. In a room they see the list of participants, "editing" and "typing" marks, the history of the last 50 messages and a shared chat. There are private messages by socket id. History is kept in memory, or in MongoDB (surviving a restart) when `MONGODB_URI` is set.

The HTTP part is small: the static client, `POST /login`, `GET /health`, `GET /limits.json`, and the 404 and 500 pages.

| Client event | Data | Reply (acknowledgement) |
| --- | --- | --- |
| `room:join` | `{ room }` | `{ ok, room, history, users }` |
| `room:leave` | `{ room }` | `{ ok }` |
| `chat:message` | `{ room, text }` | `{ ok, id }` |
| `private:message` | `{ to, text }` | `{ ok, message }` |
| `typing` | `{ room, typing }` | none |
| `editing` | `{ room, editing }` | `{ ok, editing }` |

Server events: `welcome`, `user:online`, `user:offline`, `room:joined`, `room:left`, `presence:update`, `chat:message`, `private:message`, `typing`.

## 2 Project layout

```
server.js                      entry; with MONGODB_URI it plugs in MongoDB history
src/app.js                     Express, headers, /login, /health, 404/500, Socket.IO
src/socket.js                  all events: createHub, handshake, rooms, messages
src/validate.js                cleaning of name, room and text
src/token.js                   signed login token (HMAC-SHA256)
src/origin.js                  Origin check on connection
src/rate-limit.js              event rate limiter
src/history.js                 history: memory or MongoDB (one add/list interface)
limits.json                    all limits
public/                        client: index.html, client.js, styles, 404/500
```

Principle: the server logic is split into small functions (`createHandshake`, `createRoomActions`, `createMessageActions`); history is plugged in through an `add` and `list` interface, so replacing memory with MongoDB does not touch the handlers.

## 3 Life of a connection

```mermaid
sequenceDiagram
  participant B as Browser
  participant H as HTTP (Express)
  participant S as Socket.IO
  B->>H: POST /login { username }
  H-->>B: { token }
  B->>S: connect, auth.token
  S->>S: allowRequest: Origin; handshake: token, name, limits
  S-->>B: welcome { id, username, online }
  S-->>B: user:online to everyone else
  B->>S: room:join { room } (with acknowledgement)
  S->>S: history.list(room)
  S-->>B: ack { history, users }
  S-->>B: presence:update to the room
  B->>S: chat:message { room, text }
  S->>S: validate, rate limit, history.add
  S-->>B: io.to(room) chat:message to the room
  B->>S: connection drops
  S-->>B: disconnect: leave rooms, user:offline
```

## 4 Main parts explained

### Connection and protection (`createHandshake`, `origin.js`)
- `allowRequest` checks the `Origin` header: a browser always sends it on connection, so a page from another site cannot open a socket on a visitor's behalf (cross-site WebSocket hijacking). Requests without `Origin` (not a browser) pass.
- The name comes from the signed token `auth.token`; without a token `auth.username` is accepted unless `REQUIRE_TOKEN=1` is set. The token is signed with HMAC-SHA256 and compared in constant time (`timingSafeEqual`); it holds the name and an expiry. This is a simplified token for the lab; a real service would use JWT (as in lab 3).
- The name is checked (`cleanName`: letters, digits, dot, dash, underscore, up to 24 characters), must be free, and the number of users and connections per address are capped.
- A refusal in `io.use` reaches the client as a `connect_error` event.

### Rooms and presence (`createRoomActions`)
- A room is a named group of sockets: `socket.join(room)`, `io.to(room).emit(...)`. The name is lowercased and checked by a regular expression.
- The server keeps its own `rooms: Map<room, Map<socket, user>>`, so the "who is in the room" list is built without queries.
- Limits: five rooms per user, 50 participants per room. An empty room is removed from the table.
- `editing` marks the user as "editing now"; `typing` goes to everyone in the room except the sender (`socket.to(room)`).

### Messages (`createMessageActions`)
- The text is cleaned (`cleanText`): hidden control characters and text-direction override characters are removed, whitespace-only input is rejected, length is at most 500.
- The sender is always taken from the connection, never from the payload, so "from whom" cannot be forged.
- To a room: `io.to(room).emit('chat:message', message)` reaches everyone including the sender; for a private one `target.emit('private:message', ...)` reaches only the addressee, and the sender sees a copy from the acknowledgement.
- The acknowledgement (`ack`) is the last argument of the event; the server calls it through `succeed` or `fail`. Every event first checks that `ack` is actually a function.

### Load limiting
Two limiters: chat at most 5 messages per 2 seconds, any events at most 40 per 2 seconds. Packet size is capped by `maxHttpBufferSize` (10000 bytes), so a huge message closes the connection. Handlers of one socket run one after another (`tail = tail.then(...)`), so a leave sent right after a join waits for the history to load.

### History
`createHistory` keeps one list per room in memory (the last 50, at most 200 rooms). `createMongoHistory` inserts a document `{ ...message, room }` and reads the 50 latest by `_id`, giving them to the client in ascending order. If the database is unavailable, joining a room and sending answer with a clear error through `ack`.

### Disconnect
On `disconnect` the user leaves all rooms (with a `room:left` broadcast and a presence update), is removed from the online list and the address counter, and the others get `user:offline`. Nothing is left behind for a disconnected socket.

### Client (`public/client.js`)
Message text is inserted as text, not as markup (protection from code injection), and the CSP forbids inline scripts. When the connection is restored, the client joins its rooms again (`connect`).

## 5 Likely defence questions

The assignment has 16 questions; for variant 26 these are 9–11 (n−1, n, n+1 with n=10). Full answers are in the report, section 3.7.

- **How to send a private message to a specific user (9).** By socket id: `io.sockets.sockets.get(id).emit(...)` or `io.to(id).emit(...)`, because every socket automatically sits in a room named after its id. In the lab this is the `private:message` event.
- **How to implement delivery confirmation (10).** Pass a function as the last argument of `emit`; the server calls it and the client receives the result. In the lab all events answer this way except `typing`.
- **How to scale over several servers (11).** An adapter (Redis adapter) forwards events between processes, and the load balancer must keep a client on one server (sticky sessions) for long polling. History in MongoDB is already shared; the in-memory online tables would have to move out.
- **How WebSocket differs from HTTP.** One persistent two-way connection instead of a request-response cycle; the server can write first.
- **`socket.emit`, `io.emit`, `socket.broadcast.emit` (16).** The first goes only to this socket, the second to everyone, the third to everyone except this socket; for rooms `io.to(room)` and `socket.to(room)` (without the sender).
- **How to protect from an unauthorized connection (14).** A token in `auth`, an `Origin` check, connection limits, name cleaning.
- **What happens when the connection is lost (12).** The client gets `disconnect`, then the manager's `reconnect_attempt`, and on success `connect` (rooms are re-joined manually). `connectionStateRecovery` is not enabled.
- **How to pause on a slow connection (15).** Not implemented; the answer: acknowledgements as a window, `socket.volatile.emit` for optional events, checking `socket.conn.writeBuffer.length`.

## 6 Write it live: rehearsal

1. **A "read" event.** A new `chat:read` event with a room check, a broadcast `socket.to(room).emit('chat:read', ...)`, an acknowledgement through `succeed`.
2. **A read-only room.** In `toRoom` check a deny list before `history.add`.
3. **Delete your own message.** An event with an id, check the author by `message.fromId`, `io.to(room).emit('chat:deleted', ...)`; a `remove` method in the store.
4. **A `/me` command in the text.** In `toRoom` recognize the prefix and set `message.action = true`.
5. **The `emit` difference table.** Keep three lines ready in different handlers: `socket.emit`, `socket.broadcast.emit`, `io.to(room).emit`.
6. **Flood.** Send 50 messages in a row from the console and show "Too many messages".

## 7 What to check by hand before the defence

```bash
npm install
npm test
npm start
```

Open two tabs at `http://localhost:3000`, log in under different names and join one room: both participants are visible, messages arrive in both tabs, and "typing" and "editing" show on the other side. Try a taken name (error), 501 characters from the browser console (`socket.emit`), and a private message by id. For MongoDB history set `MONGODB_URI` in `.env` (never into chat or commits) and restart the server: the history must remain. The screenshots for the report are already in the `figures` folder.
