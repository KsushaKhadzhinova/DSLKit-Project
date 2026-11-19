// The code of a role is kept as a salted PBKDF2-SHA-256 record with the parameters of the passwords (100000 rounds, 16 byte salt):
//   "p1$<rounds>$<salt hex>$<hash hex>"   PBKDF2 of the code itself (written by `npm run dev:code`)
//   "p1s$<rounds>$<salt hex>$<hash hex>"  PBKDF2 of the hex SHA-256 of the code (the old unsalted hash, wrapped without knowing the code)
import { HEX, fromHex, same, toHex } from './bytes.js';

const encode = (text) => new TextEncoder().encode(text);

export const checkRoleCode = async (crypto, code, record) => {
  const [kind, rounds, salt, hash] = String(record).split('$');
  const iterations = Number(rounds);
  if ((kind !== 'p1' && kind !== 'p1s') || !Number.isInteger(iterations) || iterations < 1 || !HEX.test(salt ?? '') || !HEX.test(hash ?? '')) return false;
  const secret = kind === 'p1s' ? toHex(await crypto.subtle.digest('SHA-256', encode(String(code)))) : String(code);
  const key = await crypto.subtle.importKey('raw', encode(secret), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(salt), iterations }, key, 256);
  return same(toHex(bits), hash);
};
