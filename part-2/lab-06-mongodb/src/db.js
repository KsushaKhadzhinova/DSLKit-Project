const mongoose = require('mongoose');

// The connection string comes from MONGODB_URI (see .env.example).
const connect = async (uri = process.env.MONGODB_URI) => {
  if (!uri) throw new Error('MONGODB_URI is not set, copy .env.example to .env');
  return mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
};

module.exports = { connect, disconnect: () => mongoose.disconnect() };
