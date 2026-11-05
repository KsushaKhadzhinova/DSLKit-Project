import { randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

// Security headers set by hand, no extra package. The pages use only files from the same origin,
// so the policy can be strict: no inline script or style, no framing, forms post only to this site.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const securityHeaders = (req, res, next) => {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    // same-origin, not no-referrer: with no-referrer browsers send "Origin: null" with every form, and the Origin check below would refuse the site's own forms.
    'Referrer-Policy': 'same-origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  // Told apart from plain HTTP only through `req.secure` (true behind a reverse proxy only once
  // `app.set('trust proxy', ...)` is configured, see TRUST_PROXY in app.js): browsers must not be told to
  // require HTTPS on a server that cannot tell HTTPS from HTTP.
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  next();
};

const COOKIE = 'dslkit_csrf';
const NONCE_LEN = 32; // hex characters of the random half of the token
const TOKEN = /^[0-9a-f]{48}$/;
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// The secret that signs every CSRF token, generated once when the server starts.
// A visitor who only controls the cookie (cookie fixation through a sibling subdomain, a response-splitting
// bug elsewhere, or simply typing one in devtools) cannot forge a token that carries a valid signature,
// so a double-submit of a self-chosen value is refused even though the cookie and the field match each other.
const CSRF_SECRET = randomBytes(32);

const signature = (nonce) => createHmac('sha256', CSRF_SECRET).update(nonce).digest('hex').slice(0, NONCE_LEN / 2);

const readCookie = (header = '', name) => {
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
};

const sameToken = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// A token is only genuine when its tag matches the signature of its own nonce: the shape (48 hex characters)
// is not enough by itself, unlike a plain double-submit token.
const validToken = (value) => {
  if (!TOKEN.test(value ?? '')) return false;
  const nonce = value.slice(0, NONCE_LEN);
  const tag = value.slice(NONCE_LEN);
  return sameToken(tag, signature(nonce));
};

const newToken = () => {
  const nonce = randomBytes(NONCE_LEN / 2).toString('hex');
  return nonce + signature(nonce);
};

const refused = (message) => Object.assign(new Error(message), { status: 403, publicMessage: message });

// CSRF protection with a double-submit token: the server puts a token into a SameSite=Strict cookie
// and into a hidden field of every form. A state-changing request must send both and they must match.
// A page of another site can neither read the cookie nor guess the token. The Origin header is checked as well when it is present.
// The token itself is signed with a server secret (see CSRF_SECRET above), so cookie fixation cannot replace
// it with a self-chosen value: only "shape and signature both correct" counts as a known token.
// It runs after the form parser, because the token is a field of the form body.
export const csrf = (req, res, next) => {
  let token = readCookie(req.headers.cookie, COOKIE);
  const known = validToken(token);
  if (UNSAFE.has(req.method)) {
    const origin = req.headers.origin;
    if (origin && origin !== `${req.protocol}://${req.headers.host}`) return next(refused('The request comes from another site and was refused.'));
    if (!known || !sameToken(token, req.body?._csrf)) return next(refused('The form token is missing or wrong. Open the form again and resend it.'));
  }
  if (!known) {
    token = newToken();
    res.append('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict${req.secure ? '; Secure' : ''}`);
  }
  res.locals.csrfToken = token;
  next();
};

const tooMany = (retryAfter) =>
  Object.assign(new Error('Too many requests'), { status: 429, retryAfter, publicMessage: `Too many requests. Try again in ${retryAfter} s.` });

// Fixed-window rate limit per client address, kept in memory. `only` limits it to some methods.
export const rateLimit = ({ windowMs, max, only, now = Date.now }) => {
  const hits = new Map();
  return (req, res, next) => {
    if (only && !only.includes(req.method)) return next();
    const time = now();
    if (hits.size > 10000) for (const [key, entry] of hits) if (entry.reset <= time) hits.delete(key);
    const key = req.ip ?? 'unknown';
    let entry = hits.get(key);
    if (!entry || entry.reset <= time) {
      entry = { count: 0, reset: time + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count <= max) return next();
    const retryAfter = Math.max(1, Math.ceil((entry.reset - time) / 1000));
    res.set('Retry-After', String(retryAfter));
    return next(tooMany(retryAfter));
  };
};

// Control characters (line breaks, tabs, escape codes) in user input could forge extra lines in a log, so they are escaped.
// The text is also cut, so one huge address cannot fill the log.
export const safeLogText = (text, max = 500) => {
  let escaped = '';
  for (const char of String(text)) {
    const code = char.codePointAt(0);
    const control = code < 32 || (code >= 127 && code <= 159) || code === 0x2028 || code === 0x2029;
    escaped += control ? `\\u${code.toString(16).padStart(4, '0')}` : char;
  }
  return escaped.length > max ? `${escaped.slice(0, max)}…` : escaped;
};
