'use strict';
const { DataTypes } = require('sequelize');

// A refresh token that was presented again after use records the moment, so the winner of a race can be revoked.
async function up(q) {
  await q.addColumn('refresh_tokens', 'replayedAt', { type: DataTypes.DATE, allowNull: true });
}

module.exports = { name: '002-refresh-replayed', up };
