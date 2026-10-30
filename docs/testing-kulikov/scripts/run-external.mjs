// K. /api/engines, /api/external/<lang> (against a mock Kroki) and the 6 x 100000 byte body limit.
// Starts its own mock Kroki (port 5297) and DSLKit server (port 5296, KROKI_URL -> mock), then writes results-external.json.
// Usage: node docs/testing-kulikov/scripts/run-external.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import { writeFileSync } from 'node:fs';

process.env.PORT = '5296';
const { request, post, raw, record, results, svgIssues, short } = await import('./lib.mjs');
const { EXTERNAL_TYPES } = await import('../../../tools/render-api.js');

const seen = [];
const mock = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    seen.push({ url: req.url, method: req.method, type: req.headers['content-type'], len: body.length });
    const type = req.url.split('/')[1];
    const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">${inner}</svg>`;
    if (body.startsWith('xss')) { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); return res.end(svg('<script>alert(1)</script><rect onload="alert(1)"/><a href="javascript:alert(1)"><text>x</text></a>')); }
    if (body.startsWith('err400')) { res.writeHead(400); return res.end('syntax error'); }
    if (body.startsWith('err404')) { res.writeHead(404); return res.end('nope'); }
    if (body.startsWith('err500')) { res.writeHead(500); return res.end('boom'); }
    if (body.startsWith('html')) { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<html><script>alert(1)</script></html>'); }
    if (body.startsWith('empty')) { res.writeHead(200); return res.end(''); }
    if (body.startsWith('hang')) return; // never answers
    if (body.startsWith('huge')) { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); res.write('<svg xmlns="http://www.w3.org/2000/svg">'); const chunk = 'a'.repeat(1 << 20); for (let i = 0; i < 100; i++) res.write(chunk); return res.end('</svg>'); }
    if (body.startsWith('xmlpre')) { res.writeHead(200); return res.end('<?xml version="1.0"?>\n<!DOCTYPE svg PUBLIC "x" "y">\n' + svg('<text>ok</text>')); }
    if (body.startsWith('slowbody')) { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); res.write('<svg xmlns="http://www.w3.org/2000/svg">'); return; }
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    res.end(svg(`<text>${type}:${body.length}</text>`));
  });
});
await new Promise((r) => mock.listen(5297, r));
let server;
const startServer = async () => {
  server = spawn(process.execPath, ['tools/serve.js', 'site', '5296'], { cwd: new URL('../../../', import.meta.url), env: { ...process.env, KROKI_URL: 'http://localhost:5297' }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { if ((await request({ path: '/api/grammar', timeout: 1000 })).status === 200) break; await new Promise((r) => setTimeout(r, 250)); }
};
await startServer();

const g = 'K. Engines, external languages, body limit';
const R = (id, title, rq, ex, ac, ok, note) => record(id, g, title, rq, ex, ac, ok, note);
const st = (r) => (r.status === 0 ? `no response (${r.error})` : String(r.status));
const J = { 'Content-Type': 'application/json' };
const isJson = (r) => { try { JSON.parse(r.body); return true; } catch { return false; } };
const ext = (type, src, opts = {}) => request({ method: 'POST', path: `/api/external/${type}`, headers: opts.headers ?? J, body: opts.raw ?? JSON.stringify({ source: src }), timeout: opts.timeout ?? 20000 });
const sec = ['content-security-policy', 'x-content-type-options'];

// ---- engines
let r = await request({ path: '/api/engines' });
let e = isJson(r) ? JSON.parse(r.body) : {};
R('K01', 'GET /api/engines', 'GET /api/engines', '200 JSON, own.notations = 33, external list', `${st(r)} own=${JSON.stringify(e.own)} external=${(e.external || []).length}`, r.status === 200 && e.own?.notations === 33 && (e.external || []).length === EXTERNAL_TYPES.length);
R('K02', 'every external endpoint is exactly /api/external/<id>', 'GET /api/engines', 'endpoint === "/api/external/" + id for all', `${(e.external || []).filter((x) => x.endpoint !== '/api/external/' + x.id).length} mismatches`, (e.external || []).every((x) => x.endpoint === '/api/external/' + x.id));
R('K03', 'engines ids are unique', 'GET /api/engines', 'no duplicates', `${new Set((e.external || []).map((x) => x.id)).size} of ${(e.external || []).length}`, new Set((e.external || []).map((x) => x.id)).size === (e.external || []).length);
for (const [m, body] of [['POST', '{}'], ['PUT', '{}'], ['DELETE', undefined], ['PATCH', '{}'], ['OPTIONS', undefined], ['HEAD', undefined], ['TRACE', undefined]]) {
  r = await request({ method: m, path: '/api/engines', body, headers: J });
  const ok = m === 'OPTIONS' ? [204, 200, 405].includes(r.status) : m === 'HEAD' ? r.status === 200 : r.status === 405 && !!r.headers.allow;
  R(`K04-${m}`, `${m} /api/engines`, `${m} /api/engines`, m === 'HEAD' ? '200 empty body' : '405 with Allow', `${st(r)} allow=${r.headers.allow ?? '-'}`, ok);
}
for (const p of ['/api/engines/', '/api/engines/x', '/api/ENGINES', '/api/engines?x=1', '/api/engines%00']) {
  r = await request({ path: p });
  R(`K05-${p}`, `variant path ${p}`, `GET ${p}`, p === '/api/engines?x=1' ? '200' : '404 JSON', `${st(r)} ${r.headers['content-type']}`, p === '/api/engines?x=1' ? r.status === 200 : r.status === 404 && isJson(r));
}
r = await request({ path: '/api/engines' });
R('K06', 'security headers on /api/engines', 'GET /api/engines', 'CSP and nosniff present', `csp=${r.headers['content-security-policy'] ? 'yes' : 'no'} nosniff=${r.headers['x-content-type-options'] ?? 'no'}`, sec.every((h) => r.headers[h]), 'Same defect as H05: API answers carry no security headers');

// ---- external: routing
r = await request({ path: '/api/external/graphviz' });
R('K10', 'GET on external endpoint', 'GET /api/external/graphviz', '405 Allow: POST', `${st(r)} allow=${r.headers.allow ?? '-'}`, r.status === 405 && r.headers.allow === 'POST');
for (const p of ['nope', '', 'GRAPHVIZ', 'graphviz/', 'graphviz/svg', '__proto__', 'constructor', 'toString', 'graphviz%00', '..%2fengines', '../engines', 'http:%2f%2fevil.example', '%67raphviz', 'graphviz%20', 'a'.repeat(5000)]) {
  r = await request({ method: 'POST', path: `/api/external/${p}`, headers: J, body: JSON.stringify({ source: 'ok' }) });
  const expected = p === '%67raphviz' ? [200, 404] : [404];
  R(`K11-${p.slice(0, 20) || 'empty'}`, `unknown language "${p.slice(0, 30)}"`, `POST /api/external/${p.slice(0, 30)}`, '404 JSON, nothing sent to upstream', `${st(r)} ${short(r.body, 70)}`, (p === '../engines' ? [405] : expected).includes(r.status) && (r.status !== 404 || isJson(r)), p === '../engines' ? 'the URL parser folds ../ into /api/engines; GET-only answer 405 is correct' : '');
}
R('K12', 'unknown language never reached the upstream', 'mock log', 'no request to a path other than /<known>/svg', `${seen.filter((s) => !/^\/[a-z0-9]+\/svg$/.test(s.url)).length} strange requests: ${seen.filter((s) => !/^\/[a-z0-9]+\/svg$/.test(s.url)).map((s) => s.url).join(',').slice(0, 100) || '-'}`, seen.every((s) => /^\/[a-z0-9]+\/svg$/.test(s.url)));
for (const m of ['PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'TRACE']) {
  r = await request({ method: m, path: '/api/external/graphviz', body: m === 'PUT' || m === 'PATCH' ? '{}' : undefined, headers: J });
  R(`K13-${m}`, `${m} on external endpoint`, `${m} /api/external/graphviz`, '405 Allow: POST', `${st(r)} allow=${r.headers.allow ?? '-'}`, m === 'OPTIONS' ? [204, 200, 405].includes(r.status) : r.status === 405 && r.headers.allow === 'POST');
}
r = await request({ method: 'POST', path: '/api/external/doesnotexist', headers: J, body: '{' });
R('K14', 'unknown language is checked before the body is read', 'POST /api/external/doesnotexist body "{"', '404 (not 400)', st(r), r.status === 404);

// ---- external: input
r = await ext('graphviz', 'ok');
let svgOk = svgIssues(r.body);
R('K20', 'valid request is proxied', 'POST /api/external/graphviz {source:"ok"}', '200 image/svg+xml, valid SVG', `${st(r)} ${r.headers['content-type']} ${short(r.body, 70)} issues=${svgOk.join(';') || 'none'}`, r.status === 200 && /image\/svg\+xml/.test(r.headers['content-type']) && svgOk.length === 0);
const last = () => seen[seen.length - 1];
R('K21', 'upstream receives POST /graphviz/svg as text/plain with the source', 'mock log', 'POST /graphviz/svg text/plain, len 2', JSON.stringify(last()), last()?.url === '/graphviz/svg' && last()?.method === 'POST' && /text\/plain/.test(last()?.type) && last()?.len === 2);
for (const t of EXTERNAL_TYPES) {
  r = await ext(t, 'ok');
  R(`K22-${t}`, `every language is routed: ${t}`, `POST /api/external/${t}`, `200, upstream path /${t}/svg`, `${st(r)} ${short(r.body, 60)}`, r.status === 200 && last()?.url === `/${t}/svg`);
}
R('K23', 'text/plain body accepted', 'POST text/plain "ok"', '200', st(await ext('d2', '', { headers: { 'Content-Type': 'text/plain' }, raw: 'ok' })), (await ext('d2', '', { headers: { 'Content-Type': 'text/plain' }, raw: 'ok' })).status === 200);
for (const [id, title, opts, expect] of [
  ['K30', 'empty body', { raw: '' }, 400], ['K31', 'broken JSON', { raw: '{' }, 400], ['K32', 'JSON null', { raw: 'null' }, 400], ['K33', 'JSON array', { raw: '["x"]' }, 400],
  ['K34', 'source number', { raw: '{"source":5}' }, 400], ['K35', 'source null', { raw: '{"source":null}' }, 400], ['K36', 'source object', { raw: '{"source":{"a":1}}' }, 400],
  ['K37', 'source spaces only', { raw: '{"source":"   "}' }, 400], ['K38', 'source empty', { raw: '{"source":""}' }, 400], ['K39', 'no source', { raw: '{}' }, 400],
]) {
  r = await ext('graphviz', '', opts);
  R(id, `external: ${title}`, `POST /api/external/graphviz ${opts.raw}`, String(expect), `${st(r)} ${short(r.body, 70)}`, r.status === expect);
}
r = await ext('graphviz', '', { raw: '{"__proto__":{"source":"x"}}' });
R('K40', 'external: __proto__ source is not inherited', 'POST {"__proto__":{"source":"x"}}', '400', st(r), r.status === 400);
r = await ext('graphviz', 'a\u0000b');
R('K41', 'external: NUL character in source', 'POST source "a\\u0000b"', '200 or 4xx, not 500', st(r), r.status !== 500 && r.status !== 0);
r = await ext('graphviz', 'ok😀Привет\r\n');
R('K42', 'external: unicode, emoji, CRLF', 'POST unicode source', '200', st(r), r.status === 200);
// boundary
for (const [id, n, exp] of [['K50', 1, 200], ['K51', 99999, 200], ['K52', 100000, 200], ['K53', 100001, 413]]) {
  r = await ext('graphviz', 'a'.repeat(n));
  R(id, `external: source of ${n} characters`, `POST /api/external/graphviz (${n} chars)`, String(exp), `${st(r)} ${short(r.body, 60)}`, r.status === exp);
}
r = await ext('graphviz', 'я'.repeat(100000));
R('K54', 'external: 100000 Cyrillic characters (200000 bytes)', 'POST source 100000 x "я"', '200 (length is at the limit)', st(r), r.status === 200);
r = await ext('graphviz', '\n'.repeat(100000));
R('K55', 'external: 100000 newlines (escaped as 200000 bytes in JSON)', 'POST source 100000 x \\n', 'at the limit but blank: 400 (only whitespace)', st(r), r.status === 400);
r = await ext('graphviz', 'a\n'.repeat(50000));
R('K56', 'external: 100000 chars with 50000 newlines', 'POST', '200', st(r), r.status === 200);
r = await ext('graphviz', '\u0001'.repeat(100000).replace(/^./, 'a'));
R('K57', 'external: 100000 control chars (JSON escape = 6 bytes each, 600 KB body)', 'POST source 100000 x \\u0001', '200 (exactly at the limit)', st(r), r.status === 200);

// ---- body limit (6 x 100000 + 1024 = 601024 bytes)
const pad = (n) => 'x'.repeat(n);
const asText = async (len, path = '/api/validate') => request({ method: 'POST', path, headers: { 'Content-Type': 'text/plain' }, body: pad(len), timeout: 30000 });
r = await asText(100000);
R('K60', 'text/plain 100000 bytes', 'POST /api/validate 100000 x "x"', '200', st(r), r.status === 200);
r = await asText(100001);
R('K61', 'text/plain 100001 characters', 'POST /api/validate 100001 x "x"', '413 (source longer than 100000)', st(r), r.status === 413);
r = await asText(601024);
R('K62', 'text/plain 601024 bytes (body limit)', 'POST 601024 bytes', '413 (source too long)', st(r), r.status === 413);
r = await asText(601025);
R('K63', 'text/plain 601025 bytes (limit + 1)', 'POST 601025 bytes', '413', st(r), r.status === 413);
r = await asText(5 * 1024 * 1024);
R('K64', 'text/plain 5 MB', 'POST 5 MB', '413', st(r), r.status === 413 || r.status === 0);
const jb = (n) => JSON.stringify({ source: '\u0001'.repeat(n) });
r = await request({ method: 'POST', path: '/api/validate', headers: J, body: jb(100000), timeout: 30000 });
R('K65', 'JSON: 100000 chars each escaped to 6 bytes (body 600013 bytes)', 'POST /api/validate', '200 (source is at the limit)', `${st(r)} ${short(r.body, 60)}`, r.status === 200);
r = await request({ method: 'POST', path: '/api/validate', headers: J, body: jb(100001) });
R('K66', 'JSON: 100001 escaped chars (body 600019 bytes)', 'POST /api/validate', '413', st(r), r.status === 413);
r = await request({ method: 'POST', path: '/api/validate', headers: J, body: JSON.stringify({ source: 'diagram graph "x"\nvertex A', pad: 'p'.repeat(700000) }) });
R('K67', 'JSON with a valid short source but 700 KB of extra field', 'POST /api/validate', '413 (body over limit) is acceptable; 200 would also be fine', st(r), [200, 413].includes(r.status));
r = await request({ method: 'POST', path: '/api/validate', headers: J, body: JSON.stringify({ source: 'diagram graph "x"\nvertex A', pad: 'p'.repeat(400000) }) });
R('K68', 'JSON with a short source and 400 KB of extra field (below body limit)', 'POST /api/validate', '200', st(r), r.status === 200);
r = await request({ method: 'POST', path: '/api/validate', headers: J, body: '{"source":"x","a":' + '['.repeat(300000) + ']'.repeat(300000) + '}' });
R('K69', 'JSON nested 300000 deep (600 KB)', 'POST /api/validate', '200, 400 or 413; server stays alive', st(r), [200, 400, 413].includes(r.status) && (await request({ path: '/api/grammar' })).status === 200);
r = await ext('graphviz', '', { raw: 'a'.repeat(601025), headers: { 'Content-Type': 'text/plain' } });
R('K70', 'external: body over limit', 'POST /api/external/graphviz 601025 bytes', '413', st(r), r.status === 413);
{
  const t0 = performance.now();
  const bigs = await Promise.all(Array.from({ length: 50 }, () => request({ method: 'POST', path: '/api/validate', headers: J, body: jb(100000), timeout: 60000 })));
  R('K71', '50 parallel requests with 600 KB bodies (30 MB in flight)', '50 x POST /api/validate 600 KB', 'all 200 within 20 s', `${bigs.filter((x) => x.status === 200).length}/50 x 200 in ${Math.round(performance.now() - t0)} ms`, bigs.every((x) => x.status === 200) && performance.now() - t0 < 20000);
}

// ---- external: upstream behaviours
r = await ext('graphviz', 'xss payload');
R('K80', 'upstream SVG with <script>/on*/javascript: is forwarded as is', 'mock returns hostile SVG', 'response must be sanitised or served so it cannot run (no <script>, no on*)', `${st(r)} ${r.headers['content-type']} issues=${svgIssues(r.body).join(';') || 'none'} nosniff=${r.headers['x-content-type-options'] ?? '-'} csp=${r.headers['content-security-policy'] ? 'yes' : '-'}`, svgIssues(r.body).length === 0 || !!r.headers['content-security-policy'], 'The server relays the SVG unchanged and sends no CSP/sandbox; opened directly in a tab it runs the script on the DSLKit origin. The editor cleans the SVG on the page, a direct caller does not get that');
r = await ext('graphviz', 'html page');
R('K81', 'upstream returns HTML', 'mock returns text/html', '502 upstream-invalid', `${st(r)} ${short(r.body, 80)}`, r.status === 502);
r = await ext('graphviz', 'empty');
R('K82', 'upstream returns an empty body', 'mock returns ""', '502', st(r), r.status === 502);
r = await ext('graphviz', 'err400 x');
R('K83', 'upstream 400 (syntax error) maps to 422', 'mock 400', '422 with code upstream-error', `${st(r)} ${short(r.body, 80)}`, r.status === 422);
r = await ext('graphviz', 'err404 x');
R('K84', 'upstream 404', 'mock 404', '502', st(r), r.status === 502);
r = await ext('graphviz', 'err500 x');
R('K85', 'upstream 500', 'mock 500', '502', st(r), r.status === 502);
R('K86', 'upstream error text is not echoed', 'mock 400 "syntax error"', 'the response carries a message but the compiler error is lost', short(r.body, 90), true, 'Informational: with 422 the user gets no line/column of the upstream syntax error');
r = await ext('graphviz', 'xmlpre');
R('K87', 'upstream SVG with <?xml> and DOCTYPE prolog is accepted', 'mock prolog', '200', st(r), r.status === 200);
{
  const t0 = performance.now();
  r = await ext('graphviz', 'hang forever', { timeout: 20000 });
  const ms = performance.now() - t0;
  R('K88', 'upstream never answers: timeout', 'mock hangs', '504 upstream-timeout after about 10 s', `${st(r)} after ${Math.round(ms)} ms ${short(r.body, 60)}`, r.status === 504 && ms > 9000 && ms < 13000);
}
{
  const t0 = performance.now();
  r = await ext('graphviz', 'slowbody never ends', { timeout: 25000 });
  const ms = performance.now() - t0;
  const alive89 = (await request({ path: '/api/grammar', timeout: 3000 })).status === 200;
  R('K89b', 'server process survives an upstream that stalls mid-body', 'same request as K89', 'server keeps running', alive89 ? 'alive' : `server process exited (code ${server.exitCode}): unhandled TimeoutError from answer.text()`, alive89, 'In render-api.js the call is `return external(...)` inside try without await, so the rejection is not caught by the catch, and server.js does not catch the promise of handleApi: Node terminates on the unhandled rejection');
  if (!alive89) await startServer();
  R('K89', 'upstream sends headers but never finishes the body', 'mock sends part of the body and stalls', '504/502 within about 10 s (timeout covers the body)', `${st(r)} after ${Math.round(ms)} ms`, [502, 504].includes(r.status) && ms < 13000, 'AbortSignal.timeout also aborts answer.text() in modern Node, so the request is cut');
}
{
  const t0 = performance.now();
  r = await ext('graphviz', 'huge response', { timeout: 30000 });
  R('K90', 'upstream returns 100 MB of SVG', 'mock 100 MB', 'refused (502/413) - memory of the server must be bounded', `${st(r)} ${Math.round(r.body.length / 1048576)} MB in ${Math.round(performance.now() - t0)} ms`, r.status !== 200, 'answer.text() buffers the whole upstream body; there is no size limit on what is relayed to the client');
}
{
  const t0 = performance.now();
  const rs = await Promise.all(Array.from({ length: 20 }, () => ext('graphviz', 'hang', { timeout: 30000 })));
  const ms = performance.now() - t0;
  const probe = await request({ path: '/api/grammar' });
  if (server.exitCode !== null) await startServer();
R('K91', '20 parallel requests to a hanging upstream do not block the server', '20 x hang', 'all 504 in about 10 s, other requests still answered', `${rs.filter((x) => x.status === 504).length}/20 x 504 in ${Math.round(ms)} ms, probe ${st(probe)}`, rs.every((x) => x.status === 504) && ms < 14000 && probe.status === 200);
}
r = await request({ method: 'POST', path: '/api/external/graphviz', headers: { ...J, Accept: 'application/json' }, body: JSON.stringify({ source: 'ok' }) });
R('K92', 'Accept: application/json on a SVG-only endpoint', 'Accept: application/json', '200 SVG or 406', `${st(r)} ${r.headers['content-type']}`, [200, 406].includes(r.status));
r = await ext('graphviz', 'ok');
R('K93', 'external answer headers', 'POST /api/external/graphviz', 'Cache-Control: no-store, nosniff, CSP', `cache=${r.headers['cache-control']} nosniff=${r.headers['x-content-type-options'] ?? '-'} csp=${r.headers['content-security-policy'] ? 'yes' : '-'}`, r.headers['cache-control'] === 'no-store' && !!r.headers['x-content-type-options'] && !!r.headers['content-security-policy'], 'No-store is set, security headers are not');
r = await request({ method: 'POST', path: '/api/external/graphviz', headers: { 'Content-Type': 'text/plain', Origin: 'http://evil.example' }, body: 'ok' });
R('K94', 'external: cross-origin simple request (text/plain) is processed', 'POST text/plain with Origin: evil.example', 'no ACAO header; the call costs only a proxy hop', `${st(r)} ACAO=${r.headers['access-control-allow-origin'] ?? '-'}`, !r.headers['access-control-allow-origin'], 'Any web page can make a visitor browser send diagrams to the server (open proxy for Kroki), no cookies involved');

// ---- real outbound check: default KROKI_URL is https://kroki.io - only inspected, not called
R('K95', 'default upstream is the public https://kroki.io (privacy)', 'source of render-api.js', 'user diagrams leave the server only on explicit /api/external/* calls', 'krokiUrl default = process.env.KROKI_URL ?? "https://kroki.io"', true, 'Informational: diagram text is sent to a third party unless KROKI_URL is set; CSP connect-src also allows https://kroki.io');

server.kill();
mock.close();
writeFileSync(new URL('./results-external.json', import.meta.url), JSON.stringify(results, null, 1));
console.log(`checks: ${results.length}, pass: ${results.filter((x) => x.pass).length}, fail: ${results.filter((x) => !x.pass).length}`);
for (const x of results.filter((x) => !x.pass)) console.log(`FAIL ${x.id} ${x.title} -> ${x.actual}`);
process.exit(0);
