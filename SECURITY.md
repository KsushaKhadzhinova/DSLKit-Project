# Security policy

DSLKit is a student project (a web editor of diagrams as code, with server and client exercises). It has no production service, but the code is written and checked as if it had one.

## Reporting a vulnerability

Write to the owner of the repository privately (the e-mail in the profile of the repository owner) or open a private security advisory on GitHub (Security, then Report a vulnerability). Please do not open a public issue for a vulnerability.

Include: where the problem is (file or address), how to repeat it, and what it allows. A first answer is given within 7 days.

## What is checked

- Every lab and practical has negative tests, attack tests and an audit file (`AUDIT.md`).
- `docs/study/02-SECURITY-AUDIT.md` and `docs/testing/GRC-AUDIT.md` list the checks, the findings and the open risks.
- The continuous integration run fails on a known vulnerability in a production dependency (`npm audit --omit=dev --audit-level=high`).

## Supported versions

Only the latest commit of each working branch is supported.

## Accounts and roles of the site: what is and is not protected

The site has no server for accounts: they live in the `localStorage` of the browser, so whoever controls the browser profile controls the data. This section is the honest limit of the client-side model (audit finding RT-01, RT-02).

- A role (`developer`, `admin`) is sealed: an HMAC-SHA-256 of `id:role` under a random key of the account, made at registration and kept in the same record (`site/js/auth/role-seal.js`). A role without a valid seal counts as `user`, so editing `role: "admin"` in the storage gives nothing. Accounts made before this change keep the role `user` until the role code is entered again.
- This does NOT stop a person who writes a whole new account with their own key: the key lives in the same storage. A real boundary needs a server with signed sessions. The roles of the site protect the documentation and the rules of the expert system from accidental edits, nothing more.
- The role codes are kept as salted PBKDF2-SHA-256 records with the parameters of the passwords (`site/js/auth/role-code.js`, `npm run dev:code`). The shipped records wrap the old hash; run `npm run dev:code -- "<developer code>" "<admin code>"` to replace them with records of new codes.
- Draw.io and Visio files are unpacked with a cap of 8 MB; a larger result is refused with a message (finding RT-03).
