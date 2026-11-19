const { test } = require('node:test');
const assert = require('node:assert/strict');
const { totp, hotp, verifyTotp, base32Encode, base32Decode, newSecret, otpauthUrl, stepOf } = require('../src/security/totp');
const { createBox, sha256 } = require('../src/security/crypto-box');
const { passwordProblem } = require('../src/security/password-policy');
const { hasPermission, mayModifyDiagram } = require('../src/permissions');

// The secret of the RFC 4226 and RFC 6238 test vectors is the ASCII text 12345678901234567890.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

test('HOTP matches the RFC 4226 test vectors', () => {
  const expected = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
  expected.forEach((code, counter) => assert.equal(hotp(RFC_SECRET, counter), code, `counter ${counter}`));
});

test('TOTP matches the RFC 6238 test vectors (SHA-1, the last six digits)', () => {
  const vectors = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ];
  for (const [seconds, code] of vectors) assert.equal(totp(RFC_SECRET, seconds * 1000), code, `time ${seconds}`);
});

test('base32 round trips and refuses characters outside the alphabet', () => {
  const bytes = Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255, 7, 8, 9]);
  assert.deepEqual(base32Decode(base32Encode(bytes)), bytes);
  assert.equal(base32Encode(Buffer.from('foobar')), 'MZXW6YTBOI');
  assert.throws(() => base32Decode('A1B'), /Invalid base32/);
  assert.match(newSecret(), /^[A-Z2-7]{32}$/);
  assert.notEqual(newSecret(), newSecret());
});

test('verifyTotp accepts one step of drift, refuses two, bad shapes and replayed steps', () => {
  const at = 1700000000000;
  const step = stepOf(at);
  assert.equal(verifyTotp(RFC_SECRET, totp(RFC_SECRET, at), { timeMs: at }), step);
  assert.equal(verifyTotp(RFC_SECRET, totp(RFC_SECRET, at - 30000), { timeMs: at }), step - 1);
  assert.equal(verifyTotp(RFC_SECRET, totp(RFC_SECRET, at + 30000), { timeMs: at }), step + 1);
  assert.equal(verifyTotp(RFC_SECRET, totp(RFC_SECRET, at + 90000), { timeMs: at }), undefined);
  assert.equal(verifyTotp(RFC_SECRET, totp(RFC_SECRET, at), { timeMs: at, afterStep: step }), undefined, 'the same step is a replay');
  assert.equal(verifyTotp(RFC_SECRET, totp(RFC_SECRET, at), { timeMs: at, afterStep: step - 1 }), step);
  for (const bad of [undefined, 123456, '12345', '1234567', 'abcdef', '12 456']) assert.equal(verifyTotp(RFC_SECRET, bad, { timeMs: at }), undefined, String(bad));
});

test('the otpauth URL carries the secret, the issuer and the account, encoded', () => {
  const url = otpauthUrl('ABC234', 'a+b@example.com');
  assert.equal(url, 'otpauth://totp/DSLKit:a%2Bb%40example.com?secret=ABC234&issuer=DSLKit&algorithm=SHA1&digits=6&period=30');
});

test('the crypto box seals with AES-256-GCM: random per call, readable with the same key only, any change fails', () => {
  const key = 'k'.repeat(16) + 'e'.repeat(16) + 'y';
  const box = createBox(key);
  const one = box.seal('JBSWY3DPEHPK3PXP');
  assert.notEqual(one, box.seal('JBSWY3DPEHPK3PXP'));
  assert.equal(one.includes('JBSWY3DP'), false);
  assert.equal(box.open(one), 'JBSWY3DPEHPK3PXP');
  assert.throws(() => createBox(`${key}x`).open(one));
  assert.throws(() => createBox(key, 'another-purpose').open(one), 'the label separates the keys');
  const [version, iv, tag, data] = one.split('.');
  const flipped = Buffer.from(data, 'base64url');
  flipped[0] ^= 1;
  assert.throws(() => box.open([version, iv, tag, flipped.toString('base64url')].join('.')));
  assert.throws(() => box.open('garbage'), /Unreadable/);
  assert.match(sha256('a'), /^[0-9a-f]{64}$/);
});

test('the password policy checks length, bytes, common passwords, repeated characters and the email', () => {
  assert.equal(passwordProblem('correct horse 42', { email: 'a@b.co' }), undefined);
  assert.match(passwordProblem(5), /string/);
  assert.match(passwordProblem('        '), /empty/);
  assert.match(passwordProblem('short'), /at least 8/);
  assert.match(passwordProblem('é'.repeat(37)), /at most 72 bytes/);
  for (const common of ['password', 'PASSWORD', 'Password123', 'qwerty123', '12345678', 'iloveyou99']) assert.match(passwordProblem(common), /too common/, common);
  assert.match(passwordProblem('aaaaaaaaaa'), /different characters/);
  assert.match(passwordProblem('Alice@Example.com', { email: 'alice@example.com' }), /same as the email/);
  assert.match(passwordProblem('wonderland', { email: 'wonderland@example.com' }), /same as the email/);
  assert.equal(passwordProblem('abc12345xyz', { email: 'abc@example.com' }), undefined, 'a short local part is not treated as a secret');
});

test('the permission module: built-in roles, one rule for diagrams, nothing for an empty or missing list', () => {
  const { BUILTIN_ROLES, PERMISSIONS } = require('../src/permissions');
  const user = BUILTIN_ROLES.user.permissions;
  const moderator = BUILTIN_ROLES.moderator.permissions;
  const admin = BUILTIN_ROLES.admin.permissions;
  assert.deepEqual(Object.keys(BUILTIN_ROLES), ['user', 'moderator', 'admin']);
  assert.equal(hasPermission(user, 'diagram:create'), true);
  assert.equal(hasPermission(user, 'diagram:modify:any'), false);
  assert.equal(hasPermission(user, 'user:list'), false);
  assert.equal(hasPermission(moderator, 'diagram:modify:any'), true);
  assert.equal(hasPermission(moderator, 'user:role'), false);
  assert.equal(hasPermission(moderator, 'role:manage'), false);
  assert.deepEqual([...admin].sort(), Object.keys(PERMISSIONS).sort());
  for (const permission of [...user, ...moderator]) assert.ok(permission in PERMISSIONS, permission);
  assert.equal(hasPermission(undefined, 'diagram:read'), false);
  assert.equal(hasPermission([], 'diagram:read'), false);
  assert.equal(mayModifyDiagram({ id: 1, permissions: user }, { ownerId: 1 }), true);
  assert.equal(mayModifyDiagram({ id: 2, permissions: user }, { ownerId: 1 }), false);
  assert.equal(mayModifyDiagram({ id: 2, permissions: moderator }, { ownerId: 1 }), true);
  assert.equal(mayModifyDiagram({ id: 1, permissions: [] }, { ownerId: 1 }), false);
});
