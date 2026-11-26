'use strict';
const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const { UniqueConstraintError } = require('sequelize');
const { validateBody } = require('./schema');
const { conflict, unauthorized, tooMany } = require('./errors');

const ownUser = (u) => ({ id: u.id, email: u.email, displayName: u.displayName, role: u.role });

function authRoutes({ config, db, tokens, now, limit, authenticate }) {
  const { limits } = config;
  const router = express.Router();
  // Compared against when the email is unknown, so timing does not reveal which emails exist.
  const dummyHash = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), config.bcryptRounds);
  const invalid = () => unauthorized('invalid_credentials', 'Wrong email or password');

  async function session(user) {
    const access = tokens.signAccess(user.id);
    return { user: ownUser(user), accessToken: access.token, expiresIn: access.expiresIn, refreshToken: await tokens.issueRefresh(user.id) };
  }

  router.post('/auth/register', limit({ name: 'register', max: limits.registerRateMax, windowMinutes: limits.registerRateWindowMinutes }), async (req, res) => {
    const input = validateBody(req.body, 'register');
    const taken = () => conflict('email_taken', 'This email is already registered');
    if (await db.User.findOne({ where: { email: input.email } })) throw taken();
    const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);
    let user;
    try {
      // The role is never taken from input: every self-registered account is a plain user.
      user = await db.User.create({ email: input.email, passwordHash, displayName: input.displayName, role: 'user' });
    } catch (err) {
      throw err instanceof UniqueConstraintError ? taken() : err;
    }
    res.status(201).json(await session(user));
  });

  router.post('/auth/login', limit({ name: 'login', max: limits.loginRateMax, windowMinutes: limits.loginRateWindowMinutes }), async (req, res) => {
    const input = validateBody(req.body, 'login');
    const user = await db.User.findOne({ where: { email: input.email.trim().toLowerCase() } });
    if (!user) {
      await bcrypt.compare(input.password, dummyHash);
      throw invalid();
    }
    const t = now();
    if (user.lockedUntil && user.lockedUntil.getTime() > t)
      throw tooMany('account_locked', 'Account is temporarily locked', Math.ceil((user.lockedUntil.getTime() - t) / 1000));
    if (!(await bcrypt.compare(input.password, user.passwordHash))) {
      const attempts = user.failedAttempts + 1;
      const lock = attempts >= limits.loginMaxAttempts;
      await user.update({ failedAttempts: lock ? 0 : attempts, lockedUntil: lock ? new Date(t + limits.loginLockMinutes * 60_000) : null });
      throw invalid();
    }
    if (user.failedAttempts || user.lockedUntil) await user.update({ failedAttempts: 0, lockedUntil: null });
    res.json(await session(user));
  });

  router.post('/auth/refresh', limit({ name: 'refresh', max: limits.refreshRateMax, windowMinutes: limits.refreshRateWindowMinutes }), async (req, res) => {
    const input = validateBody(req.body, 'token');
    const { userId, refreshToken } = await tokens.rotateRefresh(input.refreshToken);
    const user = await db.User.findByPk(userId);
    if (!user) throw unauthorized('invalid_refresh', 'Invalid refresh token');
    const access = tokens.signAccess(user.id);
    res.json({ user: ownUser(user), accessToken: access.token, expiresIn: access.expiresIn, refreshToken });
  });

  router.post('/auth/logout', async (req, res) => {
    await tokens.revokeRefresh(validateBody(req.body, 'token').refreshToken);
    res.status(204).end();
  });

  router.get('/me', authenticate, (req, res) => res.json({ user: ownUser(req.user) }));

  return router;
}

module.exports = { authRoutes, ownUser };
