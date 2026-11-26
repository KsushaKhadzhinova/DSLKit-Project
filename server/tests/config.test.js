'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config');
const { randomSecret } = require('./helpers');

const base = () => ({ NODE_ENV: 'test', DB_DIALECT: 'sqlite', JWT_SECRET: randomSecret() });

test('loads defaults for sqlite', () => {
  const c = loadConfig(base());
  assert.equal(c.dialect, 'sqlite');
  assert.equal(c.port, 4100);
  assert.deepEqual(c.corsOrigins, []);
  assert.equal(c.limits.loginMaxAttempts, 5);
});

test('rejects a missing or short JWT secret', () => {
  assert.throws(() => loadConfig({ ...base(), JWT_SECRET: '' }), /JWT_SECRET/);
  assert.throws(() => loadConfig({ ...base(), JWT_SECRET: 'short' }), /JWT_SECRET/);
});

test('rejects an unknown dialect and postgres without DATABASE_URL', () => {
  assert.throws(() => loadConfig({ ...base(), DB_DIALECT: 'mysql' }), /DB_DIALECT/);
  assert.throws(() => loadConfig({ ...base(), DB_DIALECT: 'postgres' }), /DATABASE_URL/);
  assert.equal(loadConfig({ ...base(), DB_DIALECT: 'postgres', DATABASE_URL: 'postgres://h/db' }).dialect, 'postgres');
});

test('bcrypt cost is bounded and strict in production', () => {
  assert.throws(() => loadConfig({ ...base(), BCRYPT_ROUNDS: '3' }), /BCRYPT_ROUNDS/);
  assert.throws(() => loadConfig({ ...base(), BCRYPT_ROUNDS: 'x' }), /BCRYPT_ROUNDS/);
  assert.throws(() => loadConfig({ ...base(), NODE_ENV: 'production', BCRYPT_ROUNDS: '8' }), /BCRYPT_ROUNDS/);
  assert.equal(loadConfig({ ...base(), NODE_ENV: 'production', BCRYPT_ROUNDS: '12' }).bcryptRounds, 12);
});

test('CORS origins are parsed, trimmed, and a wildcard is refused', () => {
  assert.deepEqual(loadConfig({ ...base(), CORS_ORIGINS: ' http://a.test , http://b.test ' }).corsOrigins, ['http://a.test', 'http://b.test']);
  assert.throws(() => loadConfig({ ...base(), CORS_ORIGINS: '*' }), /CORS_ORIGINS/);
});

test('port must be a valid number', () => {
  assert.throws(() => loadConfig({ ...base(), PORT: '70000' }), /PORT/);
  assert.equal(loadConfig({ ...base(), PORT: '0' }).port, 0);
});
