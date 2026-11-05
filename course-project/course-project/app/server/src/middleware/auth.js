const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../errors');
const { ISSUER } = require('../settings');

const bearerToken = (req) => {
  const [scheme, token, ...rest] = (req.get('Authorization') || '').split(' ');
  return scheme === 'Bearer' && token && rest.length === 0 ? token : undefined;
};

// Verifies the Bearer token, then loads the user so a deleted account or a changed role takes effect at once.
// req.user holds { id, email, role } taken from the database, not from the token.
const createAuthenticate =
  ({ User }, { jwtSecret }) =>
  async (req, _res, next) => {
    const token = bearerToken(req);
    if (!token) return next(unauthorized('Missing Bearer token'));
    let payload;
    try {
      payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'], issuer: ISSUER });
    } catch (error) {
      return next(unauthorized(error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'));
    }
    // A signed token without a usable integer id cannot name a user; it is refused like any other bad token.
    if (!Number.isSafeInteger(payload.id)) return next(unauthorized('Invalid token'));
    const user = await User.findByPk(payload.id);
    if (!user) return next(unauthorized('User no longer exists'));
    req.user = { id: user.id, email: user.email, role: user.role };
    return next();
  };

const requireRole = (role) => (req, _res, next) => (req.user.role === role ? next() : next(forbidden(`Requires the ${role} role`)));

module.exports = { createAuthenticate, requireRole };
