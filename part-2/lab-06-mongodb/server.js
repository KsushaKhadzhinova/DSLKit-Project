require('dotenv').config({ quiet: true });
const { createApp } = require('./src/app');
const models = require('./src/models');
const { connect } = require('./src/db');

const port = Number(process.env.PORT) || 3000;
const RETRY_MS = 5000;

// The server starts even when MongoDB is down: requests then get a clear 503 answer
// while the connection is retried in the background, and the process does not exit.
const connectWithRetry = async () => {
  try {
    await connect();
    console.log('MongoDB connected');
  } catch (error) {
    console.error(`Cannot connect to MongoDB (${error.message}), retrying in ${RETRY_MS / 1000} s`);
    setTimeout(connectWithRetry, RETRY_MS).unref?.();
  }
};

createApp(models).listen(port, () => console.log(`Server running on http://localhost:${port}`));
connectWithRetry();
