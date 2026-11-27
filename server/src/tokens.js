'use strict';
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { unauthorized } = require('./errors');

const ISSUER = 'dslkit-editor-server';
const AUDIENCE = 'dslkit-editor';
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Time always comes from the injected clock so tests need no real waiting.
function createTokens({ config, db, now }) {
  const { limits } = config;
  const nowSec = () => Math.floor(now() / 1000);

  function signAccess(userId) {
    const iat = nowSec();
    const exp = iat + limits.accessTokenMinutes * 60;
    return { token: jwt.sign({ sub: userId, iat, exp, iss: ISSUER, aud: AUDIENCE }, config.jwtSecret, { algorithm: 'HS256' }), expiresIn: exp - iat };
  }

  function verifyAccess(token) {
    try {
      return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE, clockTimestamp: nowSec() });
    } catch (err) {
      throw err instanceof jwt.TokenExpiredError ? unauthorized('token_expired', 'Access token expired') : unauthorized();
    }
  }

  async function issueRefresh(userId) {
    const token = crypto.randomBytes(48).toString('base64url');
    await db.RefreshToken.create({ userId, tokenHash: sha256(token), expiresAt: new Date(now() + limits.refreshTokenDays * 86400_000) });
    // Keep only the newest N sessions per user.
    const keep = await db.RefreshToken.findAll({ where: { userId }, attributes: ['id'], order: [['id', 'DESC']], limit: limits.maxRefreshTokensPerUser });
    await db.RefreshToken.destroy({ where: { userId, id: { [Op.notIn]: keep.map((r) => r.id) } } });
    return token;
  }

  // Rotation: a used token is revoked; presenting a revoked one means theft, so every session of the user ends.
  async function rotateRefresh(token) {
    const row = await db.RefreshToken.findOne({ where: { tokenHash: sha256(token) } });
    if (!row) throw unauthorized('invalid_refresh', 'Invalid refresh token');
    const reject = () => unauthorized('invalid_refresh', 'Invalid refresh token');
    const revokeAll = () => db.RefreshToken.update({ revokedAt: new Date(now()) }, { where: { userId: row.userId, revokedAt: null } });
    // Every replay marks the token first, then ends all sessions: a winner still issuing its token sees the mark.
    const replay = async () => {
      await db.RefreshToken.update({ replayedAt: new Date(now()) }, { where: { id: row.id } });
      await revokeAll();
      throw reject();
    };
    if (row.revokedAt) await replay();
    if (row.expiresAt.getTime() <= now()) throw reject();
    // Conditional update: of several parallel uses of one token only one can win; the rest are replays.
    const [won] = await db.RefreshToken.update({ revokedAt: new Date(now()) }, { where: { id: row.id, revokedAt: null } });
    if (won !== 1) await replay();
    const refreshToken = await issueRefresh(row.userId);
    const replayed = await db.RefreshToken.count({ where: { id: row.id, replayedAt: { [Op.ne]: null } } });
    if (replayed) {
      await revokeAll();
      throw reject();
    }
    return { userId: row.userId, refreshToken };
  }

  async function revokeRefresh(token) {
    await db.RefreshToken.update({ revokedAt: new Date(now()) }, { where: { tokenHash: sha256(token), revokedAt: null } });
  }

  return { signAccess, verifyAccess, issueRefresh, rotateRefresh, revokeRefresh };
}

module.exports = { createTokens };
