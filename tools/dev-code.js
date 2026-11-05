import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

export const hashCode = (code) => createHash('sha256').update(String(code)).digest('hex');

export const writeRolesConfig = (file, code) => {
  const text = [
    '// The role "developer" is unlocked with a code; only the SHA-256 hash of the code is kept here.',
    '// Change it with: npm run dev:code -- "<new code>"',
    '// This is a client-side rule of a site without a server: it keeps the documentation from being edited by accident, it is not a protection against a determined visitor.',
    `export const DEVELOPER_CODE_SHA256 = '${hashCode(code)}';`,
    '',
  ].join('\n');
  writeFileSync(file, text);
  return text;
};
