# Лабораторная работа №7. Реализация реального времени с WebSocket

## 1 Цель работы

Освоить технологию WebSocket для двусторонней связи в реальном времени и библиотеку Socket.IO. Работа выполнена для проекта DSLKit, веб-редактора диаграмм как кода: сервер даёт каждой диаграмме свою комнату, в которой пользователи обмениваются сообщениями, получают уведомления о входе и выходе и видят, кто сейчас открыл диаграмму и кто её редактирует.

## 2 Краткие теоретические сведения

**Ограничения HTTP.** В модели запрос-ответ сервер не может сам отправить данные клиенту. Чтобы узнать о новом сообщении, клиент вынужден опрашивать сервер, что создаёт лишнюю нагрузку и задержку.

**WebSocket.** Соединение начинается обычным HTTP-запросом с заголовком `Upgrade: websocket`. Сервер отвечает кодом 101, после чего то же TCP-соединение остаётся открытым, и обе стороны отправляют сообщения в любой момент без новых заголовков.

**Socket.IO.** Библиотека поверх WebSocket добавляет именованные события с данными, подтверждения доставки (acknowledgement), комнаты, автоматическое переподключение и запасной вариант с long polling, если WebSocket недоступен.

**Рассылка.** Различаются три способа отправки: `socket.emit` только этому клиенту, `socket.broadcast.emit` всем, кроме него, `io.emit` всем подключённым. Метод `to(room)` ограничивает получателей комнатой.

## 3 Ход работы

### 3.1 Схема работы

Взаимодействие клиента и сервера описано последовательностью шагов.

1. Клиент открывает страницу, вводит имя и вызывает `io({ auth: { username } })`. Сервер проверяет имя в промежуточном обработчике `io.use` и либо отклоняет подключение, либо принимает его.
2. После соединения сервер отправляет клиенту `welcome` и сообщает остальным `user:online`.
3. Клиент отправляет `room:join` с названием комнаты диаграммы. Сервер добавляет сокет в комнату, оповещает остальных событием `room:joined`, рассылает `presence:update` и подтверждает вход историей последних сообщений.
4. Клиент отправляет `chat:message`, сервер сохраняет сообщение в историю и рассылает его всем в комнате. Событие `typing` уходит остальным участникам, `editing` обновляет список.
5. При закрытии вкладки сервер получает `disconnect`, убирает пользователя из комнат и рассылает `room:left` и `user:offline`.

Последовательность обмена показана на рисунке 1: вверху три участника, ниже по стрелкам идут события в порядке выполнения, слева направо отправляет клиент А, справа налево приходит ответ сервера.

![Схема обмена событиями между двумя клиентами и сервером](figures/event-flow.svg)

Рисунок 1 – Схема обмена событиями при подключении, входе в комнату, сообщении и отключении

### 3.2 Выбор клиента и структура проекта

Для клиента выбраны чистые HTML и JavaScript. Страница с чатом небольшая, сборщик ей не нужен. Express раздаёт её из папки `public` с того же адреса, что и сервер, поэтому настройка CORS не требуется, а для проверки достаточно открыть один адрес в двух окнах. Протокол событий не зависит от клиента, и React-компонент для основного проекта сможет использовать его без изменений. Структура проекта показана в таблице 1.

Таблица 1 – Структура проекта

| Файл                | Назначение                                                     |
| ------------------- | -------------------------------------------------------------- |
| `server.js`         | Читает `.env`, запускает сервер на порту из `PORT` или 3000    |
| `src/app.js`        | Функция `createServer`: Express, статические файлы и Socket.IO |
| `src/socket.js`     | Обработчики всех событий                                       |
| `src/validate.js`   | Проверка имени, названия комнаты и текста сообщения            |
| `src/history.js`    | История сообщений в памяти, по 50 последних на комнату         |
| `src/rate-limit.js` | Ограничение частоты сообщений                                  |
| `public/`           | Клиент: страница, скрипт и стили                               |
| `tests/`            | Тесты на `socket.io-client`                                    |

### 3.3 События

События и их получатели перечислены в таблице 2.

Таблица 2 – События протокола

| Событие           | Направление     | Получатели                                 |
| ----------------- | --------------- | ------------------------------------------ |
| `welcome`         | сервер → клиент | только подключившийся                      |
| `user:online`     | сервер → клиент | все, кроме подключившегося                 |
| `user:offline`    | сервер → клиент | все остальные                              |
| `room:join`       | клиент → сервер | ответ через acknowledgement                |
| `room:joined`     | сервер → клиент | остальные в комнате                        |
| `room:leave`      | клиент → сервер | ответ через acknowledgement                |
| `room:left`       | сервер → клиент | все в комнате                              |
| `presence:update` | сервер → клиент | все в комнате, со списком людей и editing  |
| `chat:message`    | в обе стороны   | все в комнате, включая автора              |
| `private:message` | в обе стороны   | только адресат, выбранный по `socket.id`   |
| `typing`          | в обе стороны   | остальные в комнате, сообщение не хранится |
| `editing`         | клиент → сервер | обновляет список через `presence:update`   |

### 3.4 Дополнительные функции

Выполнены дополнительные функции из условия и несколько своих.

**Комнаты.** Название комнаты соответствует диаграмме, например `diagram-1`. Сообщения, уведомления и список людей не выходят за пределы комнаты. Название проверяется регулярным выражением, чтобы клиент не создал комнату со служебным именем.

**Кто редактирует диаграмму.** Сервер хранит для каждой комнаты список пользователей с флагом `editing`. Любое изменение состава или флага рассылается событием `presence:update`, а клиент показывает пометку «editing» рядом с именем.

**История.** Последние 50 сообщений комнаты хранятся в памяти и приходят новому участнику в ответе на `room:join`. Модуль `history.js` содержит только методы `add` и `list`, поэтому позже его можно заменить хранением в MongoDB без правки обработчиков. Хранение в базе в этой работе не выполнялось, после перезапуска сервера история пуста.

**Личные сообщения.** Событие `private:message` принимает `socket.id` получателя, доставляет текст только ему и возвращает отправителю подтверждение с копией сообщения.

**Уведомления о наборе текста.** Событие `typing` отправляется остальным участникам комнаты и не сохраняется. Клиент отправляет `true` при вводе и `false` через секунду после последней клавиши.

**Подтверждения и ограничения.** Все события с ответом возвращают `{ ok, error }`. Длина текста, частота сообщений и размер пакета заданы в файле `limits.json` (подробнее в разделе 3.6). Клиент показывает текст через `textContent`, поэтому сообщение не может внедрить разметку.

### 3.5 Проверка

Работа проверена автоматическими тестами: 19 тестов запускают настоящий сервер на свободном порту и подключают несколько клиентов `socket.io-client` по WebSocket. Результаты по сценариям сведены в таблице 3. Ручная проверка выполняется в двух окнах браузера по шагам из файла README.

Таблица 3 – Сценарии автоматической проверки

| Сценарий                                       | Ожидаемый результат                                         |
| ---------------------------------------------- | ----------------------------------------------------------- |
| Подключение с корректным именем                | приходит `welcome` со списком подключённых                  |
| Пустое, неверное или занятое имя               | подключение отклонено с понятным сообщением                 |
| Подключение и отключение второго клиента       | первый получает `user:online` и `user:offline`              |
| Вход в комнату                                 | история, список людей, `room:joined` у остальных            |
| Сообщение в комнате                            | получают все в комнате, в другой комнате ничего не приходит |
| Сообщение вне комнаты, пустое, длинное, частое | отказ с текстом ошибки в acknowledgement                    |
| Четвёртое сообщение подряд при лимите три      | отказ `Too many messages, slow down`                        |
| Новый участник после четырёх сообщений         | получает только последние три (лимит истории в тесте)       |
| Выход и отключение                             | `room:left` и обновлённый список людей                      |
| Набор текста                                   | событие получают другие, отправитель не получает            |
| Флаг редактирования                            | список показывает автора с `editing`                        |
| Личное сообщение                               | получает только адресат, неизвестный адресат даёт отказ     |
| Раздача клиента и `/health`                    | страница и ответ `ok` отдаются                              |

### 3.6 Проверка вводимых значений и ограничения

Все ограничения вынесены в отдельный файл `limits.json`: длина имени пользователя (24), название комнаты (40), длина сообщения (500), размер истории (50), частота сообщений (5 за 2 секунды) и размер пакета. Сервер читает файл при запуске и отдаёт его клиенту по адресу `/limits.json`, поэтому клиент и сервер используют одни и те же числа.

Проверяются три случая. Пустое сообщение отклоняется. Сообщение из одних пробелов после удаления крайних пробелов становится пустым и отклоняется так же. Сообщение длиннее предела отклоняется, а ровно предельной длины принимается. Клиент проверяет пробельный текст до отправки и ограничивает поле атрибутом `maxLength`, сервер повторяет проверку, потому что клиенту доверять нельзя. Ошибка возвращается в acknowledgement и показывается под формой.

Каждое сообщение получает метку времени `at` в момент получения сервером. Клиент показывает дату и время с секундами рядом с автором, поэтому два сообщения не выглядят одинаково, а новый участник видит время и в сообщениях из истории.

### 3.7 Ответы на контрольные вопросы

9. Как отправить приватное сообщение конкретному пользователю по его socket.id?

   У каждого соединения есть уникальный `socket.id`. Сервер находит сокет в `io.sockets.sockets.get(id)` и вызывает у него `emit`, тогда текст получает только адресат. Короткая запись `io.to(id).emit(...)` работает потому, что каждый сокет автоматически входит в комнату со своим id. В работе событие `private:message` принимает `to` и текст, а отправителю возвращает acknowledgement с копией сообщения. Если сокета с таким id нет, отправитель получает ошибку «User not found».

10. Как в Socket.IO реализовать подтверждение получения сообщения (acknowledgement)?

    Последним аргументом `emit` передаётся функция: `socket.emit('chat:message', data, (reply) => {...})`. На другой стороне обработчик события принимает эту функцию третьим параметром и вызывает её с ответом. Так клиент узнаёт, что сервер принял сообщение или отклонил его, и получает данные, например историю при входе в комнату. В работе все события с ответом возвращают объект `{ ok, error }`.

11. Как масштабировать Socket.IO-приложение на несколько серверов (например, с использованием Redis)? (теоретически)

    Каждый процесс знает только о своих соединениях, поэтому рассылка в комнату не дойдёт до клиентов на другом сервере. Адаптер Redis (`@socket.io/redis-adapter`) пересылает события между процессами через Redis Pub/Sub, и `io.to(room).emit` доходит до всех. Нужен и «липкий» балансировщик, который закрепляет клиента за сервером на время handshake при long polling. Данные вроде истории и списка людей придётся перенести из памяти процесса в общее хранилище.


Листинг server.js приведён в приложении А. Листинг app.js приведён в приложении Б. Листинг socket.js приведён в приложении В. Листинг validate.js приведён в приложении Г. Листинг history.js приведён в приложении Д. Листинг rate-limit.js приведён в приложении Е. Листинг client.js приведён в приложении Ж. Листинг index.html приведён в приложении И.

## Заключение

Для DSLKit реализован сервер на Express и Socket.IO с клиентом на HTML и JavaScript. Пользователи обмениваются сообщениями в реальном времени, получают уведомления о подключении, отключении, входе в комнату и выходе, а для каждой диаграммы видят список людей и тех, кто её редактирует. Дополнительно сделаны история в памяти, личные сообщения, индикатор набора текста, подтверждения и ограничение частоты. 19 автоматических тестов подтверждают поведение каждого события. Ограничения вынесены в `limits.json`, у каждого сообщения есть метка времени. Хранение истории в MongoDB и скриншоты двух окон в работу не включены.

## Приложение А (обязательное) Листинг server.js

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

## Приложение Б (обязательное) Листинг app.js

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

## Приложение В (обязательное) Листинг socket.js

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

## Приложение Г (обязательное) Листинг validate.js

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

## Приложение Д (обязательное) Листинг history.js

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

## Приложение Е (обязательное) Листинг rate-limit.js

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

## Приложение Ж (обязательное) Листинг client.js

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

## Приложение И (обязательное) Листинг index.html

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
