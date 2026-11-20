const { createHmac, randomBytes, timingSafeEqual } = require('node:crypto');

// TOTP (RFC 6238) over HOTP (RFC 4226) with HMAC-SHA1, 6 digits and a 30 second step: the setup every authenticator app supports.
const STEP_SECONDS = 30;
const DIGITS = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
};

const base32Decode = (text) => {
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of String(text).replace(/=+$/, '').toUpperCase()) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error('Invalid base32 text');
    value = ((value << 5) | index) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

const newSecret = () => base32Encode(randomBytes(20));

const hotp = (secret, counter) => {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', base32Decode(secret)).update(message).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return String(code).padStart(DIGITS, '0');
};

const stepOf = (timeMs) => Math.floor(timeMs / 1000 / STEP_SECONDS);
const totp = (secret, timeMs = Date.now()) => hotp(secret, stepOf(timeMs));

const sameText = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Returns the time step of the matching code, or undefined. The window accepts one step before and after for clock drift.
// afterStep is the last accepted step: a code of that step or of an earlier one is a replay and does not match.
const verifyTotp = (secret, code, { timeMs = Date.now(), window = 1, afterStep = -1 } = {}) => {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return undefined;
  const now = stepOf(timeMs);
  let found;
  // Every step is compared, so the time taken does not show which one matched.
  for (let step = now - window; step <= now + window; step += 1) {
    if (sameText(hotp(secret, step), code) && step > afterStep && found === undefined) found = step;
  }
  return found;
};

const otpauthUrl = (secret, account, issuer = 'DSLKit') =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;

module.exports = { newSecret, hotp, totp, verifyTotp, stepOf, base32Encode, base32Decode, otpauthUrl, STEP_SECONDS };
