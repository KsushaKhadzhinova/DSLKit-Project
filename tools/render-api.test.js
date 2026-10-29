import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { request } from 'node:http';
import { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { MAX_SOURCE, analyze, generateSource, handleApi, listNotations, renderSource } from './render-api.js';
import { staticServer } from './server.js';

let server;
before(async () => {
  server = staticServer(mkdtempSync(join(tmpdir(), 'api-')));
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
});
after(() => server.close());

const call = (path, { method = 'POST', body, type = 'application/json', accept } = {}) =>
  new Promise((ok, fail) => {
    const headers = { ...(type ? { 'Content-Type': type } : {}), ...(accept ? { Accept: accept } : {}) };
    const req = request({ host: '127.0.0.1', port: server.address().port, path, method, headers }, (res) => {
      let text = '';
      res.on('data', (c) => (text += c));
      res.on('end', () => ok({ status: res.statusCode, headers: res.headers, text, json: () => JSON.parse(text) }));
    });
    req.on('error', fail);
    req.end(body);
  });
const post = (path, payload, options) => call(path, { body: typeof payload === 'string' ? payload : JSON.stringify(payload), ...options });

const GOOD = 'diagram dfd "Shop"\nentity buyer "Buyer"\nprocess p1 "Order"\nflow buyer -> p1 "order"\nflow p1 -> buyer "receipt"';

test('library: notations, analyze, render and generate', () => {
  const list = listNotations('en');
  assert.ok(list.length >= 30);
  assert.equal(list.find((item) => item.id === 'uml-class').header, 'diagram uml class');
  assert.equal(listNotations('xx')[0].name, listNotations('ru')[0].name);
  assert.equal(analyze(GOOD).model.notation, 'dfd');
  assert.match(renderSource(GOOD).svg, /^<svg/);
  assert.equal(renderSource('diagram nonsense').svg, null);
  assert.equal(generateSource('diagram nonsense', 'dot').text, null);
  assert.equal(generateSource(GOOD, 'mermaid').format, 'mermaid');
});

test('handleApi leaves other paths alone', async () => {
  assert.equal(await handleApi({ url: '/index.html' }, {}), false);
});

test('GET /api/notations and /api/grammar', async () => {
  const notations = await call('/api/notations?lang=en', { method: 'GET' });
  assert.equal(notations.status, 200);
  assert.ok(notations.json().notations.some((item) => item.id === 'bpmn'));
  const grammar = await call('/api/grammar', { method: 'GET' });
  assert.match(grammar.json().grammar, /header/);
  const wrong = await call('/api/grammar', { method: 'POST', body: '{}' });
  assert.equal(wrong.status, 405);
  assert.equal(wrong.headers.allow, 'GET');
});

test('POST /api/render returns JSON, or SVG when asked', async () => {
  const asJson = await post('/api/render', { source: GOOD, lang: 'en' });
  assert.equal(asJson.status, 200);
  assert.equal(asJson.json().notation, 'dfd');
  assert.match(asJson.json().svg, /<svg/);
  const asSvg = await post('/api/render', { source: GOOD }, { accept: 'image/svg+xml' });
  assert.equal(asSvg.headers['content-type'], 'image/svg+xml; charset=utf-8');
  assert.match(asSvg.text, /^<svg/);
  const plain = await post('/api/render', GOOD, { type: 'text/plain' });
  assert.equal(plain.status, 200);
  const noType = await post('/api/render', GOOD, { type: null });
  assert.equal(noType.status, 200);
});

test('POST /api/validate reports problems with lines, in both languages', async () => {
  const bad = await post('/api/validate', { source: 'diagram dfd\nflow a -> b\nprocess p1 "X"\nflow p1 -> p1', lang: 'en' });
  const body = bad.json();
  assert.equal(body.valid, false);
  assert.ok(body.problems.every((item) => Number.isInteger(item.line) && item.message.length > 0));
  const ru = await post('/api/validate', { source: 'diagram dfd\nflow a -> b', lang: 'ru' });
  assert.match(ru.json().problems[0].message, /[А-Яа-я]/);
  assert.equal((await post('/api/validate', { source: GOOD })).json().valid, true);
});

test('POST /api/parse and /api/generate', async () => {
  assert.ok((await post('/api/parse', { source: GOOD })).json().model.nodes.length >= 2);
  const dot = await post('/api/generate', { source: GOOD, format: 'graphviz' });
  assert.match(dot.json().text, /digraph/);
  const fallback = await post('/api/generate', { source: GOOD, format: 'cobol' });
  assert.ok(['plantuml', 'mermaid', 'graphviz'].includes(fallback.json().format));
});

test('unusual input: unknown notation, UML without kind, no header', async () => {
  for (const source of ['diagram', 'diagram uml', 'diagram uml zzz', 'diagram zzz', 'diagram dfd extra "T"']) {
    const answer = await post('/api/render', { source });
    assert.ok([200, 422].includes(answer.status), source);
  }
  assert.equal((await post('/api/render', { source: 'diagram zzz' })).status, 422);
  assert.equal((await post('/api/render', { source: 'box A1 "x"\ninput: a' })).status, 200);
});

test('unusual input: hostile and broken texts never crash the server', async () => {
  const texts = [
    '<script>alert(1)</script>',
    'diagram dfd\nentity "><script>alert(1)</script> "x"',
    'diagram dfd "<img src=x onerror=alert(1)>"\nprocess p1 "</text><script>1</script>"',
    'diagram erd\n' + 'entity e1 "' + 'W'.repeat(5000) + '"',
    'diagram dfd\n' + 'process p "\\"\n'.repeat(50),
    '\u0000\u0001\u0002 diagram dfd',
    'diagram dfd\r\nprocess p1 "Win"\r\n',
    'диаграмма dfd\nпроцесс p1 "Привет 🙂"',
    'diagram dfd\n' + Array.from({ length: 300 }, (_, i) => `process p${i} "n${i}"\nflow p${i} -> p${(i + 1) % 300}`).join('\n'),
    'diagram dfd\nprocess __proto__ "x"\nprocess constructor "y"\nflow __proto__ -> constructor',
    '   \t  diagram   dfd   ',
    '// only a comment',
    'diagram bpmn\nstart s\nend e\nflow s -> s\nflow e -> s',
  ];
  for (const source of texts) {
    const answer = await post('/api/render', { source });
    assert.ok([200, 422].includes(answer.status), `${answer.status} for ${source.slice(0, 40)}`);
    if (answer.status === 200 && answer.json().svg) assert.doesNotMatch(answer.json().svg, /<script|<img/i);
    const v = await post('/api/validate', { source });
    assert.ok([200, 400].includes(v.status));
  }
});

test('unusual requests: empty, wrong types, bad JSON, huge, wrong method, unknown path', async () => {
  assert.equal((await post('/api/render', { source: '' })).status, 400);
  assert.equal((await post('/api/render', { source: '   \n ' })).status, 400);
  assert.equal((await post('/api/render', { source: 42 })).status, 400);
  assert.equal((await post('/api/render', { source: ['a'] })).status, 400);
  assert.equal((await post('/api/render', {})).status, 400);
  assert.equal((await post('/api/render', 'null')).status, 400);
  assert.equal((await post('/api/render', '[1,2]')).status, 400);
  assert.equal((await post('/api/render', '"text"')).status, 400);
  assert.equal((await post('/api/render', '{not json')).status, 400);
  assert.equal((await post('/api/render', '')).status, 400);
  assert.equal((await post('/api/render', { source: GOOD, lang: 'klingon' })).status, 200);
  assert.equal((await post('/api/render', { source: 'x'.repeat(MAX_SOURCE + 1) })).status, 413);
  assert.equal((await post('/api/render', 'x'.repeat(MAX_SOURCE * 6 + 5000), { type: 'text/plain' })).status, 413);
  assert.equal((await call('/api/render', { method: 'GET' })).status, 405);
  assert.equal((await call('/api/render', { method: 'DELETE' })).status, 405);
  assert.equal((await call('/api/render', { method: 'PUT', body: '{}' })).status, 405);
  assert.equal((await call('/api/nothing', { method: 'GET' })).status, 404);
  assert.equal((await call('/api/', { method: 'GET' })).status, 404);
  assert.equal((await call('/api/constructor', { method: 'GET' })).status, 404);
  assert.equal((await call('/api/%E0%A4%A', { method: 'GET' })).status, 404);
  assert.equal((await call('/api', { method: 'GET' })).status, 404);
});

test('an internal failure answers 500 as JSON', async () => {
  const bad = {
    url: '/api/render',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    on() {
      throw new Error('boom');
    },
  };
  let status;
  await handleApi(bad, { writeHead: (code) => (status = code), end() {} });
  assert.equal(status, 500);
});

test('answers for a source that names no known notation', async () => {
  assert.equal((await post('/api/validate', { source: 'diagram zzz' })).json().notation, null);
  assert.equal((await post('/api/parse', { source: 'diagram zzz' })).json().notation, null);
  assert.equal((await post('/api/generate', { source: 'diagram zzz' })).json().text, null);
  assert.ok((await call('/api/notations', { method: 'GET' })).json().notations.length > 0);
});

const fake = (path, { method = 'POST', body = '', type = 'application/json' } = {}) => {
  const req = Object.assign(Readable.from(body === '' ? [] : [Buffer.from(body)]), { url: path, method, headers: { 'content-type': type } });
  const res = {
    status: 0,
    text: '',
    writeHead(code) {
      this.status = code;
    },
    end(chunk = '') {
      this.text = chunk;
    },
  };
  return { req, res };
};
const svgAnswer =
  (text, status = 200) =>
  async () => ({ ok: status < 400, status, text: async () => text });

test('GET /api/engines lists the own engine and the external languages', async () => {
  const { req, res } = fake('/api/engines', { method: 'GET' });
  await handleApi(req, res);
  const body = JSON.parse(res.text);
  assert.equal(body.own.endpoint, '/api/render');
  assert.ok(body.external.some((item) => item.id === 'd2'));
  const post = fake('/api/engines');
  await handleApi(post.req, post.res);
  assert.equal(post.res.status, 405);
});

test('another language goes to the external service and its SVG comes back', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url, body: init.body };
    return svgAnswer('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>')();
  };
  const { req, res } = fake('/api/external/d2', { body: JSON.stringify({ source: 'a -> b' }) });
  await handleApi(req, res, { fetchImpl, krokiUrl: 'http://kroki.test' });
  assert.equal(res.status, 200);
  assert.deepEqual(seen, { url: 'http://kroki.test/d2/svg', body: 'a -> b' });
  assert.match(res.text, /<svg/);
});

test('the external route refuses what it cannot send and reports what the service did wrong', async () => {
  const send = async (path, options, fetchImpl) => {
    const { req, res } = fake(path, options);
    await handleApi(req, res, { fetchImpl, krokiUrl: 'http://kroki.test' });
    return res.status;
  };
  const ok = svgAnswer('<svg></svg>');
  assert.equal(await send('/api/external/cobol', { body: '{}' }, ok), 404);
  assert.equal(await send('/api/external/d2', { method: 'GET' }, ok), 405);
  assert.equal(await send('/api/external/d2', { body: '{}' }, ok), 400);
  assert.equal(await send('/api/external/d2', { body: JSON.stringify({ source: 'x'.repeat(MAX_SOURCE + 1) }) }, ok), 413);
  const body = JSON.stringify({ source: 'a' });
  assert.equal(await send('/api/external/d2', { body }, svgAnswer('syntax error', 400)), 422);
  assert.equal(await send('/api/external/d2', { body }, svgAnswer('down', 503)), 502);
  assert.equal(await send('/api/external/d2', { body }, svgAnswer('<html>not a drawing</html>')), 502);
  assert.equal(await send('/api/external/d2', { body }, async () => Promise.reject(new Error('refused'))), 502);
  assert.equal(await send('/api/external/d2', { body }, async () => Promise.reject(Object.assign(new Error('slow'), { name: 'TimeoutError' }))), 504);
});
