const { randomBytes, randomUUID } = require('node:crypto');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { unauthorized } = require('../errors');
const { sha256 } = require('../security/crypto-box');
const { ISSUER, AUDIENCE, CLOCK_TOLERANCE_SECONDS } = require('../settings');
const LIMITS = require('../../limits.json');

const DAY = 24 * 60 * 60 * 1000;
const clean = (text, max) =>
  String(text ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, '?')
    .trim()
    .slice(0, max);

// Access tokens are short JWTs; refresh tokens are opaque random strings, stored only as a hash, used once and replaced on every refresh.
// All the tokens of one login form a family (its id is the session id). Presenting a token that was already used means a copy exists,
// so the whole family is revoked and both the thief and the owner have to log in again.
const createTokenService = ({ User, RefreshToken }, { jwtSecret, jwtExpiresIn, refreshTtlMs, sessionMaxMs, maxSessions }, now = Date.now) => {
  const signAccess = (user, sid) =>
    jwt.sign({ id: user.id, email: user.email, role: user.role, sid }, jwtSecret, {
      algorithm: 'HS256',
      expiresIn: jwtExpiresIn,
      issuer: ISSUER,
      audience: AUDIENCE,
      subject: String(user.id),
    });

  const verifyAccess = (token) => jwt.verify(token, jwtSecret, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE, clockTolerance: CLOCK_TOLERANCE_SECONDS });

  const describe = (ctx) => ({ label: clean(ctx.label || ctx.userAgent || 'unknown device', 120), ip: clean(ctx.ip, 64) });

  const issueRefresh = async (user, familyId, familyStartedAt, ctx) => {
    const plain = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Math.min(now() + refreshTtlMs, familyStartedAt.getTime() + sessionMaxMs));
    await RefreshToken.create({ userId: user.id, familyId, tokenHash: sha256(plain), familyStartedAt, expiresAt, ...describe(ctx) });
    return { plain, expiresAt };
  };

  const revokeFamily = async (familyId, userId) => {
    const where = { familyId, revokedAt: null };
    if (userId !== undefined) where.userId = userId;
    const [count] = await RefreshToken.update({ revokedAt: new Date(now()) }, { where });
    return count;
  };

  // Revokes every family of the user, except one (the current session when the password is changed).
  const revokeAll = async (userId, exceptFamilyId) => {
    const where = { userId, revokedAt: null };
    if (exceptFamilyId) where.familyId = { [Op.ne]: exceptFamilyId };
    const [count] = await RefreshToken.update({ revokedAt: new Date(now()) }, { where });
    return count;
  };

  const activeHeads = (where) => ({ where: { ...where, usedAt: null, revokedAt: null, expiresAt: { [Op.gt]: new Date(now()) } } });

  const startSession = async (user, ctx) => {
    // The oldest sessions beyond the limit are closed, so one account cannot collect unlimited refresh tokens.
    const heads = await RefreshToken.findAll({ ...activeHeads({ userId: user.id }), order: [['familyStartedAt', 'DESC'], ['id', 'DESC']] });
    for (const old of heads.slice(Math.max(maxSessions - 1, 0))) await revokeFamily(old.familyId, user.id);
    const familyId = randomUUID();
    const startedAt = new Date(now());
    const refresh = await issueRefresh(user, familyId, startedAt, ctx);
    return { accessToken: signAccess(user, familyId), refreshToken: refresh.plain, refreshExpiresAt: refresh.expiresAt, sessionId: familyId };
  };

  // Exchanges a refresh token for a new pair. Returns { reused: true, userId, familyId } when a used token was shown again.
  const rotate = async (plain, ctx) => {
    const row = typeof plain === 'string' && plain.length >= 20 && plain.length <= 200 ? await RefreshToken.findOne({ where: { tokenHash: sha256(plain) } }) : null;
    if (!row || row.revokedAt || row.expiresAt.getTime() <= now()) throw unauthorized('Invalid refresh token');
    // The token is claimed with one conditional update, so two requests with the same token cannot both succeed.
    const [claimed] = await RefreshToken.update({ usedAt: new Date(now()) }, { where: { id: row.id, usedAt: null } });
    if (claimed === 0) {
      await revokeFamily(row.familyId);
      return { reused: true, userId: row.userId, familyId: row.familyId };
    }
    const user = await User.findByPk(row.userId);
    if (!user) throw unauthorized('Invalid refresh token');
    const refresh = await issueRefresh(user, row.familyId, row.familyStartedAt, { label: row.label, ip: ctx.ip, userAgent: ctx.userAgent });
    return { user, accessToken: signAccess(user, row.familyId), refreshToken: refresh.plain, refreshExpiresAt: refresh.expiresAt, sessionId: row.familyId };
  };

  const familyOf = async (plain) => (typeof plain === 'string' && plain.length <= 200 ? RefreshToken.findOne({ where: { tokenHash: sha256(plain) } }) : null);

  const listSessions = async (userId, currentId) => {
    const heads = await RefreshToken.findAll({ ...activeHeads({ userId }), order: [['familyStartedAt', 'DESC'], ['id', 'DESC']] });
    return heads.map((row) => ({
      id: row.familyId,
      device: row.label,
      ip: row.ip,
      createdAt: row.familyStartedAt,
      lastRefreshedAt: row.createdAt,
      expiresAt: row.expiresAt,
      current: row.familyId === currentId,
    }));
  };

  const isActive = async (userId, familyId) => (await RefreshToken.count({ where: { userId, familyId, revokedAt: null } })) > 0;

  return { signAccess, verifyAccess, startSession, rotate, revokeFamily, revokeAll, listSessions, isActive, familyOf };
};

const refreshSettings = () => ({ refreshTtlMs: LIMITS.refreshTokenDays * DAY, sessionMaxMs: LIMITS.sessionMaxDays * DAY, maxSessions: LIMITS.maxSessionsPerUser });

module.exports = { createTokenService, refreshSettings };
