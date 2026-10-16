const { createApp } = require('./src/app');
const { createModels } = require('./src/models');

const port = Number(process.env.PORT) || 3000;
const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random string of at least 32 characters (see .env.example)');
  process.exit(1);
}

const models = createModels();

models.sequelize
  .authenticate()
  .then(() =>
    createApp(models, { jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN || '1h' }).listen(port, () =>
      console.log(`Server running on http://localhost:${port}`),
    ),
  )
  .catch((error) => {
    console.error('Cannot connect to the database:', error.message);
    process.exit(1);
  });
