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
