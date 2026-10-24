const { createApp } = require('./src/app');
const { createModels } = require('./src/models');
const { startLogRetention } = require('./src/middleware/request-log');

const port = Number(process.env.PORT) || 3000;
const models = createModels();

models.sequelize
  .authenticate()
  .then(() => {
    // The request log holds client addresses, so rows older than 30 days are deleted (at the start and every hour).
    startLogRetention(models);
    return createApp(models).listen(port, () => console.log(`Server running on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error('Cannot connect to the database:', error.message);
    process.exit(1);
  });
