# ЛР7. WebSocket и Socket.IO: подробный разбор (задание, теория, код, термины)

Ветка `27`, папка `part-2/lab-07-websocket` (рабочая копия для разбора: `.claude/worktrees/part2-ws-work-ee9b7b`). Короткая шпаргалка: `16-LR7-WEBSOCKET.md`. Здесь: полное задание, словарь, теория с аналогиями, построчный разбор, таблица выполнения, скриншоты, ответы на вопросы. Номера строк взяты из ветки `27` на коммите `58d9901`.

Содержание:

1. Задание дословно и критерии оценки
2. Словарь терминов
3. Теория подробно
4. Разбор нашего кода по файлам
5. Что сделано по пунктам задания и список скриншотов
6. Вопросы преподавателя (вариант 26: вопросы 9, 10, 11)
7. Частые ошибки

Секреты в файл не включены: секрет подписи токена задаётся переменной `TOKEN_SECRET` в `.env`, строка подключения к MongoDB переменной `MONGODB_URI`.

---

## 1. Задание дословно и критерии оценки

Источник: `materials/text/part-2/Модуль 03. Альтернативные технологии/12. Лабораторная работа №7 Реализация реального времени с WebSocket.txt`. Текст скопирован без правок.

```text
Лабораторная работа №7 "Реализация
реального времени с WebSocket"
Лабораторная работа №7. Реализация реального
времени с WebSocket
Ветка репозитория: 27
1. ЦЕЛЬ РАБОТЫ
Освоение технологии WebSocket для создания двусторонней связи в реальном
времени. Изучение библиотеки Socket.IO, создание системы обмена сообщениями или
уведомлений в соответствии с потребностями вашего курсового проекта (чат
поддержки, лайвы, уведомления о событиях, совместное редактирование и т.п.).
2. НЕОБХОДИМЫЕ ЗНАНИЯ
Для успешного выполнения работы студент должен знать:
Ограничения протокола HTTP для real-time приложений.
Принцип работы WebSocket (handshake, постоянное соединение).
Библиотеку Socket.IO (серверная и клиентская части).
События: connection, disconnect, message, broadcast, join, leave.
3. ЗАДАЧИ РАБОТЫ
Создать сервер на Node.js + Express + Socket.IO.
Создать клиент (React-приложение из предыдущих работ или отдельный
HTML/JS) для подключения к серверу.
Реализовать отправку и получение сообщений/уведомлений в реальном
времени.
Добавить уведомления о подключении/отключении пользователей.
Реализовать дополнительные функции, соответствующие логике вашего
курсового проекта (например, комнаты для разных чатов, сохранение истории в
MongoDB, приватные сообщения, система голосования и т.п.).
4. ПОРЯДОК ВЫПОЛНЕНИЯ (общий для всех вариантов)
Часть 1. Серверная часть
1. Установите зависимости: npm install socket.io.
2. Создайте HTTP-сервер с Express и прикрепите Socket.IO:
javascript
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
io.on('connection', (socket) => {
  console.log('User connected', socket.id);
  // обработка ваших событий
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });
  socket.on('disconnect', () => console.log('User disconnected'));
});
server.listen(3000);
Часть 2. Клиентская часть (React)
1. Установите клиентскую библиотеку: npm install socket.io-client.
2. В React-компоненте создайте соединение:
import io from 'socket.io-client';
const socket = io('http://localhost:3000');
3. Отправляйте сообщения: socket.emit('chat message', text).
4. Получайте сообщения: socket.on('chat message', (msg) => {...}).
Часть 3. Дополнительные функции (в соответствии с вашим проектом)
Выберите одну или несколько (по необходимости):
Комнаты – разделение пользователей по группам (например, разные заказы,
разные товары).
Приватные сообщения – отправка сообщения конкретному пользователю
по socket.id.
Сохранение истории сообщений в MongoDB (с использованием Mongoose).
Уведомления о наборе текста (typing event).
Голосования / опросы в реальном времени.
Синхронизация состояния (например, совместное редактирование списка
задач).
Часть 4. Тестирование
Запустите сервер и клиентское приложение.
Откройте несколько окон браузера (или разных браузеров) для имитации разных
пользователей.
Проверьте обмен сообщениями, уведомления о подключении/отключении,
работу комнат и других реализованных функций.
5. СОДЕРЖАНИЕ ОТЧЕТА
Отчёт должен содержать:
Титульный лист, цель работы.
Схему работы WebSocket (текстовое описание или диаграмма).
Листинг серверной части (обработчики событий).
Листинг клиентской части (React-компонент).
Скриншоты работы приложения с двумя окнами (имитация разных
пользователей).
Демонстрация работы дополнительных функций (комнаты, история и т.п.).
Ответы на контрольные вопросы (16 вопросов).
Выводы.
6. ТРЕБОВАНИЯ К СДАЧЕ
Отчёт (PDF) загружается в СЭО.
Ссылка на репозиторий GitHub с кодом (ветка 27).
Индивидуальное выполнение. Вариант Темы определяется по Генератору
вариантов.
Код должен быть загружен в репозиторий с веткой 27.
7. КОНТРОЛЬНЫЕ ВОПРОСЫ (16 вопросов)
1. В чём отличие WebSocket от HTTP? Почему WebSocket подходит для real-time, а
HTTP – нет?
2. Какую библиотеку вы использовали и почему? В чём
преимущество Socket.IO перед нативным WebSocket?
3. Что такое «комнаты» (rooms) в Socket.IO? Как создать комнату и отправить
сообщение только в неё?
4. Как отправить сообщение всем клиентам, кроме отправителя? Приведите
пример.
5. Как обработать разрыв соединения (disconnect) на сервере и клиенте?
6. Как реализовать событие «печатает» (typing) без отправки самих сообщений?
7. Как в Socket.IO передать дополнительные данные (например, имя пользователя)
при подключении?
8. Как сохранить историю сообщений в MongoDB с использованием Mongoose?
Какие поля нужны для вашего проекта?
9. Как отправить приватное сообщение конкретному пользователю по
его socket.id?
10. Как в Socket.IO реализовать подтверждение получения сообщения
(acknowledgement)?
11. Как масштабировать Socket.IO-приложение на несколько серверов (например, с
использованием Redis)? (теоретически)
12. Какие события генерируются автоматически при потере соединения и
переподключении?
13. Как ограничить размер сообщения или количество сообщений в секунду (rate
limiting) в Socket.IO?
14. Как защитить Socket.IO-сервер от несанкционированного подключения
(например, проверка токена)?
15. Как реализовать паузу в отправке сообщений при медленном соединении
(backpressure) в Socket.IO?
16. В чём разница между socket.emit, io.emit и socket.broadcast.emit?
8. ПРИМЕЧАНИЯ
Работа выполняется индивидуально.
Socket.IO автоматически использует WebSocket, но при необходимости
переключается на long polling – это удобно для учебных проектов.
Для хранения истории сообщений (если требуется) рекомендуется использовать
MongoDB Atlas (бесплатный кластер M0) – он доступен в Беларуси.
Клиент можно реализовать в виде отдельного React-компонента в вашем
основном проекте (ветка 27). Или, если не хотите смешивать, создать отдельную
ветку 27-websocket с упрощённым клиентом для демонстрации.
9. КРИТЕРИИ ОЦЕНКИ
Реализация базового WebSocket-сервера и клиента (установка соединения,
отправка/приём сообщений).
Уведомления о подключении/отключении пользователей.
Выполнение дополнительных функций, соответствующих логике курсового
проекта (комнаты, история, приватные сообщения и т.д.).
Качество кода: структура проекта, обработка ошибок, комментарии.
Полнота отчёта: скриншоты, листинги, схема взаимодействия.
Ссылка на репозиторий с веткой 27 и README с инструкцией по запуску.
```

### Как читать это задание (по-простому)

- Нужен сервер на Node.js + Express + Socket.IO и клиент, которые обмениваются сообщениями **в реальном времени** без перезагрузки страницы.
- Обязательно: отправка и приём сообщений, уведомления «пользователь подключился/отключился».
- Дополнительно (на выбор, в стиле своего проекта): комнаты, личные сообщения, история в MongoDB, «печатает», синхронизация. У нас: комната на каждую диаграмму, «кто в комнате», «кто редактирует», «печатает», чат, личные сообщения, история в памяти или в MongoDB.
- Скриншоты **с двумя окнами** (два «пользователя»).
- Клиент по заданию может быть React или отдельный HTML/JS. У нас клиент на чистом JavaScript (`public/client.js`), это допустимый вариант.

---

## 2. Словарь терминов

| Термин | Что это | Зачем | Пример у нас |
| --- | --- | --- | --- |
| HTTP | Протокол «запрос-ответ»: клиент спрашивает, сервер отвечает, соединение закрывается. | Обычные страницы и API. | `POST /login`, `GET /health` |
| WebSocket | Протокол одного постоянного двустороннего соединения. Начинается как HTTP, затем «обновляется» (upgrade). | Сервер может писать клиенту первым. | сообщения чата |
| Handshake (рукопожатие) | Начальный обмен, на котором соединение устанавливается и проверяется. | Здесь проверяют токен, `Origin`, имя. | `createHandshake` |
| Socket.IO | Библиотека поверх WebSocket: события, комнаты, подтверждения, переподключение, запасной long polling. | Удобнее «голого» WebSocket. | `new Server(httpServer, ...)` |
| Long polling | Запасной способ: клиент держит запрос открытым, пока сервер не ответит. | Работает там, где WebSocket заблокирован. | автоматически в Socket.IO |
| Событие (event) | Именованное сообщение с данными. | Разделять виды сообщений. | `chat:message`, `typing` |
| `emit` / `on` | `emit` отправить событие, `on` подписаться на него. | Основа обмена. | `socket.emit('room:join', ...)` |
| Сокет (socket) | Одно соединение с одним клиентом. Имеет уникальный `id`. | Адрес клиента на сервере. | `socket.id` |
| Комната (room) | Именованная группа сокетов. | Слать сообщения только участникам. | комната на диаграмму |
| Broadcast | Рассылка всем, кроме отправителя. | Уведомить остальных. | `socket.broadcast.emit('user:online')` |
| Acknowledgement (ack) | Функция-подтверждение, которую получатель вызывает в ответ на событие. | Узнать результат конкретной отправки. | последний аргумент `emit` |
| Presence | «Присутствие»: кто сейчас онлайн и в какой комнате. | Список участников. | `presence:update` |
| `disconnect` | Событие разрыва соединения. | Убрать за пользователем. | выход из комнат |
| `connect_error` | Событие ошибки подключения (например, отказ в handshake). | Показать причину. | «This username is already taken» |
| Middleware сокета | Функция проверки, выполняемая перед событиями. | Единая проверка и ограничения. | `io.use`, `socket.use` |
| Rate limiting | Ограничение частоты действий. | Защита от флуда. | 5 сообщений за 2 с |
| Backpressure | Давление очереди: клиент не успевает принимать. | Не копить данные для медленных. | `slow-clients.js` |
| `volatile` | Событие, которое можно потерять (отправляется только если клиент готов). | Необязательные события. | «печатает» |
| Origin | Заголовок с адресом сайта, откуда идёт запрос. | Защита от чужих страниц. | `isOriginAllowed` |
| CSWSH | Cross-Site WebSocket Hijacking: чужая страница открывает сокет от имени посетителя. | Знать угрозу. | защита проверкой Origin |
| HMAC | Подпись данных секретным ключом. | Подтвердить, что токен выдан нами. | `createHmac('sha256', secret)` |
| `timingSafeEqual` | Сравнение за постоянное время. | Не подсказывать посимвольным временем ответа. | `token.js` |
| Redis adapter | Адаптер Socket.IO, пересылающий события между несколькими серверами. | Масштабирование. | теоретический вопрос 11 |
| Sticky sessions | Закрепление клиента за одним сервером балансировщиком. | Для long polling. | теория |
| История сообщений | Хранение последних сообщений комнаты. | Новый участник видит прошлое. | память или MongoDB |
| XSS | Внедрение скрипта через текст сообщения. | Защищать вывод. | вставка через `textContent` |
| CSP | Заголовок, разрешающий скрипты только с своего сайта. | Вторая линия защиты от XSS. | `Content-Security-Policy` в `app.js` |

---

## 3. Теория подробно

### 3.1. HTTP и WebSocket: «письмо» и «телефонный звонок»

HTTP это письма: клиент отправил письмо (запрос), получил ответ, на этом всё. Сервер сам написать первым не может. Чтобы узнавать о новых сообщениях, пришлось бы постоянно спрашивать «есть что-нибудь?» (polling): много лишнего трафика и задержка.

WebSocket это телефонный звонок: соединение открыто, обе стороны могут говорить в любой момент. Сервер сам присылает новое сообщение сразу. Начинается всё как HTTP-запрос с заголовком `Upgrade: websocket` (рукопожатие), после чего канал остаётся открытым. Поэтому WebSocket подходит для чатов, уведомлений, совместного редактирования.

### 3.2. Чем Socket.IO лучше «голого» WebSocket

- **События с именами и данными** вместо потока байтов.
- **Комнаты** и рассылки (`io.to(room)`).
- **Подтверждения** (acknowledgements).
- **Автоматическое переподключение** с нарастающей паузой.
- **Запасной long polling**, если WebSocket недоступен.
- Проверка в handshake (`auth`, middleware).

Цена: библиотека на клиенте и сервере, свой протокол (клиент Socket.IO не говорит с обычным WebSocket-сервером).

### 3.3. Три способа отправки: `socket.emit`, `socket.broadcast.emit`, `io.emit`

Представьте здание с телефонной связью:

| Вызов | Кто получит | Аналогия |
| --- | --- | --- |
| `socket.emit(...)` | только этот клиент | сказать человеку лично |
| `socket.broadcast.emit(...)` | все, кроме этого клиента | объявить остальным, «я пришёл» |
| `io.emit(...)` | все подключённые, включая отправителя | объявление по громкой связи |
| `io.to(room).emit(...)` | все в комнате, включая отправителя | сказать в зале |
| `socket.to(room).emit(...)` | все в комнате, кроме отправителя | шепнуть в зале, кроме себя |

### 3.4. Комнаты: «чаты в разных залах»

Комната это именованная группа. Сокет входит (`socket.join(room)`), покидает (`socket.leave(room)`), сообщение в комнату видят только её участники. У нас комната на каждую диаграмму: все, кто открыл «Диаграмму 1», видят чат и «кто редактирует» только её.

### 3.5. Подтверждения: «квитанция о вручении»

Последний аргумент `emit` может быть функцией. Получатель вызывает её, передав результат, и отправитель получает ответ в этой функции. Это как заказное письмо с уведомлением: вы знаете, что оно дошло и что с ним сделали.

### 3.6. Безопасность соединения

- **Проверка в handshake**: токен (подписанный HMAC), имя по шаблону, уникальность, лимиты.
- **Origin**: браузер всегда присылает `Origin` при WebSocket; чужой сайт не сможет подключиться от имени посетителя.
- **Лимиты**: частота сообщений, размер пакета, число подключений.
- **Очистка текста**: скрытые управляющие символы удаляются, длина ограничена.
- **Вывод как текст**: сообщение вставляется как `textContent`, а не как HTML.

### 3.7. Масштабирование (теоретически)

Одно приложение Node.js держит соединения в памяти процесса. Если серверов два, пользователь A на первом и пользователь B на втором не увидят друг друга. Решение: **Redis adapter**: серверы публикуют события в Redis, а Redis рассылает остальным серверам. Для long polling балансировщик должен «закреплять» клиента за сервером (sticky sessions).

---

## 4. Разбор нашего кода по файлам

Пути от `part-2/lab-07-websocket/`.

### 4.1. `src/app.js` (HTTP-сервер и подключение Socket.IO)

```js
32 const createServer = ({ allowedOrigins = parseAllowed(process.env.ALLOWED_ORIGINS), tokenSecret = process.env.TOKEN_SECRET || DEFAULT_SECRET,
35   requireToken = process.env.REQUIRE_TOKEN === '1', setup, ...options } = {}) => {
43   const app = express();
46   app.use(express.static(publicDir));
48   app.get('/health', (req, res) => res.json({ status: 'ok' }));
50   app.post('/login', express.json({ limit: '1kb' }), (req, res) => {
51     const username = cleanName(req.body?.username);
52     if (!username) return res.status(400).json({ error: `...` });
53     res.json({ username, token: issueToken(username, tokenSecret) });
```

- Строки 32–35: секрет подписи берётся из `TOKEN_SECRET` (строка 34). Значение по умолчанию (константа `DEFAULT_SECRET`, строка 30) только для локального запуска и тестов; в режиме `production` без своего секрета (минимум 32 символа) сервер **не стартует** (строки 40–42).
- Строка 46: Express отдаёт статический клиент из `public/`.
- Строки 50–53: `POST /login`: проверенное имя получает подписанный токен. Тело ограничено 1 КБ.

```js
69 const httpServer = http.createServer(app);
70 const io = new Server(httpServer, {
72   cors: allowedOrigins.length ? { origin: allowedOrigins } : false,
73   allowRequest: (req, callback) => callback(null, isOriginAllowed(req.headers.origin, req.headers.host, allowedOrigins)),
74   maxHttpBufferSize: limits.maxPacketBytes,
75 });
76 attachSocket(io, { ...options, tokenSecret, requireToken });
```

- Строки 69–70: **так сказано в задании (часть 1)**: HTTP-сервер из Express и `new Server(server, ...)`. Но вместо `cors: { origin: '*' }` из примера у нас закрытая политика (строка 72): без дополнительных адресов CORS-заголовки не отправляются вовсе.
- Строка 73: `allowRequest` вызывает проверку `Origin` до установления соединения.
- Строка 74: `maxHttpBufferSize` (10000 байт) закрывает соединение при слишком большом пакете (вопрос 13 про ограничение размера).
- Строки 14–23: заголовки безопасности, в том числе строгий `Content-Security-Policy`, запрещающий встроенные скрипты. Строки 61–67: оформленные страницы 404 и 500 без текста ошибки.

### 4.2. `src/socket.js` (все события)

Сначала два вспомогательных:

```js
7  const fail = (ack, error) => { if (typeof ack === 'function') ack({ ok: false, error }); };
10 const succeed = (ack, data = {}) => { if (typeof ack === 'function') ack({ ok: true, ...data }); };
```

- **Подтверждения** (вопрос 10): каждое событие отвечает через `ack` объектом `{ ok: true, ... }` или `{ ok: false, error }`. Проверка `typeof ack === 'function'` нужна, потому что клиент мог не передать функцию, и сервер не должен упасть.

#### Общее состояние (`createHub`, строки 16–38)

```js
18 const history = opts.history ?? createHistory(opts.historyLimit, opts.historyMaxRooms);
19 const rooms = new Map();
20 const online = new Map(); // socket id -> { id, username }
21 const perAddress = new Map(); // client address -> number of open sockets
33 publishPresence: (room) => io.to(room).emit('presence:update', { room, users: usersOf(room) }),
34 makeMessage: (user, text, extra) => ({ id: ++messageSeq, from: user.username, fromId: user.id, text, at: Date.now(), ...extra }),
```

- `rooms`: таблица «комната → пользователи», по ней список «кто в комнате» строится без запросов. `online`: все подключённые. `perAddress`: число соединений с одного адреса.
- Строка 34: сообщение собирается на **сервере**: автор (`from`, `fromId`) берётся из соединения, а не из присланных данных, поэтому подделать «от кого» нельзя.

#### Рукопожатие (`createHandshake`, строки 42–60)

```js
44 const { token, username: plain } = socket.handshake.auth ?? {};
46 if (token !== undefined) {
47   given = verifyToken(token, opts.tokenSecret);
48   if (!given) return next(new Error('Invalid or expired token, log in again'));
49 } else if (opts.requireToken) {
50   return next(new Error('A login token is required'));
52 const username = cleanName(given);
53 if (!username) return next(new Error(`A username of 1-... is required`));
54 if (hub.isTaken(username)) return next(new Error('This username is already taken'));
55 if (hub.online.size >= opts.maxUsers) return next(new Error('The server is full, try again later'));
57 if ((hub.perAddress.get(socket.handshake.address) ?? 0) >= opts.maxPerAddress) return next(new Error('Too many connections from your address'));
58 socket.data.username = username;
59 next();
```

- Данные для проверки клиент передаёт при подключении в `auth` (вопрос 7 и 14 задания: «передать дополнительные данные при подключении» и «проверка токена»).
- Строки 46–48: токен проверяется; неверный или просроченный токен это отказ. Строки 49–51: при включённом `REQUIRE_TOKEN=1` без токена не пускают.
- Строки 52–57: имя проверено шаблоном, не занято, сервер не переполнен, с одного адреса не больше 20 соединений. Каждый отказ вызывает `next(new Error(...))`, клиент получает событие `connect_error` с этим текстом.
- Строка 58: имя сохраняется в `socket.data`, дальше его знает каждое событие.

#### Комнаты и присутствие (`createRoomActions`, строки 63–122)

```js
77 const join = async (payload, ack) => {
78   const room = cleanRoom(payload?.room);
79   if (!room) return fail(ack, 'Invalid room name');
80   if (joined.has(room)) return fail(ack, 'Already in this room');
81   if (joined.size >= opts.maxRoomsPerUser) return fail(ack, ...);
82   if ((rooms.get(room)?.size ?? 0) >= opts.maxRoomMembers) return fail(ack, 'This room is full');
85   past = await history.list(room);
91   joined.add(room);
92   socket.join(room);
93   if (!rooms.has(room)) rooms.set(room, new Map());
94   rooms.get(room).set(socket.id, user);
95   socket.to(room).emit('room:joined', { room, username: user.username, at: Date.now() });
96   hub.publishPresence(room);
97   succeed(ack, { room, history: past, users: hub.usersOf(room) });
```

- **Комнаты** (вопрос 3): `socket.join(room)` в строке 92 вводит сокет в комнату. Название очищается (`cleanRoom`: нижний регистр, шаблон).
- Строки 80–82: пределы: нельзя войти дважды, не более 5 комнат на пользователя, не более 50 участников.
- Строка 85: история комнаты читается **до** входа; если хранилище недоступно, вход отвечает понятной ошибкой (строки 86–89).
- Строка 95: `socket.to(room).emit` оповещает остальных в комнате, **кроме** вошедшего: «Боб вошёл в комнату».
- Строка 96: всем обновляется список участников. Строка 97: вошедшему через `ack` отправляются история и список участников.

```js
67  const leave = (room) => {
68    joined.delete(room);  socket.leave(room);
70    rooms.get(room)?.delete(socket.id);
71    if (rooms.get(room)?.size === 0) rooms.delete(room);
72    io.to(room).emit('room:left', { room, username: user.username, at: Date.now() });
73    io.to(room).emit('typing', { room, username: user.username, typing: false });
74    hub.publishPresence(room);
108 const editing = (payload, ack) => { ... user.editing = Boolean(payload.editing); hub.publishPresence(room); succeed(ack, { editing: user.editing }); };
116 const typing = (payload) => { ... emitLight(io, room, socket.id, 'typing', {...}, opts.slowQueueMax); };
```

- `leave`: выход из комнаты, пустая комната удаляется из таблицы (строка 71), остальным уходят «вышел», «перестал печатать» и новый список.
- `editing` (108–114): отметка «редактирует»; рассылается обновлённый список присутствия.
- `typing` (116–119): без `ack`, рассылается через `emitLight` (см. 4.8) всем в комнате, кроме отправителя. Сами сообщения для этого не нужны (вопрос 6).

#### Сообщения (`createMessageActions`, строки 125–161)

```js
129 const toRoom = async (payload, ack) => {
130   const room = cleanRoom(payload?.room);
131   const text = cleanText(payload?.text);
132   if (!room || !joined.has(room)) return fail(ack, 'Join the room first');
133   if (!text) return fail(ack, `Message must be 1-${limits.textMaxLength} characters`);
134   if (!allowed()) return fail(ack, 'Too many messages, slow down');
135   const message = hub.makeMessage(user, text, { room });
137     await history.add(room, message);
142   io.to(room).emit('chat:message', message);
143   succeed(ack, { id: message.id });
```

- **Сообщение в комнату** (основное требование). Проверки: сокет состоит в комнате (132), текст допустим (133), не превышен лимит частоты (134). Строка 137: сообщение сохраняется в историю. Строка 142: `io.to(room).emit` отправляет **всем в комнате**, включая отправителя. Строка 143: отправителю подтверждение с `id`.

```js
148 const toUser = (payload, ack) => {
150   const target = typeof payload?.to === 'string' ? io.sockets.sockets.get(payload.to) : undefined;
151   if (!target) return fail(ack, 'User not found');
152   if (target.id === socket.id) return fail(ack, 'You cannot send a private message to yourself');
155   const message = hub.makeMessage(user, text, { to: target.id, toName: target.data.username });
156   target.emit('private:message', message);
157   succeed(ack, { message });
```

- **Личное сообщение по `socket.id`** (вопрос 9). Строка 150: ищем сокет получателя по идентификатору в реестре `io.sockets.sockets`. Строка 156: `target.emit` отправляет только ему. Отправитель получает копию через `ack` (строка 157) и рисует её у себя.

#### Подключение и отключение (`handleConnection`, строки 163–206)

```js
166 const conn = { socket, user, joined: new Set(), allowed: createLimiter(opts.rateMax, opts.rateWindowMs) };
167 const eventAllowed = createLimiter(opts.eventRateMax, opts.eventRateWindowMs);
173 socket.use((packet, next) => { if (eventAllowed()) return next(); fail(packet.at(-1), 'Too many requests, slow down'); });
179 let tail = Promise.resolve();
180 const on = (event, handler) => socket.on(event, (...args) => { tail = tail.then(() => handler(...args)).catch(...); });
185 socket.emit('welcome', { id: user.id, username: user.username, online: hub.onlineList() });
186 socket.broadcast.emit('user:online', { id: user.id, username: user.username, at: Date.now() });
190 on('room:join', roomActions.join);  ... on('chat:message', ...); on('private:message', ...); on('typing', ...); on('editing', ...);
198 socket.on('disconnect', () => {
199   [...conn.joined].forEach(roomActions.leave);
200   hub.online.delete(socket.id);
204   socket.broadcast.emit('user:offline', { id: user.id, username: user.username, at: Date.now() });
```

- Строки 166–167: два ограничителя (сообщения: 5 за 2 с, любые события: 40 за 2 с) (вопрос 13).
- Строка 173: `socket.use` это middleware всех событий сокета; при превышении клиент получает отказ через `ack`.
- Строки 179–183: обработчики одного сокета выполняются **по очереди** (цепочка `tail`), чтобы выход сразу после входа дождался загрузки истории.
- Строка 185: **`welcome`** только подключившемуся (свой `id`, имя, список онлайн). Строка 186: **`socket.broadcast.emit('user:online')`** остальным: это уведомление о подключении (требование задания). Строка 204: `user:offline` при отключении (требование «уведомления о подключении/отключении»).
- Строки 198–205: **`disconnect`** (вопрос 5): выход из всех комнат, удаление из онлайн-списка и счётчика адресов, оповещение остальных. После отключения на сокет ничего не остаётся.

### 4.3. `src/validate.js` (очистка входных данных)

```js
3  const NAME_RE = new RegExp(String.raw`^[\p{L}\p{N}_.-]{1,${limits.nameMaxLength}}$`, 'u');
4  const ROOM_RE = new RegExp(`^[a-z0-9][a-z0-9_-]{0,${limits.roomMaxLength - 1}}$`, 'i');
6  const HIDDEN_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f‪-‮⁦-⁩]/g;
8  const cleanName = (value) => (typeof value === 'string' && NAME_RE.test(value.trim()) ? value.trim() : null);
11 const cleanRoom = (value) => (typeof value === 'string' && ROOM_RE.test(value) ? value.toLowerCase() : null);
14 const cleanText = (value) => {
15   if (typeof value !== 'string' || value.length > limits.textMaxLength * 2) return null;
16   const text = value.replace(HIDDEN_RE, '').trim();
17   return text.length > 0 && text.length <= limits.textMaxLength ? text : null;
```

- Имя: буквы любого алфавита, цифры, `_`, `.`, `-`, до 24 знаков. Комната: латиница, цифры, `_`, `-`, до 40 знаков, регистр не важен.
- `HIDDEN_RE` вырезает управляющие символы и символы смены направления текста (они могут «перевернуть» текст вокруг имени).
- Строка 15: слишком длинное значение отвергается сразу. Строка 17: пробельный текст после `trim()` становится пустым и отвергается; допустимая длина 1–500.

### 4.4. `src/token.js` (подписанный токен)

```js
5  const sign = (body, secret) => crypto.createHmac('sha256', secret).update(body).digest('base64url');
7  const issueToken = (username, secret, { ttlSeconds = 3600, now = Date.now } = {}) => {
8    const body = Buffer.from(JSON.stringify({ sub: username, exp: Math.floor(now() / 1000) + ttlSeconds })).toString('base64url');
9    return `${body}.${sign(body, secret)}`;
13 const verifyToken = (token, secret, { now = Date.now } = {}) => {
14   if (typeof token !== 'string' || token.length > 1000) return null;
20   if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
23   return typeof sub === 'string' && Number.isFinite(exp) && exp > Math.floor(now() / 1000) ? sub : null;
```

- Токен это `тело.подпись`. Тело содержит имя (`sub`) и срок (`exp`, 1 час). Подпись это HMAC-SHA256 с секретом сервера: изменить имя в теле, не зная секрета, невозможно.
- Строка 20: подписи сравниваются за постоянное время (`timingSafeEqual`), чтобы время ответа не подсказывало, сколько символов угадано.
- Строка 23: проверяется срок. Любая неверная форма даёт `null`. Это упрощённый токен для работы; в боевой службе использовали бы JWT, как в ЛР3.

### 4.5. `src/origin.js` (защита от чужих страниц)

```js
10 const isOriginAllowed = (origin, host, allowed = []) => {
11   if (!origin) return true;
12   if (allowed.includes(origin)) return true;
13   try { return new URL(origin).host === host; } catch { return false; }
```

- Браузер всегда присылает `Origin` при подключении. Разрешён только собственный адрес сервера (сравнение `host`) и адреса из `ALLOWED_ORIGINS`. Запрос без `Origin` (Node-клиент, `curl`) не браузер и пропускается (строка 11).

### 4.6. `src/rate-limit.js` (ограничитель «скользящее окно»)

```js
3 const createLimiter = (max, windowMs, now = Date.now) => {
4   let stamps = [];
5   return () => {
6     const t = now();
7     stamps = stamps.filter((s) => t - s < windowMs);
8     if (stamps.length >= max) return false;
9     stamps.push(t);  return true;
```

- Хранит метки времени последних событий, отбрасывает старше окна, и если за окно уже `max` событий, отказывает. Каждый сокет имеет свой ограничитель.

### 4.7. `src/history.js` (история сообщений)

```js
5  const createHistory = (limit = 50, maxRooms = 200) => { const rooms = new Map(); return {
8    add(room, message) { const list = rooms.get(room) ?? []; list.push(message); if (list.length > limit) list.shift(); ...
16   list(room) { return [...(rooms.get(room) ?? [])]; } } };
25 const createMongoHistory = (collection, limit = 50) => ({
26   async add(room, message) { await collection.insertOne({ ...message, room }); },
29   async list(room) {
30     const newest = await collection.find({ room }).sort({ _id: -1 }).limit(limit).toArray();
32     return newest.reverse().map(({ _id, ...message }) => message);
```

- Один интерфейс из двух методов `add` и `list`: память (последние 50 на комнату, не более 200 комнат) или MongoDB. Обработчики о способе хранения не знают.
- MongoDB: `insertOne` записывает документ, чтение берёт 50 последних по убыванию `_id`, разворачивает по возрастанию и убирает внутренний `_id` (вопрос 8).
- В `server.js` (строки 14–18) при заданной `MONGODB_URI` подключается `MongoClient` (официальный драйвер `mongodb`) и коллекция `messages`; без неё история в памяти. Это отличие от текста задания: оно предлагает Mongoose, мы взяли драйвер, поскольку нужны только две операции. В отчёте это стоит объяснить.

### 4.8. `src/slow-clients.js` (медленные клиенты)

```js
5  const isSlow = (socket, max) => (socket.conn?.writeBuffer?.length ?? 0) > max;
8  const emitLight = (io, room, exceptId, event, payload, max) => { ...
13   if (isSlow(peer, max)) skipped += 1; else peer.volatile.emit(event, payload);
```

- Если у клиента длинная очередь исходящих пакетов (`writeBuffer`), необязательное событие «печатает» ему **не отправляется**, а остальным идёт как `volatile` (может быть потеряно). Чат и присутствие остаются надёжными. Это вариант ответа на вопрос 15 (backpressure): **в коде есть** (в шпаргалке `16` написано «не реализовано», это устарело для текущей версии кода).

### 4.9. `public/client.js` (клиент)

```js
15 // Every piece of text from the network goes through textContent, never parsed as markup
17 const el = (tag, className, text) => { const node = document.createElement(tag); ... node.textContent = text; ...
105 const joinRoom = (room, { rejoin = false } = {}) => socket.emit('room:join', { room }, (reply) => { ... });
124 const bind = (s) => {
125   s.on('welcome', ...);  134 s.on('user:online', ...);  139 s.on('user:offline', ...);
145   s.on('room:joined', ...);  146 s.on('room:left', ...);  147 s.on('presence:update', ...);
152   s.on('chat:message', (m) => m.room === currentRoom && addChat(m));
153   s.on('private:message', ...);  154 s.on('typing', ...);
166   s.on('disconnect', (reason) => { setConnection('Reconnecting...'); ... });
174   s.on('connect', () => { setText('status'); if (currentRoom) joinRoom(currentRoom, { rejoin: true }); });
178   s.on('connect_error', (error) => { ... });
199 const reply = await fetch('/login', { method: 'POST', ... });
202 socket = io({ auth: { token: data.token } });
```

- Строки 15–22: весь пришедший по сети текст вставляется через `textContent`, а не как разметка (защита от XSS); тест сканирует файл на запрещённые способы вставки HTML.
- Строки 199–202: сначала HTTP-вход получает токен, затем `io({ auth: { token } })` подключает сокет, передавая токен в handshake. Адрес не указан: клиент подключается к тому же серверу, откуда загружена страница.
- Строки 124–188: все подписки собраны в `bind`. `chat:message` показывается только если относится к текущей комнате (152).
- Строки 166 и 174: **события разрыва и восстановления** (вопрос 12): при `disconnect` показывается «Reconnecting...», при каждом `connect` (в том числе после автоматического переподключения) клиент **заново входит в комнату** (`rejoin`). Сервер при разрыве сокета комнаты очистил, поэтому вход нужно повторить.
- Строки 234–246: `typing` отправляется не чаще раза в 1,5 с и сбрасывается через 1 с тишины (debounce-подобная логика, чтобы не слать событие на каждую букву). Строки 154–165: индикатор у получателя гаснет сам через 3 с, если событие «перестал» потерялось.
- Строки 248–263: отправка: приватное (`private:message`) или в комнату (`chat:message`), в обоих случаях с функцией-подтверждением (`done`).

---

## 5. Что сделано по пунктам задания и скриншоты

### 5.1. Таблица выполнения

| Пункт задания | Статус | Где в коде |
| --- | --- | --- |
| Сервер на Node.js + Express + Socket.IO | сделано | `src/app.js` 69–76 |
| Клиент (React или отдельный HTML/JS) | сделано: отдельный клиент на чистом JS | `public/index.html`, `public/client.js` |
| Отправка и получение сообщений в реальном времени | сделано (`chat:message` в комнату) | `socket.js` 129–144, `client.js` 152, 248–263 |
| Уведомления о подключении и отключении | сделано (`user:online`, `user:offline`, `room:joined`, `room:left`) | `socket.js` 186, 204, 95, 72 |
| Доп.: комнаты | сделано, комната на диаграмму | `socket.js` 77–105 |
| Доп.: приватные сообщения | сделано по `socket.id` | `socket.js` 148–158 |
| Доп.: история сообщений в MongoDB | сделано (память или MongoDB, драйвер `mongodb`; без `MONGODB_URI` в памяти) | `history.js`, `server.js` 14–18 |
| Доп.: «печатает» | сделано | `socket.js` 116–119, `client.js` 234–246 |
| Доп.: синхронизация («кто редактирует») | сделано | `socket.js` 108–114 |
| Защита: токен, Origin, лимиты, очистка текста | сделано сверх задания | `token.js`, `origin.js`, `rate-limit.js`, `validate.js` |
| Тестирование с несколькими окнами | сделано вручную в нескольких окнах и автотестами (`tests`: сокеты, стресс, медленные клиенты, негативные) | `tests/*.test.js` |
| Отчёт: схема, листинги, скриншоты с двумя окнами, 16 вопросов | отчёт собран, 10 снимков вставлены (рисунки 2–11), схема рис. 1; **16 вопросов: развёрнуто 9–11 по варианту** | `report.md`, `figures/event-flow.svg` |
| Ветка `27`, README с инструкцией | ветка есть | `README.md` |
| Отчёт PDF в СЭО, титульный лист | **за владелицей** | вне репозитория |

### 5.2. Скриншоты (`part-2/lab-07-websocket/figures`, 10 PNG и схема)

| Файл | Рисунок | Что на снимке |
| --- | --- | --- |
| `event-flow.svg` | 1 | Схема обмена событиями между двумя клиентами и сервером: подключение, вход в комнату, сообщение, отключение. |
| `01-join-notifications-alice.png` | 2 | Окно Алисы: приветствие и уведомления о подключении Боба. |
| `02-join-bob.png` | 3 | Окно Боба после входа в комнату диаграммы: список участников. |
| `03-chat-alice.png` | 4 | Окно Алисы: сообщение Боба пришло в комнату. |
| `04-chat-bob.png` | 5 | Окно Боба: свои и чужие сообщения в комнате. |
| `05-room-diagram-2-carol.png` | 6 | Окно Кэрол в другой комнате: сообщения первой комнаты не приходят (изоляция комнат). |
| `06-room-diagram-1-alice-no-leak.png` | 7 | Окно Алисы: сообщения другой комнаты не попали в её ленту. |
| `07-who-is-editing-bob.png` | 8 | Окно Боба: список показывает, кто редактирует диаграмму. |
| `08-validation-error-bob.png` | 9 | Окно Боба: ошибка проверки при пустом сообщении. |
| `09-leave-notification-alice.png` | 10 | Окно Алисы: уведомление о выходе Боба из комнаты. |
| `10-disconnect-notification-alice.png` | 11 | Окно Алисы: уведомление об отключении Боба. |

Требование «скриншоты с двумя окнами» закрыто снимками 2–5 (Алиса и Боб), 6–7 (комнаты), 10–11 (выход и отключение). Снимков личного сообщения и истории из MongoDB в папке нет: при необходимости снимаются вручную (приватное: кнопка конверта у имени в списке; история: задать `MONGODB_URI`, отправить сообщения, перезапустить сервер и войти в комнату).

---

## 6. Вопросы преподавателя (вариант 26: вопросы 9, 10, 11)

### Вопрос 9. Как отправить приватное сообщение конкретному пользователю по его socket.id?

**Ответ.** У каждого сокета есть уникальный `id`, и каждый сокет автоматически состоит в комнате с таким же именем. Поэтому два способа:

```js
// 1) найти сокет и отправить ему
io.sockets.sockets.get(targetId)?.emit('private:message', message);
// 2) отправить в «личную комнату» сокета
io.to(targetId).emit('private:message', message);
```

Клиент передаёт `id` получателя вместе с текстом: `socket.emit('private:message', { to: id, text }, ack)`. Важно: отправителя сервер берёт **из соединения**, а не из присланных данных; получателя нужно проверить (существует ли, не сам ли отправитель), текст очистить, лимит частоты применить. Отправитель видит свою копию отдельно (копию возвращают в подтверждении), потому что адресату она уходит, а отправителю нет.

**Из проекта:** `socket.js`, строки 148–158 (`toUser`): поиск `io.sockets.sockets.get(payload.to)` (150), проверки (151–154), `target.emit('private:message', message)` (156), `succeed(ack, { message })` (157). Клиент: `client.js`, строка 261 (`socket.emit('private:message', { to: privateTo.id, text }, done)`); идентификаторы участников приходят в списке онлайн (`welcome`, строка 185).

### Вопрос 10. Как в Socket.IO реализовать подтверждение получения сообщения (acknowledgement)?

**Ответ.** Последним аргументом `emit` передают функцию-колбэк. Принимающая сторона получает её последним аргументом обработчика и вызывает, передав результат; отправитель получает его в своём колбэке:

```js
// клиент
socket.emit('chat:message', { room, text }, (reply) => {
  if (!reply.ok) showError(reply.error);
});
// сервер
socket.on('chat:message', (payload, ack) => {
  // ... обработка ...
  ack({ ok: true, id: message.id });
});
```

Для случая «ответа может не быть» используют таймаут: `socket.timeout(5000).emit(..., (err, reply) => ...)` (в колбэке первым аргументом приходит ошибка таймаута). Подтверждение нужно, чтобы отличить «сообщение принято и сохранено» от «отказ (лимит, неверные данные)».

**Из проекта:** `socket.js`, строки 7–12 (`fail` и `succeed`, проверка `typeof ack === 'function'`), все события, кроме `typing`, отвечают через `ack` (`join` строка 97, `toRoom` строка 143, `toUser` строка 157). Клиент: `client.js`, строки 105–122 (`joinRoom`), 254–262 (функция `done` для отправки).

### Вопрос 11. Как масштабировать Socket.IO-приложение на несколько серверов (например, с использованием Redis)? (теоретически)

**Ответ.** Проблема: соединения живут в памяти конкретного процесса. Клиент A на сервере 1 и клиент B на сервере 2 не видят друг друга: `io.to(room).emit` дойдёт только до тех, кто подключён к тому же процессу. Решение:

1. **Адаптер Redis** (`@socket.io/redis-adapter`): каждый сервер публикует события рассылки в Redis (pub/sub), а все серверы получают их и доставляют своим клиентам. После подключения адаптера `io.to(room).emit` работает по всему кластеру.
2. **Балансировщик с закреплением** (sticky sessions): при long polling запросы одного клиента должны попадать на один сервер. При чистом WebSocket достаточно разрешить `transports: ['websocket']`.
3. **Общее состояние** хранится вне процесса: список онлайн, комнаты и счётчики лимитов из памяти нужно вынести (Redis), история в MongoDB уже общая.
4. Проверка токена остаётся независимой, поскольку она не требует общего состояния (поэтому подписанный токен удобнее серверных сессий).

**Из проекта:** в работе кластера нет, это **теоретический вопрос**. Подготовленность кода: история сообщений через интерфейс `add`/`list` легко переключается на MongoDB (`history.js`), а `rooms`, `online`, `perAddress` лежат в памяти процесса (`socket.js` 19–21) и при масштабировании потребовали бы вынесения. Токен самодостаточен (`token.js`).

### Краткие ответы на остальные вопросы задания

| № | Вопрос | Суть ответа |
| --- | --- | --- |
| 1 | WebSocket и HTTP | Постоянное двустороннее соединение вместо «запрос-ответ»; сервер пишет первым; подходит для реального времени. |
| 2 | Библиотека и преимущества | Socket.IO: события, комнаты, подтверждения, переподключение, запасной long polling. |
| 3 | Комнаты | `socket.join(room)`, сообщение в комнату `io.to(room).emit(...)` (`socket.js` 92, 142). |
| 4 | Всем, кроме отправителя | `socket.broadcast.emit(...)`; в комнате `socket.to(room).emit(...)` (строки 95, 186). |
| 5 | `disconnect` | Серверный обработчик `socket.on('disconnect')` убирает пользователя (198–205); клиентский `s.on('disconnect')` показывает «Reconnecting...» (`client.js` 166). |
| 6 | «Печатает» | Отдельное событие `typing` без текста сообщения (`socket.js` 116–119, `client.js` 234–246). |
| 7 | Данные при подключении | `io({ auth: { token } })`, на сервере `socket.handshake.auth` (`socket.js` 44). |
| 8 | История в MongoDB | Документ `{ id, from, fromId, text, at, room }`; поля нужны для комнаты, автора, времени; у нас драйвер `mongodb`, а не Mongoose (`history.js` 25–34). |
| 12 | События потери и переподключения | Клиент: `disconnect`, затем у менеджера `reconnect_attempt`, `reconnect`; при удаче снова `connect`; комнаты нужно войти заново (`connectionStateRecovery` не включён). |
| 13 | Ограничение частоты и размера | Скользящее окно (`rate-limit.js`), `maxHttpBufferSize` (`app.js` 74). |
| 14 | Защита от неавторизованного подключения | Токен в `auth`, проверка в `io.use`; `Origin`; лимиты. |
| 15 | Backpressure | Проверка очереди `socket.conn.writeBuffer`, `volatile.emit` для необязательных событий (`slow-clients.js`). |
| 16 | `socket.emit`, `io.emit`, `socket.broadcast.emit` | Таблица 3.3. |

---

## 7. Частые ошибки

1. **`cors: { origin: '*' }` в боевой версии.** В примере задания так написано, но это открывает сервер любому сайту; у нас точный список адресов или полный запрет.
2. **Не проверять `Origin`.** Чужая страница сможет открыть сокет от имени посетителя (CSWSH).
3. **Доверять отправителю в данных события.** Автор сообщения берётся из соединения, а не из `payload.from`.
4. **Вставлять сообщение как HTML.** Это XSS; использовать `textContent`.
5. **Не вызывать `ack`, проверяя его наличие.** Клиент может не передать функцию; `ack(...)` без проверки роняет обработчик.
6. **Путать `io.emit`, `socket.emit` и `socket.broadcast.emit`.** Частая причина «сообщение пришло не тем».
7. **Не входить в комнату заново после переподключения.** Сервер при разрыве очищает сокет, комната потеряна.
8. **Не убирать за отключившимся.** Забытые записи в таблицах комнат и онлайн раздувают память.
9. **Нет ограничений.** Без лимита частоты и размера один клиент может заспамить или «уронить» сервер.
10. **Тестировать одним окном.** Для проверки нужно два и более окон, лучше разные браузеры (отдельный профиль).
11. **Занятое имя.** Второе окно с тем же именем получает отказ `This username is already taken`; для проверки использовать разные имена.
12. **Порт занят.** Сервер использует порт из `PORT` (по умолчанию 3000); освободите порт или задайте другой.
13. **Говорить, что в работе есть «кластер на Redis».** Его нет; это теоретический вопрос.
14. **Утверждать «история только в MongoDB».** Без `MONGODB_URI` история хранится в памяти и пропадает при перезапуске.

Проверка перед защитой: `npm install`, `npm test`, `npm start`; открыть две вкладки на `http://localhost:3000`, войти под разными именами, войти в одну комнату, обменяться сообщениями, проверить «печатает» и «редактирует», занятое имя (ошибка), 501 символ (ошибка), личное сообщение по значку конверта, закрыть вкладку и увидеть «отключился».
