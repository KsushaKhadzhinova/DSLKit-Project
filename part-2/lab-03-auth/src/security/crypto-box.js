const { createCipheriv, createDecipheriv, hkdfSync, randomBytes, createHash } = require('node:crypto');

// Encryption of small secrets at rest (the TOTP secret) with AES-256-GCM. The key comes from HKDF over an environment value,
// with a label per purpose; the stored text is "v1.<iv>.<tag>.<data>" in base64url, so a wrong key or a changed byte fails to decrypt.
const createBox = (keyMaterial, label = 'dslkit-2fa-secret-v1') => {
  const key = Buffer.from(hkdfSync('sha256', Buffer.from(keyMaterial, 'utf8'), Buffer.alloc(0), Buffer.from(label), 32));
  return {
    seal(plain) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
      return ['v1', iv, cipher.getAuthTag(), data].map((part) => (Buffer.isBuffer(part) ? part.toString('base64url') : part)).join('.');
    },
    open(sealed) {
      const [version, iv, tag, data] = String(sealed).split('.');
      if (version !== 'v1' || !iv || !tag || data === undefined) throw new Error('Unreadable sealed value');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
    },
  };
};

// Tokens and codes carry 40 bits or more of randomness per use and are checked against a limited number of tries, so a fast
// hash without a salt is enough to store them (and it lets them be looked up by hash).
const sha256 = (text) => createHash('sha256').update(String(text)).digest('hex');

module.exports = { createBox, sha256 };
