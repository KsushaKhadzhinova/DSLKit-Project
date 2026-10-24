const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/app');

const withEnv = (value, fn) => {
  const before = process.env.NODE_ENV;
  process.env.NODE_ENV = value;
  try {
    return fn();
  } finally {
    if (before === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = before;
  }
};

test('production refuses a missing, a default and a short token secret, and accepts a long one', () => {
  withEnv('production', () => {
    assert.throws(() => createServer({ tokenSecret: undefined }), /TOKEN_SECRET is required/);
    assert.throws(() => createServer({ tokenSecret: 'short' }), /at least 32 characters/);
    assert.throws(() => createServer({ tokenSecret: 'x'.repeat(31) }), /at least 32 characters/);
    const { io } = createServer({ tokenSecret: 'x'.repeat(32) });
    io.close();
  });
});

test('outside production a short secret still works, so local runs and tests need no setup', () => {
  withEnv('development', () => {
    const { io } = createServer({ tokenSecret: 'short' });
    io.close();
  });
});
