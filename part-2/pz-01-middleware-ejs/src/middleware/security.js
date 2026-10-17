import { randomBytes, timingSafeEqual } from 'node:crypto';

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
  next();
};

const COOKIE = 'dslkit_csrf';
const TOKEN = /^[0-9a-f]{48}$/;
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const readCookie = (header = '', name) => {
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
};

const sameToken = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const refused = (message) => Object.assign(new Error(message), { status: 403, publicMessage: message });

// CSRF protection with a double-submit token: the server puts a random token into a SameSite=Strict cookie
// and into a hidden field of every form. A state-changing request must send both and they must match.
// A page of another site can neither read the cookie nor guess the token. The Origin header is checked as well when it is present.
// It runs after the form parser, because the token is a field of the form body.
export const csrf = (req, res, next) => {
  let token = readCookie(req.headers.cookie, COOKIE);
  const known = TOKEN.test(token ?? '');
  if (UNSAFE.has(req.method)) {
    const origin = req.headers.origin;
    if (origin && origin !== `${req.protocol}://${req.headers.host}`) return next(refused('The request comes from another site and was refused.'));
    if (!known || !sameToken(token, req.body?._csrf)) return next(refused('The form token is missing or wrong. Open the form again and resend it.'));
  }
  if (!known) {
    token = randomBytes(24).toString('hex');
    res.append('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict${req.secure ? '; Secure' : ''}`);
  }
  res.locals.csrfToken = token;
  next();
};

const tooMany = (retryAfter) => Object.assign(new Error('Too many requests'), { status: 429, retryAfter, publicMessage: `Too many requests. Try again in ${retryAfter} s.` });

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
