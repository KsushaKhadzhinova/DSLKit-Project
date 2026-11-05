const { createServer } = require('./src/app');

try {
  process.loadEnvFile();
} catch {
  // .env is optional, defaults apply
}

const port = Number(process.env.PORT) || 3000;
// With MONGODB_URI the chat history is kept in MongoDB and survives a restart; without it, in memory.
const start = async () => {
  let history;
  let client;
  if (process.env.MONGODB_URI) {
    const { MongoClient } = require('mongodb');
    const { createMongoHistory } = require('./src/history');
    client = await MongoClient.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    history = createMongoHistory(client.db().collection('messages'));
  }
  if (!process.env.TOKEN_SECRET) console.warn('TOKEN_SECRET is not set, the local development secret is used');
  const { httpServer, io } = createServer({ history });
  httpServer.listen(port, () => console.log(`Server running on http://localhost:${port}`));
  return { io, client };
};

// Ctrl+C and service stops close the sockets first, so clients see a clean disconnect and reconnect later.
start()
  .then(({ io, client }) => {
    const stop = () => io.close(() => (client ? client.close() : Promise.resolve()).finally(() => process.exit(0)));
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  })
  .catch((error) => {
    console.error('Cannot start the server:', error.message);
    process.exit(1);
  });
