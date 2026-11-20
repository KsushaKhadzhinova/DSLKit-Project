const { badRequest, unauthorized } = require('../errors');
const { PERMISSIONS } = require('../permissions');
const { passwordProblem } = require('../security/password-policy');
const LIMITS = require('../../limits.json');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// bcrypt ignores everything after the 72nd byte, so longer passwords would silently weaken (the policy refuses them).
const MAX_PASSWORD_BYTES = LIMITS.passwordMaxBytes;

const objectBody = (body) => body !== null && typeof body === 'object' && !Array.isArray(body);
const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : email);

// Control characters (NUL, tab, escape) are not part of an address; NUL also breaks the SQL text of a query.
const CONTROL = /[\u0000-\u001F\u007F]/;

const validEmail = (email) => typeof email === 'string' && email.length <= LIMITS.email && EMAIL.test(email) && !CONTROL.test(email);

const reject = (next, details) => next(badRequest('Invalid credentials data', details));

const validateRegistration = (req, _res, next) => {
  if (!objectBody(req.body)) return next(badRequest('Request body must be a JSON object'));
  const email = normalizeEmail(req.body.email);
  const details = [];
  if (!validEmail(email)) details.push({ field: 'email', message: 'must be a valid email address' });
  const problem = passwordProblem(req.body.password, { email });
  if (problem) details.push({ field: 'password', message: problem });
  if (details.length > 0) return reject(next, details);
  req.credentials = { email, password: req.body.password };
  return next();
};

// Login only needs the two values to exist; the rules above would leak which part of a wrong password is fine.
const validateLogin = (req, _res, next) => {
  if (!objectBody(req.body)) return next(badRequest('Request body must be a JSON object'));
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password.trim()) {
    return reject(next, [{ field: 'email, password', message: 'both are required strings' }]);
  }
  // A value longer than any stored one cannot match an account, so it gets the usual answer without hashing it.
  if (email.length > LIMITS.email || CONTROL.test(email) || Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
    return next(unauthorized('Invalid email or password'));
  }
  req.credentials = { email: normalizeEmail(email), password };
  return next();
};

const ROLE_NAME = /^[a-z][a-z0-9_-]{0,29}$/;

const validateRole = (req, _res, next) => {
  const role = objectBody(req.body) ? req.body.role : undefined;
  // Only the form is checked here; the controller looks the name up in the Roles table.
  if (typeof role !== 'string' || !ROLE_NAME.test(role)) return next(badRequest('Invalid role data', [{ field: 'role', message: 'must be the name of an existing role' }]));
  req.newRole = role;
  return next();
};

const text = (value, max) => typeof value === 'string' && value.trim() !== '' && value.length <= max;
const bad = (next, field, message) => next(badRequest('Invalid data', [{ field, message }]));

const validateRefreshToken = (req, _res, next) => {
  const refreshToken = objectBody(req.body) ? req.body.refreshToken : undefined;
  if (!text(refreshToken, 200)) return bad(next, 'refreshToken', 'must be a non-empty string');
  req.refreshToken = refreshToken;
  return next();
};

const validateChangePassword = (req, _res, next) => {
  if (!objectBody(req.body)) return next(badRequest('Request body must be a JSON object'));
  const { currentPassword, newPassword } = req.body;
  if (!text(currentPassword, 1000)) return bad(next, 'currentPassword', 'must be a non-empty string');
  const problem = passwordProblem(newPassword, { email: req.user.email });
  if (problem) return bad(next, 'newPassword', problem);
  if (newPassword === currentPassword) return bad(next, 'newPassword', 'must differ from the current password');
  return next();
};

const validateResetRequest = (req, _res, next) => {
  const email = objectBody(req.body) ? normalizeEmail(req.body.email) : undefined;
  // A value that cannot be an address still gets the neutral answer, not a hint, so only the form is checked.
  if (!validEmail(email)) return bad(next, 'email', 'must be a valid email address');
  req.resetEmail = email;
  return next();
};

const validateResetConfirm = (req, _res, next) => {
  if (!objectBody(req.body)) return next(badRequest('Request body must be a JSON object'));
  const { token } = req.body;
  if (!text(token, 200)) return bad(next, 'token', 'must be a non-empty string');
  req.resetToken = token;
  req.newPassword = req.body.newPassword;
  return next();
};

// A TOTP code is six digits, a recovery code is letters, digits and a dash; both are short.
const validateCode = (req, _res, next) => {
  const code = objectBody(req.body) ? req.body.code : undefined;
  if (!text(code, 32)) return bad(next, 'code', 'must be a non-empty string');
  req.code = code.trim();
  return next();
};

const validatePasswordField = (req, _res, next) => {
  const password = objectBody(req.body) ? req.body.password : undefined;
  if (!text(password, 1000)) return bad(next, 'password', 'must be a non-empty string');
  req.password = password;
  return next();
};

const validateChallenge = (req, _res, next) => {
  const challengeToken = objectBody(req.body) ? req.body.challengeToken : undefined;
  if (!text(challengeToken, 2000)) return bad(next, 'challengeToken', 'must be a non-empty string');
  req.challengeToken = challengeToken;
  return validateCode(req, _res, next);
};

// A custom role: a name, a short description and a list of known permissions without repeats.
const validateNewRole = (req, _res, next) => {
  if (!objectBody(req.body)) return next(badRequest('Request body must be a JSON object'));
  const { name, description = '', permissions } = req.body;
  const details = [];
  if (typeof name !== 'string' || !ROLE_NAME.test(name)) details.push({ field: 'name', message: 'must be 1 to 30 characters: a lower case letter, then letters, digits, - or _' });
  if (typeof description !== 'string' || description.length > 200 || CONTROL.test(description)) details.push({ field: 'description', message: 'must be text of at most 200 characters' });
  if (!Array.isArray(permissions) || permissions.length > Object.keys(PERMISSIONS).length) details.push({ field: 'permissions', message: 'must be a list of permission names' });
  else {
    const unknown = permissions.filter((permission) => typeof permission !== 'string' || !(permission in PERMISSIONS));
    if (unknown.length > 0) details.push({ field: 'permissions', message: 'unknown permission in the list' });
    else if (new Set(permissions).size !== permissions.length) details.push({ field: 'permissions', message: 'must not repeat a permission' });
  }
  if (details.length > 0) return next(badRequest('Invalid role data', details));
  req.newRoleData = { name, description, permissions };
  return next();
};

module.exports = { validateNewRole, validateRegistration, validateLogin, validateRole, validateRefreshToken, validateChangePassword, validateResetRequest, validateResetConfirm, validateCode, validatePasswordField, validateChallenge };
