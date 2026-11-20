const { randomBytes } = require('node:crypto');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { unauthorized, conflict, tooManyRequests, badRequest, notFound } = require('../errors');
const { sha256 } = require('../security/crypto-box');
const { passwordProblem } = require('../security/password-policy');
const LIMITS = require('../../limits.json');

const MINUTE = 60 * 1000;
const ctxOf = (req) => ({ ip: req.ip ?? 'unknown', userAgent: req.get('User-Agent'), label: typeof req.body?.deviceName === 'string' ? req.body.deviceName.slice(0, 80) : undefined });

// Keys of the failure counter: the login uses address and email; the other checks use the account id, so an administrator can lift them all.
const loginKey = (req, email) => `${req.ip}|${email}`;
const accountKey = (kind, req, user) => `${kind}|${req.ip}|u:${user.id}`;

const createAuthController = (models, config, loginGuard, { tokens, secondFactor, audit, mailer }) => {
  const { User, PasswordReset } = models;
  const { bcryptRounds } = config;
  // Compared when the email is unknown, so a missing account costs the same time as a wrong password.
  const dummyHash = bcrypt.hashSync('not-a-real-password', bcryptRounds);

  const sessionAnswer = (session) => ({
    token: session.accessToken,
    accessToken: session.accessToken,
    tokenType: 'Bearer',
    expiresIn: config.jwtExpiresIn,
    refreshToken: session.refreshToken,
    refreshExpiresAt: session.refreshExpiresAt,
    sessionId: session.sessionId,
  });

  const openSession = async (user, req, res, how) => {
    const session = await tokens.startSession(user, ctxOf(req));
    await audit.record('login_success', { userId: user.id, actorId: user.id, ip: req.ip, detail: how });
    return res.json(sessionAnswer(session));
  };

  // Checks the current password with the same failure counter as the login, so a stolen access token cannot be used to guess it.
  const confirmPassword = async (req, user, password) => {
    const key = accountKey('pw', req, user);
    const wait = loginGuard.retryAfter(key);
    if (wait > 0) throw tooManyRequests('Too many wrong passwords, try again later', wait);
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      if (loginGuard.fail(key)) await audit.record('account_locked', { userId: user.id, ip: req.ip, detail: 'password confirmation' });
      throw unauthorized('Invalid password');
    }
    loginGuard.succeed(key);
  };

  return {
    register: async (req, res, next) => {
      const { email, password } = req.credentials;
      const passwordHash = await bcrypt.hash(password, bcryptRounds);
      try {
        const user = await User.create({ email, passwordHash, passwordChangedAt: new Date() });
        await audit.record('register', { userId: user.id, actorId: user.id, ip: req.ip });
        res.status(201).location('/profile').json(user.toPublic());
      } catch (error) {
        if (error.name !== 'SequelizeUniqueConstraintError') throw error;
        next(conflict('A user with this email already exists'));
      }
    },

    login: async (req, res, next) => {
      const { email, password } = req.credentials;
      // A locked email is refused before the password is looked at, so guessing cannot continue and the answer does not depend on the account.
      // The counter is kept per address and email: someone elsewhere cannot lock the account of the real owner.
      const guardKey = loginKey(req, email);
      const wait = loginGuard.retryAfter(guardKey);
      if (wait > 0) return next(tooManyRequests('Too many failed logins, try again later', wait));
      const user = await User.findOne({ where: { email } });
      const matches = await bcrypt.compare(password, user ? user.passwordHash : dummyHash);
      if (!user || !matches) {
        const locked = loginGuard.fail(guardKey);
        await audit.record(locked ? 'account_locked' : 'login_failed', { userId: user?.id, ip: req.ip, detail: user ? '' : 'unknown email' });
        return next(unauthorized('Invalid email or password'));
      }
      loginGuard.succeed(guardKey);
      if (user.twoFactorEnabled) {
        await audit.record('login_2fa_challenge', { userId: user.id, ip: req.ip });
        return res.json({ twoFactorRequired: true, challengeToken: secondFactor.signChallenge(user), expiresIn: `${LIMITS.twoFactorChallengeMinutes}m` });
      }
      return openSession(user, req, res, 'password');
    },

    // Second step of a login with two-factor authentication: the challenge from the login plus a TOTP or a recovery code.
    verifyTwoFactor: async (req, res, next) => {
      const user = await User.findByPk(secondFactor.verifyChallenge(req.challengeToken));
      if (!user || !user.twoFactorEnabled) return next(unauthorized('Invalid or expired challenge'));
      const key = accountKey('2fa', req, user);
      const wait = loginGuard.retryAfter(key);
      if (wait > 0) return next(tooManyRequests('Too many wrong codes, try again later', wait));
      const kind = await secondFactor.check(user, req.code);
      if (!kind) {
        const locked = loginGuard.fail(key);
        await audit.record(locked ? 'account_locked' : '2fa_failed', { userId: user.id, ip: req.ip, detail: 'login' });
        return next(unauthorized('Invalid code'));
      }
      loginGuard.succeed(key);
      return openSession(user, req, res, kind === 'recovery' ? '2fa recovery code' : '2fa');
    },

    refresh: async (req, res, next) => {
      const result = await tokens.rotate(req.refreshToken, ctxOf(req));
      if (result.reused) {
        await audit.record('refresh_reuse', { userId: result.userId, ip: req.ip, detail: 'session family revoked' });
        return next(unauthorized('Invalid refresh token'));
      }
      await audit.record('token_refreshed', { userId: result.user.id, ip: req.ip });
      return res.json(sessionAnswer(result));
    },

    // Always 204: the answer does not tell whether the token existed.
    logout: async (req, res) => {
      const row = await tokens.familyOf(req.refreshToken);
      if (row) {
        await tokens.revokeFamily(row.familyId);
        await audit.record('logout', { userId: row.userId, ip: req.ip });
      }
      res.status(204).end();
    },

    logoutAll: async (req, res) => {
      const count = await tokens.revokeAll(req.user.id);
      await audit.record('logout_all', { userId: req.user.id, actorId: req.user.id, ip: req.ip, detail: `${count} tokens` });
      res.status(204).end();
    },

    sessions: async (req, res) => res.json(await tokens.listSessions(req.user.id, req.user.sessionId)),

    // The id belongs to the caller or the session does not exist: another user's session id gets the same 404.
    revokeSession: async (req, res, next) => {
      const count = await tokens.revokeFamily(req.params.id, req.user.id);
      if (count === 0) return next(notFound('Session not found'));
      await audit.record('session_revoked', { userId: req.user.id, actorId: req.user.id, ip: req.ip });
      return res.status(204).end();
    },

    changePassword: async (req, res) => {
      const user = await User.findByPk(req.user.id);
      await confirmPassword(req, user, req.body.currentPassword);
      const passwordHash = await bcrypt.hash(req.body.newPassword, bcryptRounds);
      await user.update({ passwordHash, passwordChangedAt: new Date() });
      // Every other device has to log in again with the new password; the session that made the change stays.
      const count = await tokens.revokeAll(user.id, req.user.sessionId);
      await audit.record('password_changed', { userId: user.id, actorId: user.id, ip: req.ip, detail: `${count} other tokens revoked` });
      return res.status(204).end();
    },

    // The answer is the same for a known and an unknown address, and the same work is done, so neither the text nor the time shows which exist.
    requestPasswordReset: async (req, res) => {
      const user = await User.findOne({ where: { email: req.resetEmail } });
      const plain = randomBytes(32).toString('base64url');
      const tokenHash = sha256(plain);
      // An unknown address runs a query of the same shape, so the time is alike.
      const recent = user ? await PasswordReset.count({ where: { userId: user.id, usedAt: null, createdAt: { [Op.gt]: new Date(Date.now() - MINUTE) } } }) : await PasswordReset.count({ where: { id: 0 } });
      if (user && recent === 0) {
        await PasswordReset.create({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + LIMITS.resetTokenMinutes * MINUTE) });
        await audit.record('password_reset_requested', { userId: user.id, ip: req.ip });
        // Not awaited: a slow mail server must not make a known address slower than an unknown one.
        Promise.resolve(
          mailer({
            to: user.email,
            subject: 'DSLKit password reset',
            text: `Reset token (valid ${LIMITS.resetTokenMinutes} minutes, use it once): ${plain}\nSend it with the new password to POST /auth/password-reset/confirm.`,
          }),
        ).catch((error) => console.error('Cannot send the reset mail:', error.message));
      } else {
        await audit.record('password_reset_requested', { ip: req.ip, detail: user ? 'throttled' : 'unknown email' });
      }
      res.status(202).json({ message: 'If this address has an account, a reset message was sent.' });
    },

    confirmPasswordReset: async (req, res, next) => {
      const row = await PasswordReset.findOne({ where: { tokenHash: sha256(req.resetToken), usedAt: null, expiresAt: { [Op.gt]: new Date() } } });
      if (!row) return next(badRequest('Invalid or expired reset token'));
      const user = await User.findByPk(row.userId);
      const problem = passwordProblem(req.newPassword, { email: user.email });
      if (problem) return next(badRequest('Invalid password', [{ field: 'newPassword', message: problem }]));
      // The token is claimed first with one conditional update, so it works once even for two parallel requests.
      const [claimed] = await PasswordReset.update({ usedAt: new Date() }, { where: { id: row.id, usedAt: null } });
      if (claimed === 0) return next(badRequest('Invalid or expired reset token'));
      await PasswordReset.update({ usedAt: new Date() }, { where: { userId: user.id, usedAt: null } });
      await user.update({ passwordHash: await bcrypt.hash(req.newPassword, bcryptRounds), passwordChangedAt: new Date() });
      await tokens.revokeAll(user.id);
      loginGuard.clearWhere((name) => name.endsWith(`|${user.email}`));
      await audit.record('password_reset_done', { userId: user.id, ip: req.ip });
      return res.status(204).end();
    },

  };
};

module.exports = { createAuthController };
