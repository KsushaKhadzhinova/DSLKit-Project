const ACCOUNTS = 'accounts';
const SESSION = 'session';
const ITERATIONS = 100000;
const SALT_BYTES = 16;
const ID_BYTES = 8;
// A fixed salt for the check of an unknown address, so a missing account costs as much time as a wrong password.
const DUMMY_SALT = '00'.repeat(SALT_BYTES);

const toHex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const HEX = /^(?:[0-9a-f]{2})+$/;
const fromHex = (hex) => Uint8Array.from(hex.match(/../g), (pair) => Number.parseInt(pair, 16));

const publicUser = ({ id, name, email }) => ({ id, name, email });

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const valid = (item) =>
  item !== null &&
  typeof item === 'object' &&
  typeof item.id === 'string' &&
  typeof item.name === 'string' &&
  typeof item.email === 'string' &&
  HEX.test(item.salt) &&
  HEX.test(item.hash) &&
  Number.isInteger(item.iterations) &&
  item.iterations > 0;

// Equal length strings are compared to the end, whatever the first difference is.
const same = (first, second) => {
  let diff = first.length ^ second.length;
  for (let index = 0; index < first.length && index < second.length; index += 1) {
    diff |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return diff === 0;
};

const readAccounts = (storage) => {
  const saved = storage.get(ACCOUNTS, []);
  return Array.isArray(saved) ? saved.filter(valid) : [];
};

// The signed-in user, or null for a guest, an unknown id or a damaged session. Reads only, so any page may ask without the crypto API.
export const currentUser = (storage) => {
  const session = storage.get(SESSION, null);
  const account = typeof session?.userId === 'string' ? readAccounts(storage).find((item) => item.id === session.userId) : undefined;
  return account ? publicUser(account) : null;
};

// Accounts of the site live in the browser: there is no server. The password is never stored, only its PBKDF2-SHA-256 hash with a salt of its own.
// The session is the id of the signed-in account. Every method answers with { ok, ... } and never throws for a wrong input.
export const createAccountStore = ({ storage, crypto = globalThis.crypto, now = () => Date.now() }) => {
  const supported = () => typeof crypto?.subtle?.deriveBits === 'function' && typeof crypto.getRandomValues === 'function';

  const read = () => readAccounts(storage);
  const randomHex = (bytes) => toHex(crypto.getRandomValues(new Uint8Array(bytes)));

  const derive = async (password, salt, iterations) => {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    return toHex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(salt), iterations }, key, 256));
  };

  const register = async ({ name, email, password }) => {
    if (!supported()) return { ok: false, error: 'unsupported' };
    const accounts = read();
    const address = normalizeEmail(email);
    if (accounts.some((account) => account.email === address)) return { ok: false, error: 'exists' };
    const salt = randomHex(SALT_BYTES);
    const account = {
      id: `u${randomHex(ID_BYTES)}`,
      name: String(name).trim(),
      email: address,
      salt,
      hash: await derive(password, salt, ITERATIONS),
      iterations: ITERATIONS,
      created: now(),
    };
    // Another tab may have registered the same address while the hash was computed.
    const latest = read();
    if (latest.some((item) => item.email === address)) return { ok: false, error: 'exists' };
    if (!storage.set(ACCOUNTS, [...latest, account]) || !storage.set(SESSION, { userId: account.id })) return { ok: false, error: 'storage' };
    return { ok: true, user: publicUser(account) };
  };

  // A wrong address and a wrong password give the same answer.
  const login = async ({ email, password }) => {
    if (!supported()) return { ok: false, error: 'unsupported' };
    const address = normalizeEmail(email);
    const account = read().find((item) => item.email === address);
    const hash = await derive(password, account?.salt ?? DUMMY_SALT, account?.iterations ?? ITERATIONS);
    if (!account || !same(hash, account.hash)) return { ok: false, error: 'invalid' };
    if (!storage.set(SESSION, { userId: account.id })) return { ok: false, error: 'storage' };
    return { ok: true, user: publicUser(account) };
  };

  const logout = () => storage.remove(SESSION);

  const current = () => currentUser(storage);

  return { register, login, logout, current };
};
