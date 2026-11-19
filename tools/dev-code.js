import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const ROUNDS = 100000;

// A salted PBKDF2-SHA-256 record "p1$rounds$salt$hash" (the format of site/js/auth/role-code.js).
export const hashCode = (code, salt = randomBytes(16)) =>
  `p1$${ROUNDS}$${salt.toString('hex')}$${pbkdf2Sync(String(code), salt, ROUNDS, 32, 'sha256').toString('hex')}`;

export const writeRolesConfig = (file, code, adminCode) => {
  const text = [
    '// The role "developer" is unlocked with a code; only a salted PBKDF2-SHA-256 record of the code is kept here (see auth/role-code.js).',
    '// Change it with: npm run dev:code -- "<new code>"',
    '// This is a client-side rule of a site without a server: it keeps the documentation from being edited by accident, it is not a protection against a determined visitor.',
    `export const DEVELOPER_CODE_VERIFIER = '${hashCode(code)}';`,
    '// The role "admin" has no daily limit of diagrams, like the developer; the same kind of record.',
    `export const ADMIN_CODE_VERIFIER = '${hashCode(adminCode ?? randomBytes(16).toString('hex'))}';`,
    '',
  ].join('\n');
  writeFileSync(file, text);
  return text;
};
