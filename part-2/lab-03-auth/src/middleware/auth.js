const { unauthorized } = require('../errors');

const bearerToken = (req) => {
  const [scheme, token, ...rest] = (req.get('Authorization') || '').split(' ');
  return scheme === 'Bearer' && token && rest.length === 0 ? token : undefined;
};

// Verifies the Bearer token (HS256 only, issuer and audience checked, 5 seconds of clock tolerance), then loads the user so a
// deleted account or a changed role takes effect at once. A token issued at login carries the id of its session (sid); once that
// session is revoked (logout, password change, reuse of a refresh token) the access token stops working before it expires.
// req.user holds { id, email, role, permissions, sessionId } taken from the database, not from the token.
const createAuthenticate =
  ({ User }, tokens) =>
  async (req, _res, next) => {
    const token = bearerToken(req);
    if (!token) return next(unauthorized('Missing Bearer token'));
    let payload;
    try {
      payload = tokens.verifyAccess(token);
    } catch (error) {
      return next(unauthorized(error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'));
    }
    // A signed token without a usable integer id cannot name a user; it is refused like any other bad token.
    if (!Number.isSafeInteger(payload.id)) return next(unauthorized('Invalid token'));
    if (payload.sid !== undefined && typeof payload.sid !== 'string') return next(unauthorized('Invalid token'));
    const user = await User.findByPk(payload.id);
    if (!user) return next(unauthorized('User no longer exists'));
    if (payload.sid && !(await tokens.isActive(user.id, payload.sid))) return next(unauthorized('Session was ended'));
    req.user = { id: user.id, email: user.email, role: user.role, permissions: user.permissionList(), sessionId: payload.sid };
    return next();
  };

module.exports = { createAuthenticate };
