import { writeRolesConfig } from './dev-code.js';

const [code, adminCode] = process.argv.slice(2);
if (!code || code.length < 8 || (adminCode !== undefined && adminCode.length < 8)) {
  console.error('Usage: npm run dev:code -- "<developer code, 8+ characters>" ["<admin code, 8+ characters>"]');
  process.exit(1);
}
writeRolesConfig('site/js/config/roles.js', code, adminCode);
console.log('site/js/config/roles.js is updated (without an admin code the admin role is locked)');
