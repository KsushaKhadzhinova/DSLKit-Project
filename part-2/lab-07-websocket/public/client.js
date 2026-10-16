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

const time = (at) => new Date(at).toLocaleTimeString();
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

$('chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('text').value;
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
