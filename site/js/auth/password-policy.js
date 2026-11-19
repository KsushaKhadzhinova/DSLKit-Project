// The password policy: the rules that refuse a password and the strength that the meter shows.
// The list is a small bundled sample of the most used passwords, not a full database of leaked ones: a server would check the full list.
export const MIN_LENGTH = 8;
export const MAX_LENGTH = 128;

export const COMMON_PASSWORDS = new Set(
  [
    'password',
    'passw0rd',
    'p@ssw0rd',
    'qwerty',
    'qwertyuiop',
    'qwerty123',
    'qwertyui',
    'asdfghjk',
    'asdfghjkl',
    'zxcvbnm',
    'йцукенгш',
    'йцукен',
    '12345678',
    '123456789',
    '1234567890',
    '87654321',
    '11111111',
    '00000000',
    'abc12345',
    'abcd1234',
    'iloveyou',
    'letmein',
    'welcome',
    'welcome1',
    'admin123',
    'administrator',
    'changeme',
    'trustno1',
    'monkey123',
    'dragon123',
    'football',
    'baseball',
    'superman',
    'princess',
    'sunshine',
    'master123',
    'login123',
    'whatever',
    'starwars',
    'shadow123',
    'пароль123',
    'парольпароль',
    'dslkit123',
    'dslkitdslkit',
  ].map((item) => item.toLowerCase()),
);

const normalized = (value) => String(value ?? '').toLowerCase();

// "Password123!" is the common "password": digits, signs and spaces around the letters do not make a new password.
const core = (password) =>
  normalized(password)
    .replace(/[\d\s\p{P}\p{S}]+$/u, '')
    .replace(/^[\d\s\p{P}\p{S}]+/u, '');

const isRepeat = (password) => new Set(password).size <= 2;

// Codes of the problems found: short, long, common, repeat, personal. An empty list means that the password is accepted.
export const passwordIssues = (password, { name = '', email = '' } = {}) => {
  const value = typeof password === 'string' ? password : '';
  const issues = [];
  if (value.length < MIN_LENGTH || value.trim() === '') issues.push('short');
  if (value.length > MAX_LENGTH) issues.push('long');
  const lower = normalized(value);
  if (COMMON_PASSWORDS.has(lower) || COMMON_PASSWORDS.has(core(value))) issues.push('common');
  if (value.length >= MIN_LENGTH && isRepeat(value)) issues.push('repeat');
  // The password may not be the address, the part before "@" or the name, and may not contain them when they are long enough to be a clue.
  const address = normalized(email).trim();
  const flat = lower.replace(/\s+/g, '');
  const parts = [address, address.split('@')[0], normalized(name).replace(/\s+/g, '')];
  if (parts.some((part) => part !== '' && (flat === part || (part.length >= 4 && flat.includes(part))))) issues.push('personal');
  return issues;
};

// The strength from 0 (refused) to 4: length and the kinds of characters count, a refused password is always 0.
export const passwordStrength = (password, context = {}) => {
  const value = typeof password === 'string' ? password : '';
  if (passwordIssues(value, context).length > 0) return 0;
  const kinds = [/\p{Ll}/u, /\p{Lu}/u, /\d/, /[^\p{L}\d]/u].filter((pattern) => pattern.test(value)).length;
  return Math.min(4, 1 + (value.length >= 12 ? 1 : 0) + (value.length >= 16 ? 1 : 0) + (kinds >= 3 ? 1 : 0));
};
