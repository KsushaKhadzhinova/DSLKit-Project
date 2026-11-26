'use strict';
const { Op } = require('sequelize');

// Keeps the request log and the refresh-token table from growing without bound.
async function purgeOldRecords({ db, config, now }) {
  const t = now();
  const logs = await db.RequestLog.destroy({ where: { createdAt: { [Op.lt]: new Date(t - config.limits.logRetentionDays * 86400_000) } } });
  const tokens = await db.RefreshToken.destroy({ where: { expiresAt: { [Op.lt]: new Date(t) } } });
  return { logs, tokens };
}

module.exports = { purgeOldRecords };
