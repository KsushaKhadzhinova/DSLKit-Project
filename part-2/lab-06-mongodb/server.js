require('dotenv').config({ quiet: true });
const { createApp } = require('./src/app');
const models = require('./src/models');
const { connect } = require('./src/db');

const port = Number(process.env.PORT) || 3000;

connect()
  .then(() => {
    console.log('MongoDB connected');
    createApp(models).listen(port, () => console.log(`Server running on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error('Cannot connect to MongoDB:', error.message);
    process.exit(1);
  });
