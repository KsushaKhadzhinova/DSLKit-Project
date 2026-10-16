const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const labDir = resolve(__dirname, '..');
const cli = require.resolve('sequelize-cli/lib/sequelize');

// Creates a throwaway SQLite file and returns helpers to run the real sequelize-cli against it.
const createTempDatabase = () => {
  const dir = mkdtempSync(join(tmpdir(), 'dslkit-lab2-'));
  const storage = join(dir, 'test.sqlite');
  const env = { ...process.env, SQLITE_STORAGE: storage, DATABASE_URL: '', ADMIN_EMAIL: 'Root@Example.com', ADMIN_PASSWORD: 'seed password 1' };
  return {
    storage,
    cli: (...args) => execFileSync(process.execPath, [cli, ...args], { cwd: labDir, env, encoding: 'utf8' }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
};

module.exports = { createTempDatabase };
