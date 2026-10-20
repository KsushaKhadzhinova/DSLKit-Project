# Part 2. Lab 7. Real time with WebSocket

DSLKit project (diagrams as code, SaaS). Branch `27`. Reports: [`report.md`](report.md) in Russian and [`report.en.md`](report.en.md) in English (built from `report.tpl.md` and `report.en.tpl.md` with `node tools/build.js part-2/lab-07-websocket` from the repository root).

## 1 What it does

An Express and Socket.IO 4 server with a plain HTML and JavaScript client. Every diagram has its own room with a chat, a list of people who have the diagram open and a mark for those who are editing it.

| Client to server  | Data                | What the server does                                       |
| ----------------- | ------------------- | ---------------------------------------------------------- |
| `room:join`       | `{ room }`          | Joins the room, answers with the history and the people    |
| `room:leave`      | `{ room }`          | Leaves the room                                            |
| `chat:message`    | `{ room, text }`    | Broadcasts to the room and saves to the history            |
| `private:message` | `{ to, text }`      | Sends to one user by `socket.id`                           |
| `typing`          | `{ room, typing }`  | Tells the room that the user is typing                     |
| `editing`         | `{ room, editing }` | Marks the diagram as being edited and updates the people   |

Server to client events: `welcome`, `user:online`, `user:offline`, `room:joined`, `room:left`, `presence:update`, `chat:message`, `private:message`, `typing`. Events with an acknowledgement answer `{ ok: true, ... }` or `{ ok: false, error }`. All limits (name, room and text length, history size, message rate) live in [`limits.json`](limits.json).

## 2 Login by token

`POST /login` with `{ "username": "alice" }` returns `{ username, token }`. The token is signed with HMAC-SHA256 and valid for one hour. The socket connects with `auth: { token }` and the user name is taken from the token, not from the client. A forged, foreign-secret or expired token is refused with `Invalid or expired token`. Plain `auth: { username }` still works for tests and simple clients; set `REQUIRE_TOKEN=1` to forbid it. The secret comes from `TOKEN_SECRET`; a development default is used when it is empty, so set your own value outside local runs.

## 3 Chat history in MongoDB

The handlers use only `history.add(room, message)` and `history.list(room)` and wait for them with `await`, so the store is injectable (`createServer({ history })`). By default the history is kept in memory. With `MONGODB_URI` in `.env`, `server.js` connects the `mongodb` driver and uses `createMongoHistory` over the `messages` collection, so the last 50 messages of a room survive a restart. When the database fails, `room:join` and `chat:message` answer an error through the acknowledgement and the server keeps running. The tests use a small fake collection and need no database; a run against a real MongoDB was not done.

## 4 Run

Node.js 22 or newer.

```bash
cd part-2/lab-07-websocket
npm install
npm start       # or npm run dev
npm test        # tests, coverage, report checks
```

Open `http://localhost:3000` in two windows, log in with different names, join `diagram-1`. Settings are in `.env` (copy `.env.example`; the real `.env` is not committed).

## 5 Tests

`npm test` starts a real server on a free port and connects `socket.io-client` clients. 69 automated tests cover connection and refusals, presence, rooms, history (memory and the Mongo-shaped store), typing, editing, private messages, limits, token login, and wrong behavior of a user (`tests/negative.test.js`, see [`NEGATIVE-TESTS.md`](NEGATIVE-TESTS.md)). The same run checks the build and formatting of the reports.
