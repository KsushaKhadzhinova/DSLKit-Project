const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');

const configPath = resolve(__dirname, '../config/config.js');

// config.js reads the environment when it is loaded, so each case reloads it.
const load = (env) => {
  const keys = ['DATABASE_URL', 'DATABASE_SSL', 'DATABASE_SSL_REJECT_UNAUTHORIZED', 'DATABASE_SSL_CA', 'SQLITE_STORAGE', 'NODE_ENV'];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key) => delete process.env[key]);
  Object.assign(process.env, env);
  delete require.cache[configPath];
  try {
    return require(configPath).development;
  } finally {
    keys.forEach((key) => (saved[key] === undefined ? delete process.env[key] : (process.env[key] = saved[key])));
    delete require.cache[configPath];
  }
};

test('without DATABASE_URL the config uses a SQLite file', () => {
  assert.deepEqual(load({}), { dialect: 'sqlite', storage: './dev.sqlite', logging: false });
  assert.equal(load({ SQLITE_STORAGE: './other.sqlite' }).storage, './other.sqlite');
});

test('with DATABASE_URL the config uses PostgreSQL without TLS options', () => {
  const config = load({ DATABASE_URL: 'postgres://u:p@localhost:5432/db' });
  assert.equal(config.dialect, 'postgres');
  assert.equal(config.use_env_variable, 'DATABASE_URL');
  assert.equal('dialectOptions' in config, false);
});

test('DATABASE_SSL=true verifies the server certificate by default', () => {
  const { ssl } = load({ DATABASE_URL: 'postgres://x', DATABASE_SSL: 'true' }).dialectOptions;
  assert.deepEqual(ssl, { require: true, rejectUnauthorized: true });
});

test('only DATABASE_SSL_REJECT_UNAUTHORIZED=false turns certificate checks off', () => {
  const base = { DATABASE_URL: 'postgres://x', DATABASE_SSL: 'true' };
  assert.equal(load({ ...base, DATABASE_SSL_REJECT_UNAUTHORIZED: 'false' }).dialectOptions.ssl.rejectUnauthorized, false);
  for (const value of ['true', '0', 'no', '']) {
    assert.equal(load({ ...base, DATABASE_SSL_REJECT_UNAUTHORIZED: value }).dialectOptions.ssl.rejectUnauthorized, true, value);
  }
});

test('DATABASE_SSL_CA adds the certificate authority to the TLS options and keeps the checks on', () => {
  const { writeFileSync, mkdtempSync, rmSync } = require('node:fs');
  const { tmpdir } = require('node:os');
  const dir = mkdtempSync(resolve(tmpdir(), 'ca-'));
  const file = resolve(dir, 'ca.pem');
  writeFileSync(file, 'PEM TEXT');
  try {
    const { ssl } = load({ DATABASE_URL: 'postgres://x', DATABASE_SSL: 'true', DATABASE_SSL_CA: file }).dialectOptions;
    assert.deepEqual(ssl, { require: true, rejectUnauthorized: true, ca: 'PEM TEXT' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('in production the database needs TLS with certificate checks', () => {
  const url = { DATABASE_URL: 'postgres://x', NODE_ENV: 'production' };
  assert.throws(() => load(url), /DATABASE_SSL=true is required/);
  assert.throws(() => load({ ...url, DATABASE_SSL: 'true', DATABASE_SSL_REJECT_UNAUTHORIZED: 'false' }), /cannot be turned off/);
  assert.equal(load({ ...url, DATABASE_SSL: 'true' }).dialectOptions.ssl.rejectUnauthorized, true);
  assert.equal(load({ NODE_ENV: 'production' }).dialect, 'sqlite');
});

test('the login lock and the rate limits come from limits.json', () => {
  const LIMITS = require('../limits.json');
  assert.ok(LIMITS.loginMaxAttempts > 0 && LIMITS.loginLockMinutes > 0);
  assert.ok(LIMITS.loginRateMax > 0 && LIMITS.loginRateWindowMinutes > 0);
  assert.ok(LIMITS.registerRateMax > 0 && LIMITS.registerRateWindowMinutes > 0);
});
