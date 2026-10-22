const http = require('node:http');
const path = require('node:path');
const express = require('express');
const { Server } = require('socket.io');
const { attachSocket } = require('./socket');
const { limits, cleanName } = require('./validate');
const { parseAllowed, isOriginAllowed } = require('./origin');
const { issueToken } = require('./token');

const publicDir = path.join(__dirname, '..', 'public');

// Headers for every HTTP answer. The script and style policy forbids inline code, so an
// injected tag cannot run even if some text ever reached the page unescaped.
const securityHeaders = (req, res, next) => {
  res.set({
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  next();
};

// Builds the HTTP server with the static client and Socket.IO on top of it.
// The server is returned unstarted so tests can listen on a free port.
// `allowedOrigins` lists extra sites (besides the server's own address) that may open a socket.
// The token secret comes from TOKEN_SECRET; the default below is for local runs and tests only.
// `requireToken` (REQUIRE_TOKEN=1) refuses sockets that come without a login token.
const DEFAULT_SECRET = 'local-development-secret-do-not-use-in-production';

const createServer = ({
  allowedOrigins = parseAllowed(process.env.ALLOWED_ORIGINS),
  tokenSecret = process.env.TOKEN_SECRET || DEFAULT_SECRET,
  requireToken = process.env.REQUIRE_TOKEN === '1',
  setup,
  ...options
} = {}) => {
  // The built-in secret is public, so a production server must get its own.
  if (process.env.NODE_ENV === 'production' && tokenSecret === DEFAULT_SECRET) throw new Error('TOKEN_SECRET is required when NODE_ENV is production');
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(express.static(publicDir));
  app.get('/limits.json', (req, res) => res.json(limits));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  // Login: a valid name gets a signed token that the socket handshake accepts instead of a plain name.
  app.post('/login', express.json({ limit: '1kb' }), (req, res) => {
    const username = cleanName(req.body?.username);
    if (!username) return res.status(400).json({ error: `A username of 1-${limits.nameMaxLength} letters, digits, dots, dashes or underscores is required` });
    res.json({ username, token: issueToken(username, tokenSecret) });
  });
  // Known paths with another method answer 405 and say which methods they accept.
  app.all('/login', (req, res) => res.set('Allow', 'POST').status(405).type('text').send('Method not allowed'));
  app.all('/health', (req, res) => res.set('Allow', 'GET').status(405).type('text').send('Method not allowed'));
  setup?.(app);

  // 404 and 500 pages use the same styles as the rest of the site; the error text never reaches the browser.
  app.use((req, res) => res.status(404).sendFile('404.html', { root: publicDir }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) return res.status(500).sendFile('500.html', { root: publicDir });
    res.status(status).type('text').send('Bad request');
  });

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    // Without extra origins no CORS headers are sent at all: only the page served by this server can talk to it.
    cors: allowedOrigins.length ? { origin: allowedOrigins } : false,
    allowRequest: (req, callback) => callback(null, isOriginAllowed(req.headers.origin, req.headers.host, allowedOrigins)),
    maxHttpBufferSize: limits.maxPacketBytes,
  });
  attachSocket(io, { ...options, tokenSecret, requireToken });
  return { app, httpServer, io };
};

module.exports = { createServer };
