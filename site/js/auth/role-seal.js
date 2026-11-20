// A role kept in the browser is only text that the owner of the browser can edit. To make a casual edit useless, the role of an account is
// sealed: an HMAC-SHA-256 of "id:role" under a random key that is made at registration and kept in the same record. A role without a valid
// seal counts as "user". This stops the one-line edit of localStorage (role: "admin"); it cannot stop a person who writes a whole new
// account with their own key, because the key lives in the same place. A real boundary needs a server (SECURITY.md, finding RT-01).
import { ROLES } from './permissions.js';
import { same, toHex } from './bytes.js';

const K = Uint32Array.from(
  '428a2f98 71374491 b5c0fbcf e9b5dba5 3956c25b 59f111f1 923f82a4 ab1c5ed5 d807aa98 12835b01 243185be 550c7dc3 72be5d74 80deb1fe 9bdc06a7 c19bf174 e49b69c1 efbe4786 0fc19dc6 240ca1cc 2de92c6f 4a7484aa 5cb0a9dc 76f988da 983e5152 a831c66d b00327c8 bf597fc7 c6e00bf3 d5a79147 06ca6351 14292967 27b70a85 2e1b2138 4d2c6dfc 53380d13 650a7354 766a0abb 81c2c92e 92722c85 a2bfe8a1 a81a664b c24b8b70 c76c51a3 d192e819 d6990624 f40e3585 106aa070 19a4c116 1e376c08 2748774c 34b0bcb5 391c0cb3 4ed8aa4a 5b9cca4f 682e6ff3 748f82ee 78a5636f 84c87814 8cc70208 90befffa a4506ceb bef9a3f7 c67178f2'
    .split(' ')
    .map((item) => Number.parseInt(item, 16)),
);
const START = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const rotr = (value, bits) => (value >>> bits) | (value << (32 - bits));

export const sha256 = (bytes) => {
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, (bytes.length * 8) >>> 0);
  view.setUint32(padded.length - 8, Math.floor((bytes.length * 8) / 2 ** 32));
  const state = [...START];
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let i = 0; i < 64; i += 1) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      [h, g, f, e, d, c, b, a] = [g, f, e, (d + t1) >>> 0, c, b, a, (t1 + t2) >>> 0];
    }
    [a, b, c, d, e, f, g, h].forEach((value, i) => {
      state[i] = (state[i] + value) >>> 0;
    });
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  state.forEach((value, i) => outView.setUint32(i * 4, value));
  return out;
};

export const hmacSha256 = (key, message) => {
  const block = new Uint8Array(64);
  block.set(key.length > 64 ? sha256(key) : key);
  const inner = new Uint8Array(64 + message.length);
  const outer = new Uint8Array(96);
  block.forEach((byte, i) => {
    inner[i] = byte ^ 0x36;
    outer[i] = byte ^ 0x5c;
  });
  inner.set(message, 64);
  outer.set(sha256(inner), 64);
  return sha256(outer);
};

const text = new TextEncoder();
const seal = (account, role) => toHex(hmacSha256(text.encode(account.roleKey), text.encode(`${account.id}:${role}`)));

// The fields to merge into an account when its role becomes `role`: a new key is made when the account has none.
export const sealedRole = (account, role, makeKey) => {
  const roleKey = typeof account.roleKey === 'string' && account.roleKey !== '' ? account.roleKey : makeKey();
  return { role, roleKey, roleSig: seal({ id: account.id, roleKey }, role) };
};

// The role that may be trusted: a known role with a valid seal, otherwise "user".
export const trustedRole = (account) => {
  const role = account?.role;
  if (!ROLES.includes(role) || role === 'user') return 'user';
  const ok = typeof account.roleKey === 'string' && typeof account.roleSig === 'string' && same(seal(account, role), account.roleSig);
  return ok ? role : 'user';
};
