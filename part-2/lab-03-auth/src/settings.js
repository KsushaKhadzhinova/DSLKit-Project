// Checks the security settings of the token before the app starts, so a weak setup fails at once instead of working quietly.
const MIN_SECRET_LENGTH = 32;
const MIN_DISTINCT_CHARACTERS = 8;
const MAX_LIFETIME_SECONDS = 24 * 60 * 60;
const ISSUER = 'dslkit';

const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 };

// Accepts 3600 or '3600' (seconds) and '15m', '1h', '1d'. Returns seconds.
const lifetimeSeconds = (value) => {
  const match = /^(\d+)([smhd]?)$/.exec(String(value).trim());
  if (!match) return NaN;
  return Number(match[1]) * UNIT_SECONDS[match[2] || 's'];
};

const checkJwtSettings = ({ jwtSecret, jwtExpiresIn }) => {
  if (!jwtSecret) throw new Error('jwtSecret is required');
  if (typeof jwtSecret !== 'string' || jwtSecret.length < MIN_SECRET_LENGTH || new Set(jwtSecret).size < MIN_DISTINCT_CHARACTERS) {
    throw new Error(`jwtSecret must be at least ${MIN_SECRET_LENGTH} characters and not a repeated pattern, generate it with crypto.randomBytes(48)`);
  }
  const seconds = lifetimeSeconds(jwtExpiresIn);
  if (!(seconds > 0) || seconds > MAX_LIFETIME_SECONDS) {
    throw new Error('jwtExpiresIn must be a number of seconds or a value like 15m, 1h, 1d, from 1 second up to 24 hours');
  }
  return seconds;
};

module.exports = { checkJwtSettings, lifetimeSeconds, ISSUER, MIN_SECRET_LENGTH, MAX_LIFETIME_SECONDS };
