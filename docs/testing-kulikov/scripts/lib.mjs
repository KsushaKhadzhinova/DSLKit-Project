// Shared helpers for the API test scripts: raw HTTP client and result recorder.
import http from 'node:http';
import net from 'node:net';

export const HOST = process.env.HOST ?? 'localhost';
export const PORT = Number(process.env.PORT ?? 5190);

export const request = ({ method = 'GET', path = '/', headers = {}, body, timeout = 20000 } = {}) =>
  new Promise((resolve) => {
    const t0 = performance.now();
    const data = body === undefined ? undefined : Buffer.isBuffer(body) ? body : Buffer.from(body);
    const hdr = { ...headers };
    if (data && !Object.keys(hdr).some((k) => k.toLowerCase() === 'content-length')) hdr['Content-Length'] = data.length;
    const req = http.request({ host: HOST, port: PORT, method, path, headers: hdr, agent: false, timeout }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8'), ms: performance.now() - t0 }));
      res.on('error', (e) => resolve({ status: 0, error: e.code ?? e.message, headers: {}, body: '', ms: performance.now() - t0 }));
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: 'timeout', headers: {}, body: '', ms: performance.now() - t0 });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.code ?? e.message, headers: {}, body: '', ms: performance.now() - t0 }));
    if (data) req.write(data);
    req.end();
  });

export const post = (path, obj, extra = {}) =>
  request({
    method: 'POST',
    path,
    headers: { 'Content-Type': 'application/json', ...(extra.headers ?? {}) },
    body: typeof obj === 'string' ? obj : JSON.stringify(obj),
  });

// Raw TCP, for paths and framing that http.request would normalise or refuse.
export const raw = (text, { timeout = 5000, keep = false } = {}) =>
  new Promise((resolve) => {
    const t0 = performance.now();
    const s = net.connect(PORT, HOST);
    let out = '';
    const done = (why) => {
      s.destroy();
      resolve({ text: out, why, ms: performance.now() - t0, status: Number((out.match(/^HTTP\/1\.[01] (\d+)/) ?? [])[1] ?? 0) });
    };
    s.setTimeout(timeout, () => done('timeout'));
    s.on('data', (d) => {
      out += d.toString('latin1');
      if (!keep && /\r\n\r\n/.test(out) && /content-length|transfer-encoding|connection: close/i.test(out)) setTimeout(() => done('data'), 150);
    });
    s.on('close', () => done('close'));
    s.on('error', () => done('error'));
    s.write(typeof text === 'function' ? '' : text);
  });

export const results = [];
export const record = (id, group, title, request_, expect, actual, pass, note = '') => {
  results.push({ id, group, title, request: request_, expect, actual, pass: !!pass, note });
};

export const SECURITY = [
  'content-security-policy',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
];

// Structural SVG checks without an XML parser: tag balance and forbidden constructs.
export const svgIssues = (svg) => {
  const issues = [];
  if (typeof svg !== 'string' || !/^\s*<svg[\s>]/.test(svg)) issues.push('does not start with <svg');
  if (!/<\/svg>\s*$/.test(svg ?? '')) issues.push('does not end with </svg>');
  if (/<script/i.test(svg)) issues.push('<script>');
  if (/\son[a-z]+\s*=/i.test(svg.replace(/>[^<]*</g, '><'))) issues.push('on*-attribute');
  if (/\s(?:[\w:-]*href|src|action|formaction|data)\s*=\s*["']\s*javascript:/i.test(svg)) issues.push('javascript: in attribute');
  if (/<foreignObject/i.test(svg)) issues.push('<foreignObject>');
  if (/<iframe|<object|<embed/i.test(svg)) issues.push('embedded object');
  if (/(?:href|src)\s*=\s*["']\s*(?:https?:)?\/\//i.test(svg)) issues.push('external href');
  if (/<!ENTITY|<!DOCTYPE/i.test(svg)) issues.push('DOCTYPE/ENTITY');
  const stack = [];
  const re = /<(\/?)([A-Za-z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let m;
  const stripped = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  while ((m = re.exec(stripped))) {
    if (m[4] === '/') continue;
    if (m[1] === '/') {
      const top = stack.pop();
      if (top !== m[2]) {
        issues.push(`tag mismatch </${m[2]}> vs <${top}>`);
        break;
      }
    } else stack.push(m[2]);
  }
  if (stack.length) issues.push(`unclosed <${stack[stack.length - 1]}>`);
  // raw '<' or '&' outside tags
  const text = stripped.replace(/<[^>]*>/g, '');
  if (/&(?!#?\w+;)/.test(text)) issues.push('bare & in text');
  return issues;
};

export const short = (s, n = 90) => {
  s = String(s).replace(/\s+/g, ' ');
  return s.length > n ? s.slice(0, n) + '…' : s;
};
