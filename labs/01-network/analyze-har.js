import { HEADER_DOCS, T } from './i18n.js';

const SECURITY = ['content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options'];
export const PHASES = {
  blocked: 'Queued/Stalled',
  dns: 'DNS Lookup',
  connect: 'Initial connection',
  ssl: 'SSL',
  send: 'Request sent',
  wait: 'Waiting (TTFB)',
  receive: 'Content Download',
};

const find = (headers, name) => headers.find((h) => h.name.toLowerCase() === name)?.value;
const clip = (s) => (s.length > 80 ? `${s.slice(0, 77)}...` : s).replaceAll('|', '\\|');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const bytes = (e) => Math.max(e.response._transferSize, 0);
const mb = (n) => (n / 1048576).toFixed(2);
const count = (entries, key) => {
  const out = {};
  for (const e of entries) out[e._resourceType] = (out[e._resourceType] ?? 0) + key(e);
  return out;
};

export const summary = ({ log }) => {
  const [first] = log.entries;
  return {
    requests: log.entries.length,
    bytes: log.entries.reduce((s, e) => s + bytes(e), 0),
    types: count(log.entries, () => 1),
    onLoad: log.pages[0].pageTimings.onLoad,
    domContentLoaded: log.pages[0].pageTimings.onContentLoad,
    protocol: first.response.httpVersion,
    ttfb: first.timings.wait,
  };
};

export const bytesByType = (entries) => count(entries, bytes);

export const pick = (entries) => ['document', 'script', 'xhr'].map((t) => entries.find((e) => e._resourceType === t)).filter(Boolean);

export const headerRows = (headers, lang = 'ru', limit = 20) =>
  headers
    .filter((h) => !h.name.startsWith(':'))
    .slice(0, limit)
    .map((h) => [`\`${h.name}\``, clip(h.value), HEADER_DOCS[lang][h.name.toLowerCase()] ?? '—']);

export const cacheInfo = ({ response: { headers } }) => {
  const cacheControl = find(headers, 'cache-control');
  const maxAge = /max-age=(\d+)/.exec(cacheControl ?? '')?.[1];
  return { cacheControl, etag: find(headers, 'etag'), lastModified: find(headers, 'last-modified'), maxAge: maxAge && Number(maxAge) };
};

export const securityRows = ({ response: { headers } }, lang = 'ru') => SECURITY.map((n) => [`\`${n}\``, clip(find(headers, n) ?? T[lang].absent)]);

export const cookieRows = (entries) =>
  entries.flatMap((e) => [
    ...e.request.cookies.map((c) => [c.name, 'Cookie', e.request.url]),
    ...e.response.cookies.map((c) => [c.name, 'Set-Cookie', e.request.url]),
  ]);

export const timingRows = ({ timings }, lang = 'ru') =>
  Object.entries(PHASES).map(([k, label]) => [label, timings[k] >= 0 ? `${timings[k].toFixed(0)} ${T[lang].ms}` : '—']);

export const slowestPhase = ({ timings }) =>
  Object.entries(PHASES).reduce((best, [k, label]) => (timings[k] > best[1] ? [label, timings[k]] : best), ['—', -1])[0];

export const compareRows = (a, b) => {
  const x = summary(a);
  const y = summary(b);
  return [
    ['requests', x.requests, y.requests],
    ['transferred', mb(x.bytes), mb(y.bytes)],
    ['dcl', x.domContentLoaded, y.domContentLoaded],
    ['onload', x.onLoad, y.onLoad],
    ['ttfb', x.ttfb.toFixed(0), y.ttfb.toFixed(0)],
  ];
};

export const report = (har, slow, lang = 'ru', prefix = '3.3') => {
  const t = T[lang];
  const { log } = har;
  const s = summary(har);
  let tableNo = 0;
  let sectionNo = 0;
  const tbl = (caption, head, rows) => `${t.tableWord} ${++tableNo} – ${caption}\n\n${table(head, rows)}`;
  const section = (title, ...body) => `#### ${prefix}.${++sectionNo} ${title}\n\n${body.join('\n\n')}\n`;
  const parts = [
    section(
      t.summary,
      tbl(
        t.captions.summary,
        [t.metric, t.value],
        [
          [t.requests, s.requests],
          [t.transferred, mb(s.bytes)],
          [t.protocol, s.protocol],
          [t.dcl, s.domContentLoaded],
          [t.onload, s.onLoad],
        ],
      ),
      tbl(
        t.captions.types,
        [t.type, t.requests],
        Object.entries(s.types).sort((p, q) => q[1] - p[1]),
      ),
    ),
  ];
  for (const e of pick(log.entries)) {
    parts.push(
      section(
        `${t.reqLabel}: ${e._resourceType}, ${e.request.url}`,
        tbl(t.captions.general, [t.method, t.status], [[e.request.method, `${e.response.status} ${e.response.statusText}`.trim()]]),
        tbl(t.captions.reqHeaders, [t.header, t.hvalue, t.purpose], headerRows(e.request.headers, lang)),
        tbl(t.captions.resHeaders, [t.header, t.hvalue, t.purpose], headerRows(e.response.headers, lang)),
        tbl(t.captions.timing, [t.phase, t.time], timingRows(e, lang)),
        `${t.slowest}: ${slowestPhase(e)}.`,
      ),
    );
  }
  const biggest = log.entries.reduce((a, b) => (bytes(b) > bytes(a) ? b : a));
  parts.push(
    section(
      t.cache,
      tbl(
        t.captions.cache,
        [t.resource, 'Cache-Control', 'ETag', 'Last-Modified', 'max-age'],
        [log.entries[0], biggest].map((e) => {
          const c = cacheInfo(e);
          return [clip(e.request.url), c.cacheControl ?? '—', c.etag ?? '—', c.lastModified ?? '—', c.maxAge ?? '—'];
        }),
      ),
    ),
  );
  parts.push(section(t.security, tbl(t.captions.security, [t.header, t.hvalue], securityRows(log.entries[0], lang))));
  const cookies = cookieRows(log.entries);
  parts.push(section(t.cookie, cookies.length ? tbl(t.captions.cookies, [t.name, t.type, t.reqLabel], cookies) : t.noCookies));
  if (slow)
    parts.push(
      section(
        t.compare,
        tbl(
          t.captions.compare,
          [t.metric, t.normal, 'Fast 3G'],
          compareRows(har, slow).map(([k, ...v]) => [t[k], ...v]),
        ),
      ),
    );
  return parts.join('\n');
};
