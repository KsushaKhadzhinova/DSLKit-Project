// Black-box checks against the site's own static+API server (tools/serve.js / tools/server.js), started here on
// a random localhost port and shut down at the end. Covers: path traversal, security headers / clickjacking,
// open file leaks, and the AI endpoint's rate limiter being keyed off the socket, not a spoofable header.
// Target: ONLY a server this script starts itself on 127.0.0.1. No deployed host is touched.
//
// Run: node security/redteam/04-site-server-blackbox.mjs
import { staticServer } from '../../tools/server.js';

const server = staticServer('site').listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`=== RT-04: black-box checks against the site server at ${base} ===\n`);

let failures = 0;
const check = (name, ok, detail) => {
  console.log(`[${ok ? 'PASS (protected)' : 'FAIL (vulnerable)'}] ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

// --- Path traversal ---
for (const path of ['/../../../../etc/passwd', '/..%2f..%2f..%2fetc%2fpasswd', '/%2e%2e/%2e%2e/package.json', '/js/..%2f..%2fpackage.json']) {
  const res = await fetch(base + path, { redirect: 'manual' });
  const body = res.status === 200 ? await res.text() : '';
  const leaked = res.status === 200 && /root:|"name":\s*"dslkit"/.test(body);
  check(`path traversal via ${path}`, !leaked, `status ${res.status}`);
}

// --- Security / clickjacking headers on a normal page ---
const home = await fetch(`${base}/`);
const headers = Object.fromEntries(home.headers.entries());
check('X-Frame-Options: DENY present', headers['x-frame-options'] === 'DENY');
check('CSP frame-ancestors none present', /frame-ancestors 'none'/.test(headers['content-security-policy'] ?? ''));
const scriptSrc = /script-src[^;]*/.exec(headers['content-security-policy'] ?? '')?.[0] ?? '';
check('CSP script-src has no unsafe-inline/unsafe-eval', scriptSrc === "script-src 'self'", scriptSrc);
check('X-Content-Type-Options: nosniff present', headers['x-content-type-options'] === 'nosniff');

// --- Method handling / verb tampering ---
const trace = await fetch(`${base}/`, { method: 'POST' }).catch((error) => ({ status: `error: ${error.message}` }));
check('POST to a static page is rejected (405), not silently served', trace.status === 405, `status ${trace.status}`);

// --- AI status endpoint: no key leakage even with no key configured ---
const aiStatus = await fetch(`${base}/api/ai/status`);
const aiBody = await aiStatus.json();
check('AI status endpoint leaks no key material', !JSON.stringify(aiBody).match(/sk-|anthropic-|AIza/), JSON.stringify(aiBody));

// --- Rate limit: is it keyed by a spoofable header (X-Forwarded-For) or by the real socket address? ---
// A fake local provider config is needed so /api/ai/generate gets past the "no key configured" 503 and
// actually reaches the rate limiter (RATE_LIMIT = 6/min in tools/ai-api.js); the upstream call itself will
// fail (nothing is listening on the bogus base URL), which is fine — the limiter runs before that call.
process.env.AI_PROVIDER = 'openai';
process.env.AI_API_KEY = 'redteam-fake-key';
process.env.AI_MODEL = 'redteam-fake-model';
process.env.AI_BASE_URL = 'http://127.0.0.1:1'; // nothing listens here; checkBaseUrl() allows http for localhost
let limited = false;
for (let i = 0; i < 8 && !limited; i += 1) {
  const res = await fetch(`${base}/api/ai/generate`, { method: 'POST', body: JSON.stringify({ mode: 'idea', text: 'x' }), headers: { 'Content-Type': 'application/json' } });
  if (res.status === 429) limited = true;
}
let bypassed = false;
if (limited) {
  const res = await fetch(`${base}/api/ai/generate`, {
    method: 'POST',
    body: JSON.stringify({ mode: 'idea', text: 'x' }),
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '1.2.3.4' },
  });
  bypassed = res.status !== 429;
}
check('AI rate limit cannot be bypassed by sending a fake X-Forwarded-For', limited && !bypassed, `limited=${limited} bypassed=${bypassed}`);

server.close();
console.log(`\n${failures === 0 ? 'All checks in this script held.' : `${failures} check(s) FAILED — see above.`}`);
process.exit(failures === 0 ? 0 : 1);
