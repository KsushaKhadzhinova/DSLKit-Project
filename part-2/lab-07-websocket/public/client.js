/* global io */
const $ = (id) => document.getElementById(id);

let socket = null;
let me = null;
let currentRoom = null;
let privateTo = null; // { id, name } while a private message is being written
let online = []; // [{ id, username }]
let members = []; // [{ id, username, editing }]
let limits = { nameMaxLength: 24, roomMaxLength: 40, textMaxLength: 500 };
let lastTypingSent = 0;
let typingStopTimer;
const typingUsers = new Map(); // username -> timer that hides the "is typing" note

// Every piece of text from the network goes through textContent, never parsed as markup,
// so a name or a message can not inject HTML. A test scans this file for the HTML-parsing APIs.
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// Full date and time, so two messages never look the same.
const time = (at) => new Date(at).toLocaleString();

const nameRe = () => new RegExp(String.raw`^[\p{L}\p{N}_.-]{1,${limits.nameMaxLength}}$`, 'u');
const roomRe = () => new RegExp(`^[a-z0-9][a-z0-9_-]{0,${limits.roomMaxLength - 1}}$`, 'i');

const setText = (id, message = '') => ($(id).textContent = message);
const check = (id) => (reply) => setText(id, reply?.ok ? '' : (reply?.error ?? 'No answer from the server'));

const addLine = ({ className = '', author, at, text, room }) => {
  const li = el('li', `message ${className}`.trim());
  if (room) li.dataset.room = room;
  if (author) li.append(el('strong', '', `${author}: `));
  li.append(el('span', '', text));
  if (at) {
    const stamp = el('time', '', ` ${time(at)}`);
    stamp.dateTime = new Date(at).toISOString();
    li.append(stamp);
  }
  const log = $('log');
  const stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 8;
  log.append(li);
  while (log.children.length > 300) log.firstChild.remove(); // the page keeps a bounded number of lines
  if (stick) log.scrollTop = log.scrollHeight;
};
const system = (text) => addLine({ className: 'message--system', text });
const addChat = (m) => addLine({ author: m.from, at: m.at, text: m.text, room: m.room });

const renderPeople = (list, users, withActions) => {
  list.replaceChildren();
  if (!users.length) list.append(el('li', 'people__item people__empty', 'Nobody'));
  users.forEach((u) => {
    const li = el('li', 'people__item');
    li.append(el('span', '', u.editing ? `${u.username} (editing)` : u.username));
    if (withActions && u.id !== me?.id) {
      const button = el('button', 'button button--quiet button--icon live__icon');
      button.type = 'button';
      button.dataset.tip = 'Private message';
      button.setAttribute('aria-label', `Write a private message to ${u.username}`);
      button.append(envelope());
      button.addEventListener('click', () => setTarget({ id: u.id, name: u.username }));
      li.append(button);
    }
    list.append(li);
  });
};

// A small envelope drawn with DOM calls, so no markup string is parsed.
const envelope = () => {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M3 5h14v10H3zM3 6l7 5 7-5');
  svg.append(path);
  return svg;
};

const renderOnline = () => renderPeople($('online'), online, true);
const renderMembers = () => renderPeople($('members'), members, false);

const setTarget = (target) => {
  privateTo = target;
  $('target').hidden = !target;
  $('target-name').textContent = target ? target.name : '';
  $('text').focus();
};

const setConnection = (text) => ($('conn').textContent = text);

const showTyping = () => {
  const names = [...typingUsers.keys()];
  $('typing').textContent = names.length ? `${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} typing...` : '';
};

const joinRoom = (room, { rejoin = false } = {}) =>
  socket.emit('room:join', { room }, (reply) => {
    check('room-error')(reply);
    if (!reply?.ok) {
      if (rejoin) currentRoom = null;
      return;
    }
    currentRoom = reply.room;
    $('room').value = reply.room;
    members = reply.users;
    renderMembers();
    // Re-render the room history instead of appending it, so a rejoin after a lost connection never shows a message twice.
    $('log')
      .querySelectorAll('[data-room]')
      .forEach((node) => node.remove());
    reply.history.forEach(addChat);
    system(rejoin ? `Back in ${reply.room}` : `You joined ${reply.room}`);
  });

const bind = (s) => {
  s.on('welcome', ({ id, username, online: list }) => {
    me = { id, username };
    online = list;
    $('me').textContent = username;
    $('login').hidden = true;
    $('workspace').hidden = false;
    renderOnline();
    setConnection('Connected');
  });
  s.on('user:online', (u) => {
    online = [...online.filter((x) => x.id !== u.id), { id: u.id, username: u.username }];
    renderOnline();
    system(`${u.username} connected`);
  });
  s.on('user:offline', (u) => {
    online = online.filter((x) => x.id !== u.id);
    if (privateTo?.id === u.id) setTarget(null);
    renderOnline();
    system(`${u.username} disconnected`);
  });
  s.on('room:joined', ({ username, room }) => system(`${username} joined ${room}`));
  s.on('room:left', ({ username, room }) => system(`${username} left ${room}`));
  s.on('presence:update', ({ room, users }) => {
    if (room !== currentRoom) return;
    members = users;
    renderMembers();
  });
  s.on('chat:message', (m) => m.room === currentRoom && addChat(m));
  s.on('private:message', (m) => addLine({ className: 'message--private', author: `${m.from} (private)`, at: m.at, text: m.text }));
  s.on('typing', ({ room, username, typing }) => {
    if (room !== currentRoom) return;
    clearTimeout(typingUsers.get(username));
    typingUsers.delete(username);
    // If the "stopped" event is lost, the note disappears by itself after three seconds.
    if (typing)
      typingUsers.set(
        username,
        setTimeout(() => (typingUsers.delete(username), showTyping()), 3000),
      );
    showTyping();
  });
  s.on('disconnect', (reason) => {
    setConnection('Reconnecting...');
    setText('status', reason === 'io server disconnect' ? 'The server closed the connection.' : 'Connection lost, trying to reconnect...');
    typingUsers.forEach(clearTimeout);
    typingUsers.clear();
    showTyping();
  });
  // Fires after the first connection and after every automatic reconnection: the room is joined again.
  s.on('connect', () => {
    setText('status');
    if (currentRoom) joinRoom(currentRoom, { rejoin: true });
  });
  s.on('connect_error', (error) => {
    if (!me) {
      setText('login-error', error.message);
      s.close();
      return;
    }
    // After a restart the old connection may still be registered for a moment: try again instead of giving up.
    setText('status', error.message);
    if (!s.active) setTimeout(() => s.connect(), 2000);
  });
};

$('login').addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = $('username').value.trim();
  if (!username) return setText('login-error', 'Enter a name, spaces alone are not a name');
  if (!nameRe().test(username)) return setText('login-error', `Use 1-${limits.nameMaxLength} letters, digits, dots, dashes or underscores`);
  setText('login-error');
  socket?.close(); // a second submit never leaves a second connection behind
  try {
    // The server signs the name into a token; the socket then proves who it is with the token.
    const reply = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
    const data = await reply.json();
    if (!reply.ok) return setText('login-error', data.error ?? 'Login failed');
    socket = io({ auth: { token: data.token } });
    bind(socket);
  } catch {
    setText('login-error', 'The server is not reachable');
  }
});

$('room-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const room = $('room').value.trim();
  if (!roomRe().test(room)) return setText('room-error', `Room name: 1-${limits.roomMaxLength} letters, digits, dashes or underscores`);
  setText('room-error');
  joinRoom(room.toLowerCase());
});

$('leave').addEventListener('click', () => {
  socket.emit('room:leave', { room: currentRoom }, (reply) => {
    check('room-error')(reply);
    if (!reply?.ok) return;
    system(`You left ${currentRoom}`);
    currentRoom = null;
    members = [];
    renderMembers();
    $('editing').checked = false;
    typingUsers.clear();
    showTyping();
  });
});

$('editing').addEventListener('change', (event) => socket.emit('editing', { room: currentRoom, editing: event.target.checked }, check('status')));
$('target-clear').addEventListener('click', () => setTarget(null));

$('text').addEventListener('input', () => {
  if (!currentRoom) return;
  const now = Date.now();
  if (now - lastTypingSent > 1500) {
    lastTypingSent = now;
    socket.emit('typing', { room: currentRoom, typing: true });
  }
  clearTimeout(typingStopTimer);
  typingStopTimer = setTimeout(() => {
    lastTypingSent = 0;
    socket.emit('typing', { room: currentRoom, typing: false });
  }, 1000);
});

$('chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('text').value;
  if (!text.trim()) return setText('status', 'Message must not be empty or only spaces');
  if (text.trim().length > limits.textMaxLength) return setText('status', `Message must be at most ${limits.textMaxLength} characters`);
  if (!privateTo && !currentRoom) return setText('status', 'Join a room first');
  const done = (reply) => {
    check('status')(reply);
    if (!reply?.ok) return;
    $('text').value = '';
    if (reply.message)
      addLine({ className: 'message--private', author: `You to ${reply.message.toName} (private)`, at: reply.message.at, text: reply.message.text });
  };
  if (privateTo) socket.emit('private:message', { to: privateTo.id, text }, done);
  else socket.emit('chat:message', { room: currentRoom, text }, done);
});

// The same limits as on the server: limits.json is served at /limits.json.
fetch('/limits.json')
  .then((r) => r.json())
  .then((loaded) => {
    limits = { ...limits, ...loaded };
    $('text').maxLength = limits.textMaxLength;
    $('username').maxLength = limits.nameMaxLength;
    $('room').maxLength = limits.roomMaxLength;
  })
  .catch(() => {}); // the defaults above stay in place when the file can not be loaded
