// G. concurrency and slow clients; H. security headers; I. static server and paths
import net from 'node:net';
import { request, post, raw, R, st, alive, J, short, TEMPLATES, SECURITY } from './ctx.mjs';
import { PORT, HOST } from './lib.mjs';

{
  const g = 'G. Concurrency and slow clients';
  const body = (i) => JSON.stringify({ source: Object.values(TEMPLATES)[i % 33] });
  const t0 = performance.now();
  const rs = await Promise.all(Array.from({ length: 50 }, (_, i) => request({ method: 'POST', path: '/api/render', headers: J, body: body(i) })));
  const total = performance.now() - t0;
  const okc = rs.filter((r) => r.status === 200).length;
  R('G01', g, '50 simultaneous renders of different notations', '50 x POST /api/render in parallel', 'all 200, total < 5 s', `${okc}/50 x 200, total ${Math.round(total)} ms, max ${Math.round(Math.max(...rs.map((r) => r.ms)))} ms`, okc === 50 && total < 5000);
  const same = await Promise.all(Array.from({ length: 50 }, () => request({ method: 'POST', path: '/api/render', headers: J, body: JSON.stringify({ source: TEMPLATES.bpmn }) })));
  const uniq = new Set(same.map((r) => r.body));
  R('G02', g, '50 simultaneous identical renders give identical results', '50 x POST /api/render bpmn', 'one distinct response body', `${uniq.size} distinct`, uniq.size === 1 && same.every((r) => r.status === 200));
  const mixed = await Promise.all(Array.from({ length: 50 }, (_, i) => (i % 5 === 0 ? request({ path: '/api/notations' }) : i % 5 === 1 ? request({ method: 'POST', path: '/api/render', headers: J, body: '{' }) : i % 5 === 2 ? request({ path: '/' }) : i % 5 === 3 ? request({ method: 'PUT', path: '/api/render' }) : request({ path: '/nope' }))));
  const stat = mixed.map((r) => r.status);
  R('G03', g, '50 mixed requests in parallel (ok, error, static, 405, 404)', 'mix', 'only 200/400/404/405', `statuses: ${[...new Set(stat)].join(',')}`, stat.every((s) => [200, 400, 404, 405].includes(s)));
  const heavy = JSON.stringify({ source: 'diagram graph "x"\nmode directed\n' + Array.from({ length: 300 }, (_, i) => `vertex n${i}`).join('\n') + '\n' + Array.from({ length: 299 }, (_, i) => `edge n${i} -> n${i + 1}`).join('\n') });
  const t1 = performance.now();
  const hv = await Promise.all(Array.from({ length: 50 }, () => request({ method: 'POST', path: '/api/render', headers: J, body: heavy, timeout: 60000 })));
  const t2 = performance.now() - t1;
  R('G04', g, '50 simultaneous renders of a 150-node graph', '50 x heavy POST', 'all 200, total < 15 s', `${hv.filter((r) => r.status === 200).length}/50 x 200, total ${Math.round(t2)} ms`, hv.every((r) => r.status === 200) && t2 < 15000);
  const heavyBig = JSON.stringify({ source: 'diagram graph "x"\nmode directed\n' + Array.from({ length: 400 }, (_, i) => `vertex n${i}`).join('\n') + '\n' + Array.from({ length: 399 }, (_, i) => `edge n${i} -> n${i + 1}`).join('\n') });
  const hp = Array.from({ length: 5 }, () => request({ method: 'POST', path: '/api/render', headers: J, body: heavyBig, timeout: 60000 }));
  await new Promise((r) => setTimeout(r, 30));
  const probe = await request({ path: '/api/grammar' });
  const hr = await Promise.all(hp);
  R('G05', g, 'a light request while 5 heavy renders run (event-loop blocking)', 'GET /api/grammar during 5 x 400-node renders', 'answers < 1 s', `probe ${Math.round(probe.ms)} ms, heavy: ${hr.map((r) => Math.round(r.ms)).join('/')} ms`, probe.ms < 1000, 'Rendering is synchronous on the single Node thread, so heavy requests delay all clients');
  const slow = await new Promise((resolve) => {
    const s = net.connect(PORT, HOST);
    let got = '';
    const t = performance.now();
    let iv;
    s.on('data', (d) => (got += d));
    s.on('close', () => { clearInterval(iv); resolve({ ms: performance.now() - t, got }); });
    s.on('error', () => {});
    s.write('POST /api/render HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 1000\r\n\r\n');
    let i = 0;
    iv = setInterval(() => { if (!s.destroyed) s.write('{'); if (++i > 14) s.destroy(); }, 1000);
  });
  R('G06', g, 'slow client: header sent, then 1 body byte per second for 15 s', 'raw slow POST', 'server ends the connection by itself within ~15 s (body timeout)', `closed after ${Math.round(slow.ms)} ms${slow.ms > 14000 ? ' (by the client, server never gave up)' : ''}, response: ${short(slow.got, 60) || 'none'}`, slow.ms < 14000, 'Node defaults: requestTimeout 300 s; a slow client can hold a socket for 5 minutes');
  const sh = await raw('GET /api/notations HTTP/1.1\r\nHost: x\r\nX-A: ', { timeout: 8000 });
  R('G07', g, 'request headers never finished', 'raw: partial header, 8 s wait', 'server closes (headersTimeout) or 408 within 8 s', `${sh.why} after ${Math.round(sh.ms)} ms, status ${sh.status}`, sh.why !== 'timeout' || sh.status === 408, 'Node default headersTimeout is 60 s');
  const socks = await Promise.all(Array.from({ length: 100 }, () => new Promise((res) => { const s = net.connect(PORT, HOST); s.on('connect', () => res(s)); s.on('error', () => res(null)); })));
  const open = socks.filter(Boolean).length;
  const pr = await request({ path: '/api/grammar' });
  socks.forEach((s) => s && s.destroy());
  R('G08', g, '100 idle open connections do not block new requests', '100 idle sockets + GET', '200', `${open} open, probe ${st(pr)} ${Math.round(pr.ms)} ms`, pr.status === 200);
  const pl = await raw('GET /api/grammar HTTP/1.1\r\nHost: x\r\n\r\nGET /api/notations HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n', { timeout: 3000, keep: true });
  R('G09', g, 'HTTP pipelining: two requests in one write', 'raw', 'two 200 responses', `${(pl.text.match(/HTTP\/1\.1 200/g) || []).length} x 200`, (pl.text.match(/HTTP\/1\.1 200/g) || []).length === 2);
  R('G10', g, 'server alive after all load tests', 'GET /api/grammar', '200', (await alive()) ? '200' : 'down', await alive());
}

{
  const g = 'H. Security headers';
  const check = async (id, title, path, method = 'GET', extra = {}) => {
    const r = await request({ method, path, ...extra });
    const miss = SECURITY.filter((h) => !r.headers[h]);
    R(id, g, title, `${method} ${path}`, `all of: ${SECURITY.join(', ')}`, `${st(r)} missing: ${miss.join(', ') || 'none'}`, miss.length === 0);
    return r;
  };
  await check('H01', 'static HTML page', '/');
  await check('H02', 'static JS', '/js/script.js');
  await check('H03', 'static CSS', '/css/editor.css');
  await check('H04', '404 page', '/no-such-file');
  await check('H05', 'API GET /api/notations', '/api/notations');
  await check('H06', 'API GET /api/grammar', '/api/grammar');
  await check('H07', 'API 404', '/api/zzz', 'POST', { headers: J, body: '{}' });
  await check('H08', 'API 400', '/api/render', 'POST', { headers: J, body: '{' });
  await check('H09', 'API 405', '/api/render', 'GET');
  await check('H10', 'API 413', '/api/render', 'POST', { headers: { 'Content-Type': 'text/plain' }, body: 'a'.repeat(200000) });
  await check('H11', 'API 422', '/api/render', 'POST', { headers: { 'Content-Type': 'text/plain' }, body: 'junk' });
  await check('H12', 'static 405', '/', 'POST', { body: 'x' });
  const r = await request({ path: '/' });
  const csp = r.headers['content-security-policy'] ?? '';
  const scriptDir = csp.split(';').find((d) => d.includes('script-src')) ?? '';
  R('H13', g, 'CSP forbids inline scripts, plugins and framing', 'GET /', "script-src 'self' (no unsafe-inline), object-src 'none', frame-ancestors 'none'", short(csp, 200), /'self'/.test(scriptDir) && !/unsafe/.test(scriptDir) && /object-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp));
  R('H14', g, "CSP style-src has 'unsafe-inline'", 'GET /', "no unsafe-inline in style-src", short(csp.split(';').find((d) => d.includes('style-src')) ?? '-'), true, 'Observation (not counted): documented trade-off in server.js (SVG carries style attributes); low risk');
  R('H15', g, 'Strict-Transport-Security', 'GET /', 'not applicable on plain http://localhost', r.headers['strict-transport-security'] ?? '-', true, 'must be sent by the real HTTPS host');
  R('H16', g, 'Server / X-Powered-By not disclosed', 'GET /', 'no X-Powered-By, no version in Server', `server=${r.headers.server ?? '-'} x-powered-by=${r.headers['x-powered-by'] ?? '-'}`, !r.headers['x-powered-by'] && !/\d/.test(r.headers.server ?? ''));
  const rc = await request({ path: '/api/notations' });
  R('H17', g, 'Cache-Control on API responses', 'GET /api/notations', 'no-store', rc.headers['cache-control'] ?? '-', rc.headers['cache-control'] === 'no-store');
  R('H18', g, 'Cross-Origin-Resource-Policy', 'GET /', 'CORP present (informational)', `corp=${r.headers['cross-origin-resource-policy'] ?? '-'}`, true, 'Informational');
}

{
  const g = 'I. Static server and paths';
  const body = (r) => r.text.split('\r\n\r\n').slice(1).join('\r\n\r\n');
  const leak = (r) => /root:.*:0:0|\[extensions\]|"dependencies"|BEGIN .*PRIVATE|for 16-bit app support|import \{ handleApi/i.test(body(r));
  const rawGet = async (id, title, path, ex, okf, note) => {
    const r = await raw(`GET ${path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`, { timeout: 4000 });
    R(id, g, title, `GET ${path}`, ex, `${r.status || 'no response'} ${short(body(r), 60)}`, okf(r), note);
    return r;
  };
  const trav = [
    ['I01', '../ in path', '/../package.json'], ['I02', '../../ deep', '/../../../../../../etc/passwd'], ['I03', '%2e%2e/', '/%2e%2e/package.json'],
    ['I04', '%2e%2e%2f', '/%2e%2e%2fpackage.json'], ['I05', 'double encoded', '/%252e%252e/package.json'], ['I06', '..%5c backslash', '/..%5cpackage.json'],
    ['I07', '..\\ literal backslash', '/..\\package.json'], ['I08', 'null byte %00', '/index.html%00.png'], ['I09', 'null byte before ../', '/%00/../../package.json'],
    ['I10', 'windows drive path', '/C:/Windows/win.ini'], ['I11', 'windows drive path encoded', '/C%3A/Windows/win.ini'], ['I12', 'UNC path', '//localhost/c$/windows/win.ini'],
    ['I13', 'dots and slashes mix', '/js/../../package.json'], ['I14', 'overlong utf-8 ..', '/%c0%ae%c0%ae/package.json'], ['I15', 'absolute URL form', 'http://localhost/../package.json'],
    ['I16', 'sibling dir with the same prefix', '/../site-secret/x'], ['I17', 'NTFS stream ::$DATA', '/index.html::$DATA'], ['I18', '8.3 short name', '/PROGRA~1/x'],
    ['I19', '/etc/passwd', '/etc/passwd'], ['I20', 'semicolon param', '/..;/package.json'], ['I21', '%2e%2e%5c', '/%2e%2e%5cpackage.json'],
    ['I22', 'tools dir via ..', '/../tools/server.js'], ['I23', '.git via ..', '/../.git/config'], ['I24', 'dotfile .git inside site', '/.git/config'], ['I25', 'dotfile .env', '/.env'],
    ['I25b', 'NTFS alternate stream of a script', '/js/script.js::$DATA'], ['I25c', 'device name CON', '/CON'], ['I25d', 'device name NUL.html', '/NUL.html'],
  ];
  for (const [id, title, p] of trav) await rawGet(id, `traversal: ${title}`, p, 'no content from outside site/; 400/403/404', (r) => !leak(r) && r.status !== 500);
  let r = await request({ path: '/%' });
  R('I27', g, 'malformed percent-encoding', 'GET /%', '400', st(r), r.status === 400);
  r = await request({ path: '/%zz' });
  R('I28', g, 'malformed percent-encoding %zz', 'GET /%zz', '400', st(r), r.status === 400);
  r = await request({ path: '/%E0%A4%A' });
  R('I29', g, 'truncated UTF-8 sequence', 'GET /%E0%A4%A', '400', st(r), r.status === 400);
  r = await request({ path: '/' + 'a'.repeat(10000) });
  R('I30', g, 'URL of 10000 chars', 'GET /aaaa…', '404 / 414', st(r), [404, 414, 431, 400].includes(r.status));
  r = await request({ path: '/' + 'a'.repeat(100000) });
  R('I31', g, 'URL of 100000 chars (above Node header limit 16 KB)', 'GET /aaaa…(100k)', '414/431/400 or connection closed; server alive afterwards', st(r), (r.status === 0 || [414, 431, 400, 404].includes(r.status)) && (await alive()));
  r = await request({ path: '/index.html', headers: { 'X-Big': 'a'.repeat(20000) } });
  R('I32', g, 'header over 16 KB', 'GET with 20 KB header', '431 or closed', st(r), r.status === 431 || r.status === 0);
  r = await request({ path: '/index.html', headers: { Accept: 'text/html,' + 'application/x;q=0.1,'.repeat(700) } });
  R('I33', g, 'huge Accept header (13 KB), static page', 'GET /index.html large Accept', '200', st(r), r.status === 200);
  r = await request({ method: 'POST', path: '/api/render', headers: { ...J, Accept: 'image/svg+xml,' + 'a/b;q=0.1,'.repeat(1500) }, body: JSON.stringify({ source: TEMPLATES.graph }) });
  R('I34', g, 'huge Accept header on API (15 KB)', 'POST /api/render large Accept', '200 or 431', st(r), r.status === 200 || r.status === 431);
  r = await request({ method: 'POST', path: '/api/render', headers: { ...J, Accept: 'application/json;q=1, image/svg+xml;q=0' }, body: JSON.stringify({ source: TEMPLATES.graph }) });
  R('I35', g, 'Accept: image/svg+xml;q=0 (explicitly refused)', 'Accept: application/json, image/svg+xml;q=0', 'JSON (svg refused with q=0)', `${r.headers['content-type']}`, /json/.test(r.headers['content-type']), 'Server matches the substring and ignores q-values');
  r = await request({ method: 'POST', path: '/api/render', headers: { ...J, Accept: 'text/html' }, body: JSON.stringify({ source: TEMPLATES.graph }) });
  R('I36', g, 'Accept: text/html only', 'Accept: text/html', '200 JSON or 406', `${st(r)} ${r.headers['content-type']}`, [200, 406].includes(r.status));
  for (const m of ['HEAD', 'OPTIONS', 'PUT', 'DELETE', 'POST', 'PATCH', 'TRACE']) {
    r = await request({ method: m, path: '/index.html', body: ['PUT', 'POST', 'PATCH'].includes(m) ? 'x' : undefined });
    const ok = m === 'HEAD' ? r.status === 200 && r.body === '' : r.status === 405 && !!r.headers.allow;
    R(`I37-${m}`, g, `static ${m} /index.html`, `${m} /index.html`, m === 'HEAD' ? '200 empty body' : '405 + Allow', `${st(r)} allow=${r.headers.allow ?? '-'}`, ok);
  }
  r = await request({ method: 'OPTIONS', path: '/index.html' });
  R('I38', g, 'OPTIONS on a static page', 'OPTIONS /index.html', '204/200 + Allow (RFC 9110 9.3.7)', `${st(r)} allow=${r.headers.allow ?? '-'}`, [200, 204].includes(r.status), 'Minor: 405 for OPTIONS is legal but unusual');
  r = await request({ path: '/no-such-page' });
  R('I39', g, '404 page is the HTML page from site/errors', 'GET /no-such-page', '404 text/html with page', `${st(r)} ${r.headers['content-type']} ${short(r.body.replace(/<[^>]+>/g, ' '), 60)}`, r.status === 404 && /html/.test(r.headers['content-type']) && r.body.length > 100);
  r = await request({ path: '/no-such-file.png' });
  R('I40', g, '404 for a missing image', 'GET /no-such-file.png', '404', st(r), r.status === 404);
  r = await request({ method: 'POST', path: '/index.html', body: 'x' });
  R('I41', g, '405 page is HTML', 'POST /index.html', '405 HTML page', `${st(r)} ${r.headers['content-type']}`, r.status === 405 && /html/.test(r.headers['content-type']));
  r = await request({ path: '/%' });
  R('I42', g, '400 page is HTML', 'GET /%', '400 HTML page (site/errors/400.html exists)', `${st(r)} ${r.headers['content-type']}`, r.status === 400 && /html/.test(r.headers['content-type']));
  r = await raw('GET /../package.json HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n');
  R('I42b', g, '403 for path outside the root: error page exists', 'GET /../package.json (raw)', '403 or 404 HTML', `${r.status}`, [400, 403, 404].includes(r.status));
  for (const c of [400, 403, 404, 405, 500]) {
    const f = await request({ path: `/errors/${c}.html` });
    R(`I43-${c}`, g, `error page ${c}.html opens`, `GET /errors/${c}.html`, '200 HTML', `${st(f)} len=${f.body.length}`, f.status === 200 && f.body.length > 100);
    const inl = /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i.test(f.body) || /\son\w+=/i.test(f.body);
    R(`I44-${c}`, g, `error page ${c} has no inline script/handler (CSP)`, `GET /errors/${c}.html`, 'none', inl ? 'inline script found' : 'none', !inl);
  }
  r = await request({ path: '/errors/' });
  R('I45', g, 'directory without index.html', 'GET /errors/', '403/404, no listing', `${st(r)} ${short(r.body.replace(/<[^>]+>/g, ' '), 60)}`, [403, 404].includes(r.status) && !/Index of/i.test(r.body));
  r = await request({ path: '/js' });
  R('I46', g, 'directory without trailing slash', 'GET /js', '301/403/404, no listing', `${st(r)}`, [301, 403, 404].includes(r.status));
  r = await request({ path: '/index.html' });
  const etag = r.headers.etag;
  const r2 = await request({ path: '/index.html', headers: { 'If-None-Match': etag } });
  R('I47', g, 'conditional GET gives 304 with empty body', 'GET /index.html If-None-Match: <etag>', '304', `${st(r2)} body=${r2.body.length}`, r2.status === 304 && r2.body === '');
  const r3 = await request({ path: '/index.html', headers: { 'If-None-Match': '*' } });
  R('I48', g, 'If-None-Match: * (RFC 9110: matches any current representation)', 'GET /index.html INM: *', '304', st(r3), r3.status === 304, 'Minor: wildcard and ETag lists are not handled');
  const r4 = await request({ path: '/index.html', headers: { 'If-None-Match': `W/"zzz", ${etag}` } });
  R('I49', g, 'If-None-Match with a list of ETags', 'GET /index.html INM: a, etag', '304', st(r4), r4.status === 304, 'Minor');
  r = await request({ path: '/index.html', headers: { Range: 'bytes=0-9' } });
  R('I50', g, 'Range request', 'GET /index.html Range: bytes=0-9', '206 or 200 (full)', st(r), [200, 206].includes(r.status));
  r = await request({ path: '/index.html?x=1' });
  R('I51', g, 'query string on a static page', 'GET /index.html?x=1', '200', st(r), r.status === 200);
  r = await request({ path: '/INDEX.HTML' });
  R('I52', g, 'upper-case path of an existing file', 'GET /INDEX.HTML', '404 on a case-sensitive host; 200 on Windows FS (informational)', st(r), true, `Informational: ${st(r)}. The Windows file system is case-insensitive, so URLs are too`);
  r = await request({ path: '/index.html/' });
  R('I53', g, 'trailing slash after a file', 'GET /index.html/', '404', st(r), r.status === 404);
  r = await request({ path: '/index.html%20' });
  R('I54', g, 'trailing encoded space (Windows strips)', 'GET /index.html%20', '404', st(r), r.status === 404, 'Windows file API trims trailing spaces and dots');
  r = await request({ path: '/index.html.' });
  R('I55', g, 'trailing dot (Windows strips)', 'GET /index.html.', '404', st(r), r.status === 404, 'Windows file API trims trailing dots');
  r = await request({ path: '/js/script.js' });
  R('I56', g, 'js served as text/javascript', 'GET /js/script.js', 'text/javascript', r.headers['content-type'], /javascript/.test(r.headers['content-type']));
  for (const [id, p, mt] of [['I57', '/favicon.ico', 'image/'], ['I57b', '/manifest.webmanifest', 'manifest'], ['I57c', '/fonts/x.woff2', 'font']]) {
    r = await request({ path: p });
    R(id, g, `MIME type of ${p}`, `GET ${p}`, `404 or correct type (${mt})`, `${st(r)} ${r.headers['content-type']}`, r.status === 404 || new RegExp(mt).test(r.headers['content-type']), 'TYPES table lacks .ico/.webmanifest/.woff2/.webp/.jpg/.gif: they would go as application/octet-stream');
  }
  r = await request({ path: '/?' });
  R('I59', g, 'root with empty query', 'GET /?', '200', st(r), r.status === 200);
  r = await request({ path: '/api?x=1' });
  R('I60', g, '/api?x=1 routed to API', 'GET /api?x=1', '404 JSON', `${st(r)} ${r.headers['content-type']}`, r.status === 404 && /json/.test(r.headers['content-type']));
  r = await request({ path: '/api%2Fnotations' });
  R('I61', g, 'encoded slash /api%2Fnotations', 'GET /api%2Fnotations', '404', st(r), r.status === 404);
  r = await request({ path: '/API/notations' });
  R('I62', g, 'upper-case /API/notations', 'GET /API/notations', '404', st(r), r.status === 404);
  r = await raw('GET /api/../index.html HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n');
  R('I63', g, '/api/../index.html is answered (not left hanging)', 'GET /api/../index.html (raw)', 'any answer within 4 s (200/404)', r.status ? String(r.status) : `no answer in ${Math.round(r.ms)} ms (${r.why})`, r.status !== 500 && r.status !== 0, 'server.js calls handleApi() and returns without checking its false result; the request is never answered');
  r = await raw('GET /api/%2e%2e/index.html HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n');
  R('I63b', g, '/api/%2e%2e/index.html is answered', 'GET /api/%2e%2e/index.html (raw)', 'any answer within 4 s', r.status ? String(r.status) : `no answer in ${Math.round(r.ms)} ms`, r.status !== 0, 'same cause as I63');
  r = await request({ path: '//api/notations' });
  R('I64', g, 'double slash //api/notations', 'GET //api/notations', 'no crash', st(r), r.status !== 500 && r.status !== 0);
  const sm = await raw('POST /api/render HTTP/1.1\r\nHost: x\r\nContent-Length: 4\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n0\r\n\r\n', { timeout: 3000 });
  R('I65', g, 'Content-Length + Transfer-Encoding together', 'raw', '400 (Node rejects) or consistent', `${sm.status} ${sm.why}`, [400, 422, 0].includes(sm.status));
  const bad = await raw('GARBAGE\r\n\r\n', { timeout: 3000 });
  R('I66', g, 'garbage request line', 'raw GARBAGE', '400 from Node', `${bad.status}`, bad.status === 400 || bad.status === 0);
  const nohost = await raw('GET /api/grammar HTTP/1.1\r\nConnection: close\r\n\r\n', { timeout: 3000 });
  R('I68', g, 'HTTP/1.1 without Host', 'raw', '400 (RFC 9112 3.2)', `${nohost.status}`, nohost.status === 400, 'Node (default) answers 400 only when requireHostHeader is on; informational');
  r = await request({ path: '/api/notations', headers: { 'Accept-Encoding': 'gzip, br' } });
  R('I69', g, 'compression of large JSON', 'GET /api/notations Accept-Encoding: gzip', 'Content-Encoding: gzip (informational)', `encoding=${r.headers['content-encoding'] ?? '-'} size=${r.body.length}`, true, 'Informational: responses are not compressed');
  R('I70', g, 'server alive after all static tests', 'GET /api/grammar', '200', (await alive()) ? '200' : 'down', await alive());
}
