# Feature: accounts, sessions and permissions

Important: DSLKit has no server. All accounts live in the browser (`localStorage`). This is a demonstration of the concepts of authentication and authorization, not server-grade security: anyone who controls the browser profile can read and edit the storage, skip the checks or remove a lockout.

## Design

| Part                 | Module                                                                    | What it does                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Password policy      | `site/js/auth/password-policy.js`, `site/js/components/password-meter.js` | Minimum length, a small bundled blocklist of common passwords, not equal to the email or the name; a strength meter at registration and on password change.                                                                                                                                                                        |
| Lockout              | `site/js/auth/lockout.js`                                                 | Failed sign-ins are counted per account; after 5 in a row the lock grows (30 s, doubling, up to 15 min); a visible countdown. Messages are the same for an unknown address and a wrong password (no user enumeration).                                                                                                             |
| Sessions             | `site/js/auth/sessions.js`, `site/js/storage/accounts.js`                 | A random token per session, an absolute lifetime of 7 days, an idle timeout of 30 min, "remember me" (long) or a short session; the list of sessions in settings with device, created, last seen, revoke, the current one marked; sign-out everywhere; cross-tab sign-out is kept. Old sessions `{ userId }` are migrated on read. |
| Password and account | `accounts.js`                                                             | Change password needs the old one and revokes other sessions; deleting the account needs the password.                                                                                                                                                                                                                             |
| Two-factor           | `site/js/auth/totp.js`                                                    | TOTP (RFC 6238, SHA-1, 30 s, 6 digits) on Web Crypto; the secret and an `otpauth://` URI are shown (no QR); 8 recovery codes stored hashed; one step of tolerance; a used step is not accepted twice (replay protection).                                                                                                          |
| Authorization        | `site/js/auth/permissions.js`                                             | One permission matrix (`diagram.create`, `diagram.unlimited`, `docs.developer`, `admin.users`, ...) instead of scattered role checks; the daily limits depend on it. The admin lists accounts and changes roles; the last admin cannot be demoted.                                                                                 |
| Audit                | `site/js/auth/audit.js`                                                   | Security events (sign-in, failure, lockout, password change, 2FA change, role change, session revoke) shown to the user in settings.                                                                                                                                                                                               |
| Settings             | `site/js/components/security.js`                                          | The interface of the above.                                                                                                                                                                                                                                                                                                        |

All values (lifetimes, lock steps) are in `site/js/config/auth.js`. Comparisons of secrets stay constant-time (`site/js/auth/bytes.js`).

## Threat notes

- Storage is readable and writable by the owner of the profile and by any script of the same origin (XSS would expose everything). Hashes use PBKDF2-SHA-256 with a salt, which only slows guessing.
- A lockout in the browser is a usability and teaching feature: clearing the storage resets it.
- A TOTP secret stored in the same place as the password gives no second factor against an attacker with the storage; it shows the flow only.
- The roles are checked on the client; a user can change their own role in the storage.

## What a server must do instead

- Keep password hashes (Argon2id or scrypt, a per-user salt, a pepper) and the TOTP secrets in a database, encrypted, never in the browser.
- Issue sessions as random identifiers in `HttpOnly; Secure; SameSite` cookies, keep them server-side, rotate them at sign-in.
- Count failed attempts per account and per IP on the server, with rate limiting.
- Check every permission on the server for every request; the client only hides buttons.
- Keep the audit log append-only on the server; send alerts on new devices.
- Offer password reset by e-mail, phishing-resistant factors (WebAuthn) and CSRF protection.
