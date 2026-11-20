const { randomBytes } = require('node:crypto');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { unauthorized } = require('../errors');
const { createBox, sha256 } = require('../security/crypto-box');
const { newSecret, verifyTotp } = require('../security/totp');
const { ISSUER, CHALLENGE_AUDIENCE, CLOCK_TOLERANCE_SECONDS } = require('../settings');

const RECOVERY_COUNT = 8;
const normalizeRecovery = (code) => String(code).trim().toLowerCase().replace(/\s+/g, '');
const newRecoveryCode = () => {
  const hex = randomBytes(5).toString('hex');
  return `${hex.slice(0, 5)}-${hex.slice(5)}`;
};

// Everything about the second factor that is not HTTP: the encrypted secret, the replay rule and the recovery codes.
const createSecondFactor = ({ User, RecoveryCode }, { jwtSecret, twoFactorKey, twoFactorChallengeMs }) => {
  const box = createBox(twoFactorKey || jwtSecret, twoFactorKey ? 'dslkit-2fa-secret-v1' : 'dslkit-2fa-secret-from-jwt-v1');

  const startSetup = async (user) => {
    const secret = newSecret();
    await user.update({ twoFactorSecret: box.seal(secret), twoFactorEnabled: false, twoFactorLastStep: null });
    return secret;
  };

  const pendingSecret = (user) => (user.twoFactorSecret ? box.open(user.twoFactorSecret) : undefined);

  // A code of a time step that was already accepted does not work again. The step is claimed with one conditional update,
  // so two requests with the same code cannot both pass.
  const acceptTotp = async (user, code, window) => {
    const step = verifyTotp(pendingSecret(user), code, { afterStep: user.twoFactorLastStep ?? -1, window });
    if (step === undefined) return false;
    const [claimed] = await User.update({ twoFactorLastStep: step }, { where: { id: user.id, [Op.or]: [{ twoFactorLastStep: null }, { twoFactorLastStep: { [Op.lt]: step } }] } });
    if (claimed === 0) return false;
    user.dataValues.twoFactorLastStep = step;
    return true;
  };

  const acceptRecovery = async (user, code) => {
    const [used] = await RecoveryCode.update({ usedAt: new Date() }, { where: { userId: user.id, codeHash: sha256(normalizeRecovery(code)), usedAt: null } });
    return used === 1;
  };

  // Returns 'totp', 'recovery' or undefined.
  const check = async (user, code) => {
    if (!user.twoFactorSecret) return undefined;
    if (/^\d{6}$/.test(code)) return (await acceptTotp(user, code, 1)) ? 'totp' : undefined;
    return (await acceptRecovery(user, code)) ? 'recovery' : undefined;
  };

  const turnOn = async (user, code) => {
    if (!(await acceptTotp(user, code, 1))) return undefined;
    const codes = Array.from({ length: RECOVERY_COUNT }, newRecoveryCode);
    await RecoveryCode.destroy({ where: { userId: user.id } });
    await RecoveryCode.bulkCreate(codes.map((plain) => ({ userId: user.id, codeHash: sha256(plain) })));
    await user.update({ twoFactorEnabled: true });
    return codes;
  };

  const turnOff = async (user) => {
    await RecoveryCode.destroy({ where: { userId: user.id } });
    await user.update({ twoFactorEnabled: false, twoFactorSecret: null, twoFactorLastStep: null });
  };

  const remainingRecovery = (user) => RecoveryCode.count({ where: { userId: user.id, usedAt: null } });

  const signChallenge = (user) =>
    jwt.sign({ purpose: '2fa' }, jwtSecret, { algorithm: 'HS256', expiresIn: Math.round(twoFactorChallengeMs / 1000), issuer: ISSUER, audience: CHALLENGE_AUDIENCE, subject: String(user.id) });

  const verifyChallenge = (token) => {
    try {
      const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'], issuer: ISSUER, audience: CHALLENGE_AUDIENCE, clockTolerance: CLOCK_TOLERANCE_SECONDS });
      const id = Number(payload.sub);
      if (payload.purpose !== '2fa' || !Number.isSafeInteger(id)) throw new Error('bad purpose');
      return id;
    } catch {
      throw unauthorized('Invalid or expired challenge');
    }
  };

  return { startSetup, pendingSecret, check, turnOn, turnOff, remainingRecovery, signChallenge, verifyChallenge };
};

module.exports = { createSecondFactor, RECOVERY_COUNT };
