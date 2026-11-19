// Finding RT-02: the developer/admin "unlock code" (site/js/config/roles.js) is checked with ONE round of
// unsalted SHA-256, while real account passwords use PBKDF2-SHA-256 with 100000 iterations and a per-account
// salt (site/js/storage/accounts.js, ITERATIONS = 100000). The code's hash is a public constant shipped in the
// client bundle, so anyone can brute-force or dictionary-attack it entirely offline, at the full speed of
// unsalted SHA-256 (no salt also means one precomputed rainbow table works for every installation of the site).
// This script does not try to recover the real code (unknown, and not needed): it measures, on this machine,
// how many SHA-256 guesses per second are achievable, and contrasts that with the PBKDF2(100000) rate the site
// itself uses for passwords, to size the real-world exposure of a 4-6 character code space.
// Safe: pure local benchmark, no network, no real secret is read or disclosed.
//
// Run: node security/redteam/02-role-code-hash-speed.mjs
import { createHash, pbkdf2Sync, randomBytes } from 'node:crypto';

const benchmark = (label, fn, iterations) => {
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i += 1) fn(i);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  const rate = iterations / (ms / 1000);
  console.log(`${label}: ${iterations} ops in ${ms.toFixed(1)} ms -> ${Math.round(rate).toLocaleString()} ops/sec (single core, Node crypto)`);
  return rate;
};

console.log('=== RT-02: role-unlock code hash strength vs. account password hash strength ===\n');

const sha256Rate = benchmark('Unsalted single-round SHA-256 (roles.js check)', (i) => createHash('sha256').update(`guess-${i}`).digest('hex'), 200_000);

const salt = randomBytes(16);
const pbkdf2Rate = benchmark('PBKDF2-SHA-256, 100000 iterations (accounts.js password check)', (i) => pbkdf2Sync(`guess-${i}`, salt, 100_000, 32, 'sha256'), 50);

const ratio = sha256Rate / pbkdf2Rate;
console.log(`\nSHA-256 is ~${Math.round(ratio).toLocaleString()}x faster to brute-force per guess than the PBKDF2 hash used for real passwords.`);

// Size the exposure: a code space such as lowercase+digits, length 5 (36^5) or length 6 (36^6).
for (const len of [4, 5, 6]) {
  const space = 36 ** len;
  const seconds = space / sha256Rate;
  console.log(
    `  36-char alphabet, length ${len}: ${space.toLocaleString()} candidates -> exhaustive search in ~${seconds < 1 ? seconds.toFixed(3) : seconds.toFixed(1)} s on one core ` +
      `(a multi-core or GPU attacker is orders of magnitude faster still; the hash has no salt, so one table serves every DSLKit install).`,
  );
}
console.log(
  '\nCONFIRMED: the role-unlock code is hashed far more weakly than the passwords the same codebase protects with PBKDF2; ' +
    'a short or guessable code is crackable offline in seconds to minutes on commodity hardware.',
);
