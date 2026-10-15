const { createApp } = require('./src/app');
const { createModels } = require('./src/models');

const port = Number(process.env.PORT) || 3000;
const models = createModels();

models.sequelize
  .authenticate()
  .then(() => createApp(models).listen(port, () => console.log(`Server running on http://localhost:${port}`)))
  .catch((error) => {
    console.error('Cannot connect to the database:', error.message);
    process.exit(1);
  });
