# Red team findings (local only)

Russian version: [FINDINGS.md](FINDINGS.md). All attacks ran against servers or modules started in-process on localhost; no deployed host, real key or real data was touched. Each script is deterministic: `node security/redteam/<script>`. Labs 03 and 06 need `npm install` in their folder first (lab 06 downloads an in-memory MongoDB once).

## Findings

| ID | Severity | Component | File:line | Status | Reproduction | Impact | Suggested fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RT-01 | high | client-side accounts | site/js/storage/accounts.js:5, :111-117 | CONFIRMED | `node security/redteam/01-localstorage-admin-forge.mjs` | Anyone can write an account with `role: "admin"` into localStorage and get unlimited access without the code. Affects only that visitor's own browser (no server data), but the role gate is cosmetic. | Document that roles are cosmetic, or move accounts and role checks to a server that signs sessions. |
| RT-02 | medium | role code hash | site/js/config/roles.js:4-6, accounts.js:116 | CONFIRMED | `node security/redteam/02-role-code-hash-speed.mjs` | Unlock code is one round of unsalted SHA-256 (about 12,000 times cheaper per guess than the PBKDF2 used for passwords); a short code falls offline in seconds to minutes, one table fits every install. | Use a long random code (20+ chars) or PBKDF2/scrypt with a salt; best, validate server side. |
| RT-03 | medium | draw.io / vsdx import | site/js/utils/diagram-file-import.js:309-312 | CONFIRMED | `node security/redteam/03-decompression-bomb-import.mjs` | `inflateRaw` has no cap on decompressed size: 65 KB expanded to 64 MB (ratio 1029:1); a few KB can exhaust a tab. Self-inflicted DoS only (the victim opens a hostile file). | Read the stream in chunks and abort above a limit (for example 20 MB). |
| RT-07 | low | lab-03-auth dev dependencies | part-2/lab-03-auth/package.json | CONFIRMED | `cd part-2/lab-03-auth && npm audit` | 8 moderate advisories (glob, minimatch, uuid via sequelize-cli, nodemon, sequelize); dev tooling or fixed only by breaking upgrades. | Upgrade sequelize-cli and nodemon when the lab is frozen for release. |

Totals: critical 0, high 1, medium 2, low 1, info 0.

## Attacks that failed (already protected)

- Site server (04): path traversal in four encodings, X-Frame-Options and CSP frame-ancestors, `script-src 'self'` without unsafe-inline, nosniff, POST on static files (405), AI status leaks no key, rate limit not bypassed by `X-Forwarded-For`.
- AI endpoints: `AI_BASE_URL` is read only from the server environment and checked by `checkBaseUrl` (https or local http, no credentials in the URL), `redirect: 'error'`, so request-driven SSRF is not possible (code review, ai-provider.js:15-25, :72).
- Lab 03 (05): JWT alg=none, wrong key, expired token, role claim, mass assignment of `role`, SQL injection in login, IDOR on edit and delete (403), hostile CORS origin, lockout bypass by `X-Forwarded-For`, stack leakage, `X-Powered-By`.
- Lab 06 (06): NoSQL operator injection (`$ne`, `$gt`), `$where`-style strings, sort-key injection, array parameters, prototype-pollution body, oversized id. `npm audit` of lab 06: 0 advisories.

## Not covered in this pass

XSS in every renderer and importer format, `?p=`/`?tl=` parameters, service worker poisoning, prompt injection, labs 01, 02, 07, pz-01, pz-02 and the course server. These are open, not "safe".
