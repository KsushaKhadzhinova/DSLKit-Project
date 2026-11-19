const LIMITS = require('../../limits.json');

// The most used passwords of leaked lists, compared in lower case. It is a short list for a teaching project: a real service
// would also check a large list (for example the Have I Been Pwned range API).
const COMMON = new Set(
  [
    'password', 'password1', 'password12', 'password123', 'password1234', 'passw0rd', 'p@ssw0rd', 'p@ssword', 'qwerty', 'qwerty123',
    'qwertyuiop', 'qwerty12', '12345678', '123456789', '1234567890', '123123123', '11111111', '00000000', '87654321', 'abc12345',
    'abcd1234', 'abcdefgh', 'iloveyou', 'iloveyou1', 'admin', 'admin123', 'administrator', 'letmein', 'letmein1', 'welcome',
    'welcome1', 'welcome123', 'monkey', 'monkey123', 'dragon', 'dragon123', 'sunshine', 'princess', 'football', 'baseball',
    'master', 'master123', 'shadow', 'shadow123', 'superman', 'batman', 'trustno1', 'changeme', 'changeme1', 'changeit',
    'default', 'secret', 'secret123', 'login', 'login123', 'test1234', 'testtest', 'test12345', 'guest', 'guest123', 'user1234',
    'qazwsx123', '1q2w3e4r', '1qaz2wsx', 'zaq12wsx', 'asdfghjk', 'asdf1234', 'zxcvbnm1', 'q1w2e3r4', 'qwer1234', 'passpass',
    'pass1234', 'starwars', 'computer', 'internet', 'hello123', 'hellohello', 'freedom', 'whatever', 'liverpool', 'chocolate',
    'abc123456', 'qwertyui', 'password!', 'password01', 'letmein123', 'iloveyou123', '1234qwer', 'qwe12345', 'zaqxswcde',
  ],
);

// Returns the first problem as a short text, or undefined. Length and byte limits come from limits.json (bcrypt reads 72 bytes).
const passwordProblem = (password, { email } = {}) => {
  if (typeof password !== 'string') return 'must be a string';
  if (password.trim() === '') return 'must not be empty or only spaces';
  if (password.length < LIMITS.passwordMin) return `must be at least ${LIMITS.passwordMin} characters`;
  if (Buffer.byteLength(password) > LIMITS.passwordMaxBytes) return `must be at most ${LIMITS.passwordMaxBytes} bytes`;
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || COMMON.has(lower.replace(/\d+$/, ''))) return 'is too common, choose another one';
  if (new Set(password).size < 3) return 'must contain at least 3 different characters';
  if (email) {
    const address = String(email).toLowerCase();
    const local = address.split('@')[0];
    if (lower === address || (local.length >= 4 && lower === local)) return 'must not be the same as the email';
  }
  return undefined;
};

module.exports = { passwordProblem, COMMON };
