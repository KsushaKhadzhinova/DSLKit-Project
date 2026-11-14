const { existsSync } = require('node:fs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app');
const models = require('../src/models');

// An already installed mongod can be used through MONGOMS_SYSTEM_BINARY; the server then starts it on a
// random port with a temporary data folder, so no existing database is touched. Without it,
// mongodb-memory-server downloads a mongod binary once and caches it.
const useSystemMongod = () => {
  const path = process.env.MONGOMS_SYSTEM_BINARY;
  if (path && !existsSync(path)) delete process.env.MONGOMS_SYSTEM_BINARY;
};

// Starts a throwaway MongoDB and an Express server on top of it.
const startTestServer = async () => {
  useSystemMongod();
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('dslkit-test'));
  await models.Diagram.init();
  const server = createApp(models).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return {
    models,
    base: `http://localhost:${server.address().port}`,
    stop: async () => {
      server.close();
      await mongoose.disconnect();
      await mongod.stop();
    },
  };
};

const createCaller = (base) => async (method, path, body, raw) => {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  return { res, body: text ? JSON.parse(text) : undefined };
};

module.exports = { startTestServer, createCaller };
