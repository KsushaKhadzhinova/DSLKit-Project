# Negative tests, lab 7 (WebSocket)

File: `tests/negative.test.js` (20 tests). No defects were found in the existing handlers. While making the history asynchronous, a leave sent right after a join was answered "Not in this room"; handlers of one socket now run one after another, and the existing test "events without an acknowledgement callback do not crash the server" guards it.

| Scenario | Expected answer | Test |
| --- | --- | --- |
| Connect without a name | connection refused | a connection without a name is refused |
| Name of spaces, 25 characters, with symbols, a number, null | refused | a name made of spaces, a too long name... |
| Same name in another letter case | refused, "taken" | a second connection with the same name |
| `room:join` without data, number, null, empty object, spaces, long room | `ok: false` | room:join without data, with a number... |
| Message empty, spaces, tabs, number, object, null, 501 characters | `ok: false` | a chat message that is empty, spaces only... |
| Message payload is a number or missing | `ok: false` | a chat message with a number instead of an object |
| Message to a room not joined | `ok: false` | a message to a room the user has not joined |
| Join the same room twice | second `ok: false` | joining the same room twice |
| Leave a room not joined | `ok: false` | leaving a room that was never joined |
| Private message to self, unknown id, object as id | `ok: false` | a private message to oneself, to nobody... |
| Forged `from` in the payload | name from the connection | a forged sender in the payload is ignored |
| More messages than the rate limit | `ok: false`, "slow down" | messages above the rate limit |
| 200 KB packet | connection closed, server alive | a packet above the size limit |
| `typing`, `editing`, unknown event with garbage | server keeps working | typing and editing with garbage payloads |
| Disconnect while typing | others see typing stopped | a user who disconnects while typing |
| Foreign `Origin` | refused | a socket opened from a foreign Origin |
| Garbage, forged, `alg: none`-style, expired token | refused, "token" | a garbage token, a forged signature... |
| `POST /login` with broken JSON, array, null, text | 4xx, never 500 | POST /login with a broken body |
| `POST /login` with a 5 KB name | 413 | POST /login with a body over the size limit |
| Unknown address | 404 | an unknown address answers 404 |
