// One-time codes of an authenticator application: TOTP of RFC 6238 over HOTP of RFC 4226, HMAC-SHA-1, 30 seconds, 6 digits.
// Only the Web Crypto API is used, there is no dependency. The functions take `crypto` so that a test can pass its own.
import { same, toHex } from './bytes.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const STEP_SECONDS = 30;
export const DIGITS = 6;
const SECRET_BYTES = 20;

// RFC 4648 base32 without padding: the form in which authenticator applications take a secret.
export const base32Encode = (bytes) => {
  let bits = '';
  bytes.forEach((byte) => (bits += byte.toString(2).padStart(8, '0')));
  return (bits.match(/.{1,5}/g) ?? []).map((chunk) => ALPHABET[Number.parseInt(chunk.padEnd(5, '0'), 2)]).join('');
};

// Spaces, dashes and the case are ignored; null for a text with other characters.
export const base32Decode = (text) => {
  const clean = String(text).replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase();
  if (clean === '' || [...clean].some((char) => !ALPHABET.includes(char))) return null;
  const bits = [...clean].map((char) => ALPHABET.indexOf(char).toString(2).padStart(5, '0')).join('');
  return Uint8Array.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)));
};

export const generateSecret = (crypto = globalThis.crypto) => base32Encode(crypto.getRandomValues(new Uint8Array(SECRET_BYTES)));

// HOTP: HMAC-SHA-1 of the 8-byte counter, then the dynamic truncation of section 5.3 of RFC 4226.
export const hotp = async (secret, counter, crypto = globalThis.crypto) => {
  const key = await crypto.subtle.importKey('raw', base32Decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const message = new DataView(new ArrayBuffer(8));
  message.setBigUint64(0, BigInt(counter));
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, message.buffer));
  const offset = mac[mac.length - 1] & 0x0f;
  const binary = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
};

export const stepOf = (ms) => Math.floor(ms / 1000 / STEP_SECONDS);

export const totp = (secret, ms, crypto = globalThis.crypto) => hotp(secret, stepOf(ms), crypto);

// The step of the code when it is right within `skew` steps of the time, and later than `lastStep` (a code is used once); otherwise null.
// Every step of the window is computed and compared, so the time of the check does not tell which step matched.
export const verifyTotp = async (secret, code, { ms, skew = 1, lastStep = -1, crypto = globalThis.crypto } = {}) => {
  const given = String(code).replace(/\s+/g, '');
  if (!/^\d{6}$/.test(given) || base32Decode(secret) === null) return null;
  const now = stepOf(ms);
  let found = null;
  for (let step = now - skew; step <= now + skew; step += 1) {
    const expected = await hotp(secret, step, crypto);
    if (same(expected, given) && step > lastStep) found = step;
  }
  return found;
};

// The address that an authenticator reads from a QR code or accepts as a link.
export const otpauthUri = ({ issuer, account, secret }) => {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
};

// A recovery code is 10 characters of base32 in two groups: 50 bits, shown once.
export const generateRecoveryCodes = (count, crypto = globalThis.crypto) =>
  Array.from({ length: count }, () => {
    const text = base32Encode(crypto.getRandomValues(new Uint8Array(7))).slice(0, 10);
    return `${text.slice(0, 5)}-${text.slice(5)}`;
  });

export const normalizeRecoveryCode = (code) => String(code).replace(/[\s-]/g, '').toUpperCase();

// Recovery codes are kept as SHA-256 of the account id and the code. The codes have 50 random bits, so a slow hash is not needed.
export const hashRecoveryCode = async (accountId, code, crypto = globalThis.crypto) =>
  toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${accountId}:${normalizeRecoveryCode(code)}`)));
