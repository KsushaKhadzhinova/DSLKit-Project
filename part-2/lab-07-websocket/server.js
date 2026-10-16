const { createServer } = require('./src/app');

try {
  process.loadEnvFile();
} catch {
  // .env is optional, defaults apply
}

const port = Number(process.env.PORT) || 3000;
const { httpServer, io } = createServer();

httpServer.listen(port, () => console.log(`Server running on http://localhost:${port}`));

// Ctrl+C and service stops close the sockets first, so clients see a clean disconnect and reconnect later.
const stop = () => io.close(() => process.exit(0));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
