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

## Неправильные действия пользователя (файл `tests/negative-misuse.test.js`, 17 тестов)

Найденные дефекты:

| Сценарий | Что было | Что стало |
| --- | --- | --- |
| `GET` или `PUT` на `/login`, `POST` на `/health` | ответ 404, как на неизвестный адрес; метод не назван | ответ 405 с заголовком `Allow` (`POST` для `/login`, `GET` для `/health`); код в `src/app.js` (два маршрута `app.all`), листинг в отчётах обновлён тем же сборщиком (`tools/build.js`) |

Новые сценарии:

| Сценарий | Ожидаемый ответ | Тест |
| --- | --- | --- |
| События `room:join`, `room:leave`, `editing`, сообщение и личное сообщение без данных | `ok: false`, сервер продолжает работу | room:join, room:leave, editing and chat message without data answer an error |
| Массив или строка вместо объекта в входе, сообщении и личном сообщении | `ok: false` | an array or a string instead of an object is refused |
| Личное сообщение 20 KB (больше лимита пакета) | соединение отправителя закрыто, другие входят | a 20 KB private message closes only the sender |
| Комната из пробелов или с пробелом в начале в выходе, редактировании и сообщении | `ok: false` | a room name of spaces or with a leading space is refused |
| Личное сообщение из пробелов, табуляций или невидимых символов | `ok: false`, адресат ничего не получает | a private message of spaces, tabs or only hidden characters |
| Личное сообщение пользователю, который только что вышел | `ok: false`, «User not found» | a private message to a user who has just left |
| Личное сообщение самому себе | `ok: false`, копия не приходит отправителю | a private message to oneself is refused and no copy reaches the sender |
| Спам сверх лимита, затем работа после окна | отказ «slow down», потом `ok: true` | spam over the rate limit is refused, and the same user can write again |
| Повторный вход в ту же комнату | второй вход `ok: false`, в списке одна запись | joining the same room twice keeps one entry |
| Отключение во время редактирования | пользователь пропадает из списка комнаты | a user who disconnects while editing leaves the presence list |
| Origin `null` и тот же хост на другом порту | подключение отклонено | a socket from an Origin of "null" or of another port |
| Токен с одним изменённым символом подписи | отказ, «token» | a token whose signature has one character changed is refused |
| Токен, истекающий в текущую секунду | отказ, «token» | a token that expires in the current second is refused |
| Токен имени, уже находящегося онлайн | отказ, «taken» | a token of a name that is online now is refused as taken |
| `POST /login` с именем из пробелов, пути, разметки, числа, списка | 400 без токена | POST /login with a name of spaces, a path, markup... |
| Неизвестные пути `/.env`, `/admin`, закодированный обход | 404 без сведений о файлах | unknown paths such as /.env, /admin... answer 404 |
| `GET` и `PUT` на `/login`, `POST` на `/health` | 405 с `Allow` | GET or PUT on /login and POST on /health answer 405 |
