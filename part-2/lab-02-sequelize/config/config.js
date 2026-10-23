const { readFileSync } = require('node:fs');

try {
  process.loadEnvFile();
} catch {
  // .env is optional, defaults apply
}

// DATABASE_URL selects PostgreSQL, otherwise a local SQLite file is used.
// With DATABASE_SSL=true the server certificate is verified; only DATABASE_SSL_REJECT_UNAUTHORIZED=false turns that off.
// DATABASE_SSL_CA is a path to a PEM file with the certificate authority, the safe way to trust a private or self-signed server.
const fromEnv = () => {
  const { DATABASE_URL, DATABASE_SSL, DATABASE_SSL_REJECT_UNAUTHORIZED, DATABASE_SSL_CA, SQLITE_STORAGE, NODE_ENV } = process.env;
  if (!DATABASE_URL) return { dialect: 'sqlite', storage: SQLITE_STORAGE || './dev.sqlite', logging: false };
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

// One config for every environment: tests override SQLITE_STORAGE.
module.exports = { development: fromEnv(), test: fromEnv(), production: fromEnv() };
