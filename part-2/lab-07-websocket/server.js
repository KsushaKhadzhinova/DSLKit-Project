const { createServer } = require('./src/app');

try {
  process.loadEnvFile();
} catch {
  // .env is optional, defaults apply
}

const port = Number(process.env.PORT) || 3000;

createServer().httpServer.listen(port, () => console.log(`Server running on http://localhost:${port}`));
