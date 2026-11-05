import { writeRolesConfig } from './dev-code.js';

const code = process.argv[2];
if (!code || code.length < 8) {
  console.error('Usage: npm run dev:code -- "<code of at least 8 characters>"');
  process.exit(1);
}
writeRolesConfig('site/js/config/roles.js', code);
console.log('site/js/config/roles.js is updated');
