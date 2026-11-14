const { readFileSync } = require('node:fs');

try {
  process.loadEnvFile();
} catch {
  // .env is optional, the settings may come from the environment
}

// PostgreSQL is the database of the work: DATABASE_URL points to it (a local one from docker-compose.yml, Neon, Supabase).
// SQLITE_STORAGE selects a SQLite file instead, the tests use it with a temporary file so that they need no server.
// With DATABASE_SSL=true the server certificate is verified; only DATABASE_SSL_REJECT_UNAUTHORIZED=false turns that off.
// DATABASE_SSL_CA is a path to a PEM file with the certificate authority, the safe way to trust a private or self-signed server.
const fromEnv = () => {
  const { DATABASE_URL, DATABASE_SSL, DATABASE_SSL_REJECT_UNAUTHORIZED, DATABASE_SSL_CA, SQLITE_STORAGE, NODE_ENV } = process.env;
  if (!DATABASE_URL) {
    if (SQLITE_STORAGE) return { dialect: 'sqlite', storage: SQLITE_STORAGE, logging: false };
    throw new Error('DATABASE_URL is not set: copy .env.example to .env and start the database (docker compose up -d db), or set SQLITE_STORAGE to use a SQLite file');
  }
  if (NODE_ENV === 'production' && (DATABASE_SSL !== 'true' || DATABASE_SSL_REJECT_UNAUTHORIZED === 'false')) {
    throw new Error('In production DATABASE_SSL=true is required and certificate checks cannot be turned off, use DATABASE_SSL_CA instead');
  }
  return {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    ...(DATABASE_SSL === 'true' && { dialectOptions: { ssl: { require: true, rejectUnauthorized: DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false', ...(DATABASE_SSL_CA && { ca: readFileSync(DATABASE_SSL_CA, 'utf8') }) } } }),
  };
};

// The settings are read when a block is asked for, so a missing setting is reported where the database is needed
// and not at the moment this file is loaded. The same block serves every environment, the tests set SQLITE_STORAGE.
module.exports = {
  get development() {
    return fromEnv();
  },
  get test() {
    return fromEnv();
  },
  get production() {
    return fromEnv();
  },
};
