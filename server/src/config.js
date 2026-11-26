'use strict';
const defaultLimits = require('../limits.json');

const fail = (name, why) => {
  throw new Error(`${name}: ${why}`);
};

const parseInteger = (name, raw, fallback, min, max) => {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) fail(name, `must be an integer from ${min} to ${max}`);
  return n;
};

// Reads the environment once and refuses to start with a weak or missing setup.
function loadConfig(env, limitsOverride = {}) {
  const production = env.NODE_ENV === 'production';
  const dialect = env.DB_DIALECT || 'sqlite';
  if (!['sqlite', 'postgres'].includes(dialect)) fail('DB_DIALECT', 'must be sqlite or postgres');
  if (dialect === 'postgres' && !env.DATABASE_URL) fail('DATABASE_URL', 'is required for postgres');

  const jwtSecret = env.JWT_SECRET || '';
  if (jwtSecret.length < 32) fail('JWT_SECRET', 'must be at least 32 characters');

  const bcryptRounds = parseInteger('BCRYPT_ROUNDS', env.BCRYPT_ROUNDS, 12, 4, 15);
  if (production && bcryptRounds < 10) fail('BCRYPT_ROUNDS', 'must be at least 10 in production');

  const corsOrigins = (env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (corsOrigins.some((o) => o === '*' || o === 'null')) fail('CORS_ORIGINS', 'must be an explicit list, no wildcard');

  return {
    production,
    port: parseInteger('PORT', env.PORT, 4100, 0, 65535),
    host: env.HOST || '127.0.0.1',
    dialect,
    storage: env.DB_STORAGE || './data/dslkit.sqlite',
    databaseUrl: env.DATABASE_URL || '',
    dbSync: env.DB_SYNC !== 'false',
    jwtSecret,
    bcryptRounds,
    corsOrigins,
    trustProxy: parseInteger('TRUST_PROXY', env.TRUST_PROXY, 0, 0, 10),
    limits: { ...defaultLimits, ...limitsOverride },
  };
}

module.exports = { loadConfig };
