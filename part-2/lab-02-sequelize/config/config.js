try {
  process.loadEnvFile();
} catch {
  // .env is optional, defaults apply
}

// DATABASE_URL selects PostgreSQL, otherwise a local SQLite file is used.
const fromEnv = () => {
  const { DATABASE_URL, DATABASE_SSL, SQLITE_STORAGE } = process.env;
  if (!DATABASE_URL) return { dialect: 'sqlite', storage: SQLITE_STORAGE || './dev.sqlite', logging: false };
  return {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    ...(DATABASE_SSL === 'true' && { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }),
  };
};

// One config for every environment: tests override SQLITE_STORAGE.
module.exports = { development: fromEnv(), test: fromEnv(), production: fromEnv() };
