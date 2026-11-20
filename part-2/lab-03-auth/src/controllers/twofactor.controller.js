const bcrypt = require('bcrypt');
const { unauthorized, conflict, tooManyRequests, badRequest } = require('../errors');
const { otpauthUrl } = require('../security/totp');

// Optional two-factor authentication. Setup stores an encrypted secret that is not active yet; enable proves that the
// authenticator app has it (one valid code) and returns the recovery codes once; disable needs the password and a code.
const createTwoFactorController = ({ User }, loginGuard, { secondFactor, audit }) => {
  const confirmPassword = async (req, user) => {
    const key = `pw|${req.ip}|u:${user.id}`;
    const wait = loginGuard.retryAfter(key);
    if (wait > 0) throw tooManyRequests('Too many wrong passwords, try again later', wait);
    if (!(await bcrypt.compare(req.password, user.passwordHash))) {
      loginGuard.fail(key);
      throw unauthorized('Invalid password');
    }
    loginGuard.succeed(key);
  };

  const codeGuard = (req, user) => {
    const key = `2fa|${req.ip}|u:${user.id}`;
    const wait = loginGuard.retryAfter(key);
    if (wait > 0) throw tooManyRequests('Too many wrong codes, try again later', wait);
    return key;
  };

  return {
    status: async (req, res) => {
      const user = await User.findByPk(req.user.id);
      res.json({ enabled: user.twoFactorEnabled, recoveryCodesLeft: user.twoFactorEnabled ? await secondFactor.remainingRecovery(user) : 0 });
    },

    setup: async (req, res, next) => {
      const user = await User.findByPk(req.user.id);
      if (user.twoFactorEnabled) return next(conflict('Two-factor authentication is already enabled'));
      await confirmPassword(req, user);
      const secret = await secondFactor.startSetup(user);
      await audit.record('2fa_setup_started', { userId: user.id, actorId: user.id, ip: req.ip });
      return res.status(201).json({ secret, otpauthUrl: otpauthUrl(secret, user.email), message: 'Add the secret to an authenticator app, then confirm with POST /auth/2fa/enable.' });
    },

    enable: async (req, res, next) => {
      const user = await User.findByPk(req.user.id);
      if (user.twoFactorEnabled) return next(conflict('Two-factor authentication is already enabled'));
      if (!user.twoFactorSecret) return next(badRequest('Start the setup first: POST /auth/2fa/setup'));
      const key = codeGuard(req, user);
      const recoveryCodes = await secondFactor.turnOn(user, req.code);
      if (!recoveryCodes) {
        loginGuard.fail(key);
        return next(unauthorized('Invalid code'));
      }
      loginGuard.succeed(key);
      await audit.record('2fa_enabled', { userId: user.id, actorId: user.id, ip: req.ip });
      return res.json({ enabled: true, recoveryCodes, message: 'Keep the recovery codes: each works once and they are not shown again.' });
    },

    disable: async (req, res, next) => {
      const user = await User.findByPk(req.user.id);
      if (!user.twoFactorEnabled) return next(conflict('Two-factor authentication is not enabled'));
      await confirmPassword(req, user);
      const key = codeGuard(req, user);
      if (!(await secondFactor.check(user, req.code))) {
        const locked = loginGuard.fail(key);
        await audit.record(locked ? 'account_locked' : '2fa_failed', { userId: user.id, ip: req.ip, detail: 'disable' });
        return next(unauthorized('Invalid code'));
      }
      loginGuard.succeed(key);
      await secondFactor.turnOff(user);
      await audit.record('2fa_disabled', { userId: user.id, actorId: user.id, ip: req.ip });
      return res.status(204).end();
    },
  };
};

module.exports = { createTwoFactorController };
