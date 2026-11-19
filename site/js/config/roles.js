// The role "developer" is unlocked with a code; only a salted PBKDF2-SHA-256 record of the code is kept here (see auth/role-code.js).
// Change it with: npm run dev:code -- "<new code>"
// This is a client-side rule of a site without a server: it keeps the documentation from being edited by accident, it is not a protection against a determined visitor.
export const DEVELOPER_CODE_VERIFIER = 'p1s$100000$d1dabede1cd414ee742e92396e7597aa$09ed40ab81b94a7e4c49363f9c165b9e598a80ce2869d085332f12f6b9da74ef';
// The role "admin" has no daily limit of diagrams, like the developer; the same kind of record.
export const ADMIN_CODE_VERIFIER = 'p1s$100000$141af6c32d681e2e6b80580d85e75534$484bc1c7a18acb5cda595b3fce58d66b80a6763347f293ebeca1b3b8bfe1a688';
