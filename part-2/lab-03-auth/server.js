const { createApp } = require('./src/app');
const { createModels } = require('./src/models');

const port = Number(process.env.PORT) || 3000;
const { JWT_SECRET, JWT_EXPIRES_IN, TRUST_PROXY } = process.env;
const settings = {
  jwtSecret: JWT_SECRET,
  jwtExpiresIn: JWT_EXPIRES_IN || '1h',
  // TRUST_PROXY=1 when exactly one reverse proxy stands in front of the server.
  ...(TRUST_PROXY && { trustProxy: /^\d+$/.test(TRUST_PROXY) ? Number(TRUST_PROXY) : TRUST_PROXY }),
};

const models = createModels();
let app;
try {
  app = createApp(models, settings);
} catch (error) {
  // A weak secret or lifetime stops the start, see .env.example.
  console.error(`Invalid settings: ${error.message}`);
  process.exit(1);
}

models.sequelize
  .authenticate()
  .then(() => app.listen(port, () => console.log(`Server running on http://localhost:${port}`)))
  .catch((error) => {
    console.error('Cannot connect to the database:', error.message);
    process.exit(1);
  });
