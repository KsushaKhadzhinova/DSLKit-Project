const { badRequest } = require('../errors');
const { ROLES } = require('../models/user');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
// bcrypt ignores everything after the 72nd byte, so longer passwords would silently weaken.
const MAX_PASSWORD_BYTES = 72;

const objectBody = (body) => body !== null && typeof body === 'object' && !Array.isArray(body);
const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : email);

const validEmail = (email) => typeof email === 'string' && email.length <= 254 && EMAIL.test(email);

const passwordProblem = (password) => {
  if (typeof password !== 'string') return 'must be a string';
  if (password.length < MIN_PASSWORD) return `must be at least ${MIN_PASSWORD} characters`;
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) return `must be at most ${MAX_PASSWORD_BYTES} bytes`;
  return undefined;
};

const reject = (next, details) => next(badRequest('Invalid credentials data', details));

const validateRegistration = (req, _res, next) => {
  if (!objectBody(req.body)) return next(badRequest('Request body must be a JSON object'));
  const email = normalizeEmail(req.body.email);
  const details = [];
  if (!validEmail(email)) details.push({ field: 'email', message: 'must be a valid email address' });
  const problem = passwordProblem(req.body.password);
  if (problem) details.push({ field: 'password', message: problem });
  if (details.length > 0) return reject(next, details);
  req.credentials = { email, password: req.body.password };
  return next();
};

// Login only needs the two values to exist; the rules above would leak which part of a wrong password is fine.
const validateLogin = (req, _res, next) => {
  if (!objectBody(req.body)) return next(badRequest('Request body must be a JSON object'));
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return reject(next, [{ field: 'email, password', message: 'both are required strings' }]);
  }
  req.credentials = { email: normalizeEmail(email), password };
  return next();
};

const validateRole = (req, _res, next) => {
  const role = objectBody(req.body) ? req.body.role : undefined;
  if (!ROLES.includes(role)) return next(badRequest('Invalid role data', [{ field: 'role', message: `must be one of ${ROLES.join(', ')}` }]));
  req.newRole = role;
  return next();
};

module.exports = { validateRegistration, validateLogin, validateRole };
