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

The client is plain HTML and JavaScript. The chat page is small and needs no bundler. Express serves it from the `public` folder at the same address as the server, so no CORS headers are needed and the server sends none, and checking the app takes one address opened in two windows. The event protocol does not depend on the client, so a React component for the main project can reuse it unchanged. The project structure is shown in table 1.

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

The work is checked by automated tests: 41 tests start a real server on a free port and connect several `socket.io-client` clients over WebSocket. The scenarios are summarized in table 3. Manual checking uses two browser windows and the steps from the README file.

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

The same rules protect the server from overload. The rate of all events is limited per socket (40 per 2 seconds), a user can join at most 5 rooms, a room holds at most 50 people, and the server accepts at most 200 connections. The number of rooms with history is capped too, so room names invented by a client cannot use memory without end. Control characters and text-direction overrides are removed from message text, and a username counts as taken regardless of letter case. A packet larger than 10,000 bytes closes only the sender's connection.

The handshake is checked against the `Origin` header. A page from another site cannot open a socket on behalf of a visitor, because the server accepts only its own address and the addresses listed in the `ALLOWED_ORIGINS` variable. The value `*` is not used for CORS. Server responses carry the `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options` and `Referrer-Policy` headers, and an unknown address or a server failure opens styled 404 and 500 pages without the error text.

Each message gets an `at` timestamp when the server receives it. The client shows the date and time with seconds next to the author, so two messages never look the same, and a newcomer sees the time on messages from the history too.

#### 3.7 Answers to the control questions

{{answers}}
1. How does WebSocket differ from HTTP?

   HTTP is request-response, while WebSocket keeps one open connection for data in both directions at any time.

2. Which library did you use and why?

   Socket.IO: events, rooms, acknowledgements and reconnection come ready.

3. What are rooms in Socket.IO?

   Named groups of sockets: `socket.join(room)` and `io.to(room).emit(...)`.

4. How do you send a message to everyone except the sender?

   `socket.broadcast.emit(...)` or `socket.to(room).emit(...)`.

5. How do you handle a disconnect?

   The `disconnect` event on the server and on the client.

6. How do you implement a typing event?

   A separate `typing` event without storing a message.

7. How do you pass a user name at connection time?

   Through the client `auth` option, available as `socket.handshake.auth` on the server.

8. How do you save the message history in MongoDB?

   A Mongoose schema with room, author, text and time. In this work the history lives in memory.

9. How do you send a private message to a specific user by socket.id?

   Every connection has a unique `socket.id`. The server finds the socket with `io.sockets.sockets.get(id)` and calls `emit` on it, so only the recipient gets the text. The short form `io.to(id).emit(...)` works because each socket automatically joins a room named after its id. In this work the `private:message` event takes `to` and the text and returns an acknowledgement with a copy to the sender. If no socket has that id, the sender gets the error "User not found".

10. How do you implement a message acknowledgement in Socket.IO?

    The last argument of `emit` is a function: `socket.emit('chat:message', data, (reply) => {...})`. On the other side the event handler receives this function as its last parameter and calls it with the answer. The client learns that the server accepted or refused the message and can receive data, for example the history on joining a room. In this work every event with a reply returns an object `{ ok, error }`.

11. How do you scale a Socket.IO application to several servers, for example with Redis? (theoretically)

    Each process knows only its own connections, so a room broadcast does not reach clients on another server. The Redis adapter (`@socket.io/redis-adapter`) forwards events between processes through Redis Pub/Sub, and `io.to(room).emit` reaches everyone. A sticky load balancer is needed too to keep a client on one server during the long polling handshake. Data such as the history and the user list must move from process memory to a shared store.

12. Which events fire on connection loss and reconnection?

`disconnect`, then `reconnect_attempt`, `reconnect` and `connect`.

13. How do you limit message size and rate?

The `maxHttpBufferSize` option and an event counter per socket.

14. How do you protect the server from unauthorized connections?

A token check in `io.use` during the handshake.

15. How do you pause sending on a slow connection?

Acknowledgements and `socket.volatile`.

16. What is the difference between socket.emit, io.emit and socket.broadcast.emit?

One client, everyone, everyone except the sender.
{{/answers}}

Listing of server.js is given in appendix A. Listing of app.js is given in appendix B. Listing of socket.js is given in appendix C. Listing of validate.js is given in appendix D. Listing of history.js is given in appendix E. Listing of rate-limit.js is given in appendix F. Listing of client.js is given in appendix G. Listing of index.html is given in appendix H.

## Conclusion

For DSLKit, a server on Express and Socket.IO with an HTML and JavaScript client was built. Users exchange messages in real time, get notifications about connecting, disconnecting, joining a room and leaving it, and for each diagram see the list of people and those who are editing it. On top of that the work adds an in-memory history, private messages, a typing indicator, acknowledgements and a rate limit. 41 automated tests confirm the behavior of every event. Limits are kept in `limits.json`, and every message carries a timestamp. MongoDB history storage and screenshots of two windows are not included.

## Appendix A (mandatory) Listing of server.js

{{code:part-2/lab-07-websocket/server.js}}

## Appendix B (mandatory) Listing of app.js

{{code:part-2/lab-07-websocket/src/app.js}}

## Appendix C (mandatory) Listing of socket.js

{{code:part-2/lab-07-websocket/src/socket.js}}

## Appendix D (mandatory) Listing of validate.js

{{code:part-2/lab-07-websocket/src/validate.js}}

## Appendix E (mandatory) Listing of history.js

{{code:part-2/lab-07-websocket/src/history.js}}

## Appendix F (mandatory) Listing of rate-limit.js

{{code:part-2/lab-07-websocket/src/rate-limit.js}}

## Appendix G (mandatory) Listing of client.js

{{code:part-2/lab-07-websocket/public/client.js}}

## Appendix H (mandatory) Listing of index.html

{{code:part-2/lab-07-websocket/public/index.html}}
