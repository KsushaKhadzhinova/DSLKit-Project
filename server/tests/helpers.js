'use strict';
const crypto = require('node:crypto');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');
const { createDatabase } = require('../src/db');

// With TEST_PG_URL (an admin connection string) every test server gets its own throw-away PostgreSQL database.
async function pgDatabase() {
  const { Client } = require('pg');
  const name = `dslkit_t_${crypto.randomBytes(6).toString('hex')}`;
  const admin = new Client({ connectionString: process.env.TEST_PG_URL });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();
  const url = new URL(process.env.TEST_PG_URL);
  url.pathname = `/${name}`;
  const drop = async () => {
    const c = new Client({ connectionString: process.env.TEST_PG_URL });
    await c.connect();
    await c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await c.end();
  };
  return { url: url.toString(), drop };
}

// Every secret and password is generated per run, nothing sensitive is a literal.
const randomSecret = () => crypto.randomBytes(24).toString('hex');
const strongPassword = () => `Aa1-${crypto.randomBytes(9).toString('hex')}`;
let counter = 0;
const uniqueEmail = (prefix = 'user') => `${prefix}${++counter}-${crypto.randomBytes(3).toString('hex')}@example.test`;

const HIGH_LIMITS = { loginRateMax: 100000, registerRateMax: 100000, refreshRateMax: 100000, generalRateMax: 100000 };

async function startServer({ env = {}, limits = {} } = {}) {
  const clock = {
    now: 1_800_000_000_000,
    advance(ms) {
      this.now += ms;
    },
  };
  const pg = process.env.TEST_PG_URL ? await pgDatabase() : null;
  const config = loadConfig(
    {
      NODE_ENV: 'test',
      DB_DIALECT: pg ? 'postgres' : 'sqlite',
      DB_STORAGE: ':memory:',
      DATABASE_URL: pg ? pg.url : '',
      JWT_SECRET: randomSecret(),
      CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
      BCRYPT_ROUNDS: '4',
      ...env,
    },
    { ...HIGH_LIMITS, ...limits },
  );
  const db = await createDatabase(config);
  const { app } = createApp({ config, db, now: () => clock.now, logger: { error() {} } });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  async function api(method, path, { token, body, headers = {}, raw } = {}) {
    const init = { method, headers: { ...headers } };
    if (token) init.headers.authorization = `Bearer ${token}`;
    if (raw !== undefined) init.body = raw;
    else if (body !== undefined) {
      init.headers['content-type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const res = await fetch(base + path, init);
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, body: json, text, headers: res.headers };
  }

  // Registers through the API; elevated roles are set in the database like an admin would.
  async function signup(role = 'user', name = 'Test User') {
    const email = uniqueEmail(role);
    const password = strongPassword();
    const res = await api('POST', '/api/auth/register', { body: { email, password, displayName: name } });
    if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${res.text}`);
    if (role !== 'user') await db.User.update({ role }, { where: { id: res.body.user.id } });
    return { id: res.body.user.id, email, password, role, token: res.body.accessToken, refreshToken: res.body.refreshToken };
  }

  const close = async () => {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await db.sequelize.close().catch(() => {});
    if (pg) await pg.drop();
  };
  return { api, base, clock, config, db, signup, close };
}

const validProject = (over = {}) => ({ title: 'Flow', description: 'demo', notation: 'flowchart', source: 'a -> b', visibility: 'private', ...over });

module.exports = { pgDatabase, startServer, strongPassword, randomSecret, uniqueEmail, validProject };
