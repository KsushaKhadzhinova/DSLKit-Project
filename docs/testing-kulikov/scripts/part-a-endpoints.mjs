// A. endpoints and methods; B. body, Content-Type, JSON
import { request, post, raw, R, st, isJson, alive, J, VALID, svgIssues, short, TEMPLATES } from './ctx.mjs';

{
  const g = 'A. Endpoints and methods';
  let r = await request({ path: '/api/notations' });
  const n = isJson(r) ? JSON.parse(r.body).notations : [];
  R(
    'A01',
    g,
    'GET /api/notations',
    'GET /api/notations',
    '200, JSON, 33 notations',
    `${st(r)}, ${n.length} items, ${r.headers['content-type']}`,
    r.status === 200 && n.length === 33 && /json/.test(r.headers['content-type']),
  );
  r = await request({ path: '/api/notations?lang=en' });
  const en = isJson(r) ? JSON.parse(r.body).notations : [{}];
  R(
    'A02',
    g,
    'notations in English',
    'GET /api/notations?lang=en',
    '200, names in English',
    `${st(r)}, first name: ${en[0].name}`,
    r.status === 200 && !/[а-яА-Я]/.test(en[0].name || 'я'),
  );
  r = await request({ path: '/api/notations?lang=xx' });
  R('A03', g, 'unknown lang falls back', 'GET /api/notations?lang=xx', '200 (fallback to ru)', st(r), r.status === 200);
  r = await request({ path: '/api/notations?lang[]=en&lang=__proto__' });
  R('A04', g, 'odd lang query', 'GET /api/notations?lang[]=en&lang=__proto__', '200', st(r), r.status === 200);
  r = await request({ path: '/api/grammar' });
  R(
    'A05',
    g,
    'GET /api/grammar',
    'GET /api/grammar',
    '200, JSON with grammar',
    `${st(r)} ${short(r.body, 60)}`,
    r.status === 200 && isJson(r) && 'grammar' in JSON.parse(r.body),
  );
  for (const p of ['/api/nope', '/api/', '/api', '/api/render/', '/api/RENDER', '/api/render/x', '/api/validate.json', '/api//render']) {
    r = await request({ method: 'POST', path: p, headers: J, body: JSON.stringify({ source: VALID }) });
    R(`A06-${p}`, g, `unknown path ${p}`, `POST ${p}`, '404 JSON error', `${st(r)} ${short(r.body, 70)}`, r.status === 404 && isJson(r));
  }
  for (const [m, p] of [
    ['POST', '/api/notations'],
    ['PUT', '/api/notations'],
    ['DELETE', '/api/grammar'],
    ['PATCH', '/api/grammar'],
    ['GET', '/api/render'],
    ['GET', '/api/validate'],
    ['GET', '/api/parse'],
    ['GET', '/api/generate'],
    ['PUT', '/api/render'],
    ['DELETE', '/api/render'],
    ['PATCH', '/api/validate'],
    ['OPTIONS', '/api/render'],
    ['OPTIONS', '/api/notations'],
    ['HEAD', '/api/notations'],
    ['HEAD', '/api/render'],
    ['TRACE', '/api/render'],
  ]) {
    r = await request({ method: m, path: p, body: ['POST', 'PUT', 'PATCH'].includes(m) ? '{}' : undefined, headers: J });
    let ok = r.status === 405 && !!r.headers.allow;
    let ex = '405 with Allow header';
    if (m === 'HEAD' && p === '/api/notations') {
      ok = r.status === 200 && r.body === '';
      ex = '200 without body (HEAD = GET without body)';
    }
    if (m === 'OPTIONS') {
      ok = r.status === 204 || r.status === 200 || (r.status === 405 && !!r.headers.allow);
      ex = '204/200 with Allow, or 405 with Allow';
    }
    R(`A07-${m}${p}`, g, `${m} ${p}`, `${m} ${p}`, ex, `${st(r)} allow=${r.headers.allow ?? '-'} bodyLen=${r.body.length}`, ok);
  }
  for (const p of ['validate', 'parse', 'render', 'generate']) {
    r = await post(`/api/${p}`, { source: VALID });
    R(`A08-${p}`, g, `valid source to /api/${p}`, `POST /api/${p} {source}`, '200 JSON', `${st(r)} ${short(r.body, 60)}`, r.status === 200 && isJson(r));
  }
  r = await request({ method: 'POST', path: '/api/render', headers: { ...J, Accept: 'image/svg+xml' }, body: JSON.stringify({ source: VALID }) });
  R(
    'A09',
    g,
    'render with Accept: image/svg+xml',
    'POST /api/render Accept: image/svg+xml',
    '200, Content-Type image/svg+xml, valid SVG',
    `${st(r)} ${r.headers['content-type']} issues=${svgIssues(r.body).join(',') || 'none'}`,
    r.status === 200 && /image\/svg\+xml/.test(r.headers['content-type']) && svgIssues(r.body).length === 0,
  );
  for (const f of ['graphviz', 'mermaid', 'plantuml', 'nonsense', '', 5, null, [], {}]) {
    r = await post('/api/generate', { source: TEMPLATES.dag, format: f });
    const named = typeof f === 'string' && ['graphviz', 'mermaid', 'plantuml'].includes(f);
    const ok = named ? r.status === 200 && JSON.parse(r.body).format === f : [200, 400, 422].includes(r.status);
    R(
      `A10-${JSON.stringify(f)}`,
      g,
      `generate format=${JSON.stringify(f)}`,
      `POST /api/generate {format:${JSON.stringify(f)}}`,
      named ? '200, format as asked' : '200 (fallback) or 4xx, never 500',
      `${st(r)} format=${isJson(r) && r.status === 200 ? JSON.parse(r.body).format : '-'}`,
      ok,
    );
  }
  r = await post('/api/generate', { source: TEMPLATES['uml-timing'], format: 'graphviz' });
  R(
    'A11',
    g,
    'generate with a format the notation does not support (timing -> graphviz)',
    'POST /api/generate uml timing format=graphviz',
    '200 with fallback format, or 4xx',
    `${st(r)} format=${isJson(r) && r.status === 200 ? JSON.parse(r.body).format : '-'}`,
    r.status === 200 || r.status === 422,
  );
  r = await post('/api/validate', { source: 'diagram graph "x"\nvertex A\nedge A -- Z' });
  R(
    'A12',
    g,
    'validate reports a problem with line and severity',
    'POST /api/validate (edge to undefined vertex)',
    '200, valid=false, problems[0].line',
    `${st(r)} ${short(r.body, 120)}`,
    r.status === 200 && isJson(r) && JSON.parse(r.body).problems.length > 0 && 'line' in JSON.parse(r.body).problems[0],
  );
  r = await post('/api/render', { source: 'hello world' });
  R(
    'A13',
    g,
    'render source without header',
    'POST /api/render {source:"hello world"}',
    '422 unknown-notation',
    `${st(r)} ${short(r.body, 100)}`,
    r.status === 422,
  );
  r = await post('/api/render', { source: 'diagram nothere "x"' });
  R('A14', g, 'render with unknown notation', 'POST /api/render diagram nothere', '422', `${st(r)} ${short(r.body, 100)}`, r.status === 422);
  r = await post('/api/validate', { source: 'hello world' });
  R(
    'A15',
    g,
    'validate source without header',
    'POST /api/validate {source:"hello world"}',
    '200 valid=false (or 422), not 500',
    `${st(r)} ${short(r.body, 100)}`,
    r.status === 200 || r.status === 422,
  );
  r = await post('/api/render', { source: VALID, lang: 'en' });
  R('A16', g, 'render with lang=en', 'POST /api/render lang=en', '200', st(r), r.status === 200);
}

{
  const g = 'B. Body, Content-Type, JSON';
  const P = '/api/render';
  const t = async (id, title, opts, ex, okf, note) => {
    const r = await request({ method: 'POST', path: P, ...opts });
    R(
      id,
      g,
      title,
      `POST ${P} ${short(JSON.stringify(opts.headers ?? {}), 50)} body=${short(String(opts.body ?? ''), 50)}`,
      ex,
      `${st(r)} ${short(r.body, 90)}`,
      okf(r),
      note,
    );
    return r;
  };
  await t('B01', 'empty body, JSON', { headers: J, body: '' }, '400', (r) => r.status === 400);
  await t('B02', 'empty body, no Content-Type', { body: '' }, '400', (r) => r.status === 400);
  await t('B03', 'no body at all (Content-Length 0)', { headers: { 'Content-Length': '0' } }, '400', (r) => r.status === 400);
  await t('B04', 'broken JSON {', { headers: J, body: '{' }, '400 json', (r) => r.status === 400 && isJson(r));
  await t('B05', 'broken JSON trailing comma', { headers: J, body: '{"source":"x",}' }, '400', (r) => r.status === 400);
  await t('B06', 'JSON with BOM', { headers: J, body: '﻿' + JSON.stringify({ source: VALID }) }, '200 or 400, not 500', (r) => [200, 400].includes(r.status));
  await t('B07', 'JSON null', { headers: J, body: 'null' }, '400', (r) => r.status === 400);
  await t('B08', 'JSON array', { headers: J, body: '[1,2]' }, '400', (r) => r.status === 400);
  await t('B09', 'JSON number', { headers: J, body: '42' }, '400', (r) => r.status === 400);
  await t('B10', 'JSON string', { headers: J, body: JSON.stringify(VALID) }, '400', (r) => r.status === 400);
  await t('B11', 'JSON true', { headers: J, body: 'true' }, '400', (r) => r.status === 400);
  for (const [name, val] of [
    ['number', 5],
    ['array', [VALID]],
    ['null', null],
    ['object', { a: VALID }],
    ['boolean', true],
    ['empty string', ''],
    ['spaces only', '   \n\t '],
    ['object with toString', { toString: 'x' }],
  ]) {
    await t(`B12-${name}`, `source is ${name}`, { headers: J, body: JSON.stringify({ source: val }) }, '400', (r) => r.status === 400);
  }
  await t('B13', 'source missing', { headers: J, body: '{}' }, '400', (r) => r.status === 400);
  await t(
    'B14',
    'source with \\u0000 inside valid text',
    { headers: J, body: JSON.stringify({ source: VALID + '\u0000\nvertex Z' }) },
    '200/422, not 500',
    (r) => [200, 422, 400].includes(r.status),
  );
  await t('B15', 'source only \\u0000', { headers: J, body: JSON.stringify({ source: '\u0000' }) }, '422 or 400', (r) => [422, 400].includes(r.status));
  await t(
    'B16',
    'duplicate keys source (last wins by JSON.parse)',
    { headers: J, body: `{"source":"junk","source":${JSON.stringify(VALID)}}` },
    'no 500',
    (r) => r.status !== 500 && r.status !== 0,
  );
  await t(
    'B17',
    '__proto__ key',
    { headers: J, body: `{"__proto__":{"source":"x"},"source":${JSON.stringify(VALID)}}` },
    '200, no pollution',
    (r) => r.status === 200,
  );
  await t(
    'B18',
    'constructor key',
    { headers: J, body: `{"constructor":{"prototype":{"x":1}},"source":${JSON.stringify(VALID)}}` },
    '200',
    (r) => r.status === 200,
  );
  await t(
    'B19',
    '__proto__ as the only content (source inherited?)',
    { headers: J, body: '{"__proto__":{"source":"diagram graph \\"x\\"\\nvertex A"}}' },
    '400 (no own source)',
    (r) => r.status === 400,
  );
  await t('B20', 'lang = number', { headers: J, body: JSON.stringify({ source: VALID, lang: 5 }) }, '200 fallback', (r) => r.status === 200);
  await t('B21', 'lang = object', { headers: J, body: JSON.stringify({ source: VALID, lang: { a: 1 } }) }, '200 fallback', (r) => r.status === 200);
  await t('B22', 'lang = "__proto__"', { headers: J, body: JSON.stringify({ source: VALID, lang: '__proto__' }) }, '200', (r) => r.status === 200);
  await t('B23', 'lang = "toString"', { headers: J, body: JSON.stringify({ source: VALID, lang: 'toString' }) }, '200', (r) => r.status === 200);
  await t(
    'B24',
    'extra unknown fields',
    { headers: J, body: JSON.stringify({ source: VALID, junk: [1, 2, 3], x: { y: 1 } }) },
    '200, ignored',
    (r) => r.status === 200,
  );
  await t(
    'B25',
    'JSON deeply nested (10000 levels) in extra field',
    { headers: J, body: '{"source":' + JSON.stringify(VALID) + ',"x":' + '['.repeat(10000) + ']'.repeat(10000) + '}' },
    '200 or 400, not 500/crash',
    (r) => [200, 400].includes(r.status),
  );
  await t('B26', 'JSON nested 1e5 deep (body ~200KB)', { headers: J, body: '['.repeat(100000) + ']'.repeat(100000) }, '413 or 400', (r) =>
    [413, 400].includes(r.status),
  );
  await t('B27', 'text/plain with source', { headers: { 'Content-Type': 'text/plain' }, body: VALID }, '200', (r) => r.status === 200);
  await t('B28', 'text/plain; charset=utf-8', { headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: VALID }, '200', (r) => r.status === 200);
  await t('B29', 'no Content-Type, plain source', { body: VALID }, '200 (treated as text)', (r) => r.status === 200);
  await t(
    'B30',
    'text/plain with JSON body (taken as source text)',
    { headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ source: VALID }) },
    '422 (JSON is not a diagram)',
    (r) => r.status === 422,
  );
  await t(
    'B31',
    'application/x-www-form-urlencoded',
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'source=' + encodeURIComponent(VALID) },
    '415 (unsupported media type) or 400/422',
    (r) => [415, 400, 422].includes(r.status),
  );
  await t(
    'B32',
    'multipart/form-data',
    {
      headers: { 'Content-Type': 'multipart/form-data; boundary=x' },
      body: '--x\r\nContent-Disposition: form-data; name="source"\r\n\r\n' + VALID + '\r\n--x--',
    },
    '415 or 400/422',
    (r) => [415, 400, 422].includes(r.status),
  );
  await t('B33', 'application/xml', { headers: { 'Content-Type': 'application/xml' }, body: '<source>x</source>' }, '415 or 400/422', (r) =>
    [415, 400, 422].includes(r.status),
  );
  await t('B34', 'garbage Content-Type', { headers: { 'Content-Type': '!!;;==' }, body: VALID }, 'not 500', (r) => r.status !== 500 && r.status !== 0);
  await t(
    'B35',
    'Content-Type: application/jsonx (substring match)',
    { headers: { 'Content-Type': 'application/jsonx' }, body: JSON.stringify({ source: VALID }) },
    '415/400/422 (not JSON)',
    (r) => r.status !== 200,
    'includes("application/json") accepts any type that merely contains the substring',
  );
  await t(
    'B36',
    'Content-Type: text/plain; x=application/json',
    { headers: { 'Content-Type': 'text/plain; x=application/json' }, body: VALID },
    'treated as text/plain -> 200',
    (r) => r.status === 200,
    'Substring match makes it parsed as JSON',
  );
  await t(
    'B37',
    'Content-Type: APPLICATION/JSON (upper case)',
    { headers: { 'Content-Type': 'APPLICATION/JSON' }, body: JSON.stringify({ source: VALID }) },
    '200 (media types are case-insensitive)',
    (r) => r.status === 200,
  );
  await t(
    'B38',
    'JSON with charset=utf-16 label but utf-8 bytes',
    { headers: { 'Content-Type': 'application/json; charset=utf-16' }, body: JSON.stringify({ source: VALID }) },
    '200 or 415/400',
    (r) => [200, 415, 400].includes(r.status),
  );
  await t(
    'B39',
    'invalid UTF-8 bytes in text',
    {
      headers: { 'Content-Type': 'text/plain' },
      body: Buffer.concat([Buffer.from('diagram graph "x"\nvertex A\nvertex B'), Buffer.from([0xff, 0xfe, 0xc0, 0x80])]),
    },
    '200/422, not 500',
    (r) => [200, 422, 400].includes(r.status),
  );
  await t(
    'B40',
    'unicode, emoji, CJK in names',
    { headers: J, body: JSON.stringify({ source: 'diagram graph "Привет 😀 世界"\nvertex А\nvertex 😀\nedge А -- 😀' }) },
    '200 or 422, no 500',
    (r) => r.status === 200 || r.status === 422,
  );
  await t(
    'B41',
    'CRLF line endings',
    { headers: J, body: JSON.stringify({ source: VALID.replace(/\n/g, '\r\n') }) },
    '200, valid',
    (r) => r.status === 200 && JSON.parse(r.body).valid === true,
  );
  await t(
    'B42',
    'CR-only line endings',
    { headers: J, body: JSON.stringify({ source: VALID.replace(/\n/g, '\r') }) },
    '200, valid',
    (r) => r.status === 200 && JSON.parse(r.body).valid === true,
    'old Mac line ends',
  );
  await t('B43', 'U+2028 as line separator', { headers: J, body: JSON.stringify({ source: VALID.replace(/\n/g, ' ') }) }, '200 or 422, not 500', (r) =>
    [200, 422].includes(r.status),
  );
  await t(
    'B44',
    'lone surrogate in source',
    { headers: J, body: '{"source":"diagram graph \\"x\\"\\nvertex \\ud800"}' },
    '200/422, response is valid JSON',
    (r) => [200, 422].includes(r.status) && isJson(r),
  );
  await t(
    'B45',
    'Content-Length lower than real body',
    { headers: { ...J, 'Content-Length': '5' }, body: JSON.stringify({ source: VALID }) },
    'not 500',
    (r) => r.status !== 500,
  );
  const rr = await raw(
    `POST /api/render HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 500\r\nConnection: close\r\n\r\n{"source":"x"`,
    { timeout: 4000 },
  );
  R(
    'B46',
    g,
    'Content-Length larger than the sent body (truncated request)',
    'raw: CL=500, 13 bytes sent, then wait',
    'server stays alive for other requests',
    `${rr.why} after ${Math.round(rr.ms)} ms, status ${rr.status}`,
    await alive(),
  );
}
