const { DataTypes } = require('sequelize');

// One row per request. The status is filled in when the response ends, so it may be empty for a request that was cut off.
const defineRequestLog = (sequelize) =>
  sequelize.define('RequestLog', {
    method: { type: DataTypes.STRING(10), allowNull: false },
    path: { type: DataTypes.STRING(200), allowNull: false },
    ip: { type: DataTypes.STRING(64), allowNull: false },
    status: { type: DataTypes.INTEGER, allowNull: true },
  });

module.exports = { defineRequestLog };
