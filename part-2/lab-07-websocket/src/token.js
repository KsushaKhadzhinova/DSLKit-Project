const crypto = require('node:crypto');

// A small signed token: base64url(payload).base64url(HMAC-SHA256). The payload holds the user name
// (`sub`) and the expiry time (`exp`, seconds). It is enough for this lab; a real service would use JWT.
const sign = (body, secret) => crypto.createHmac('sha256', secret).update(body).digest('base64url');

const issueToken = (username, secret, { ttlSeconds = 3600, now = Date.now } = {}) => {
  const body = Buffer.from(JSON.stringify({ sub: username, exp: Math.floor(now() / 1000) + ttlSeconds })).toString('base64url');
  return `${body}.${sign(body, secret)}`;
};

// Returns the user name, or null for anything that is not a valid, unexpired token made with this secret.
const verifyToken = (token, secret, { now = Date.now } = {}) => {
  if (typeof token !== 'string' || token.length > 1000) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return typeof sub === 'string' && Number.isFinite(exp) && exp > Math.floor(now() / 1000) ? sub : null;
  } catch {
    return null;
  }
};

module.exports = { issueToken, verifyToken };
