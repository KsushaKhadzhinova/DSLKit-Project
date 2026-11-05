import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { DEFAULT_MODEL, MAX_TEXT, buildSystemPrompt, createAiHandler, extractCode, handleAi } from './ai-api.js';

const GOOD = 'diagram dfd "Shop"\nentity buyer "Buyer"\nprocess p1 "Order"\nflow buyer -> p1 "order"\nflow p1 -> buyer "receipt"';
const BAD = 'diagram dfd "Shop"\nflow a -> b';
// A fake secret that exists only in this file: the tests check that it never leaves the server.
const KEY = 'test-key-not-real';
const PNG = Buffer.concat([Buffer.from([0x89]), Buffer.from('PNG'), Buffer.alloc(12)]).toString('base64');

const run = async (handler, { method = 'POST', url = '/api/ai/generate', body, ip = '1.1.1.1' } = {}) => {
  const raw = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
  const req = Object.assign(Readable.from(raw === '' ? [] : [Buffer.from(raw)]), { method, url, socket: { remoteAddress: ip } });
  const out = { status: 0, headers: {}, text: '' };
  const res = {
    writeHead: (status, headers) => Object.assign(out, { status, headers }),
    end: (text) => (out.text = text),
  };
  const handled = await handler(req, res);
  return { handled, ...out, json: () => JSON.parse(out.text) };
};

// A fake Claude API: the answers are taken from a list in order, the calls are kept.
const fakeApi = (answers) => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    const next = answers[Math.min(calls.length - 1, answers.length - 1)];
    if (next instanceof Error) throw next;
    return next.ok === false ? { ok: false, status: next.status ?? 500, json: async () => ({}) } : { ok: true, json: async () => next };
  };
  return { fetchImpl, calls };
};
const text = (value) => ({ content: [{ type: 'text', text: value }] });
const make = (answers, env = { ANTHROPIC_API_KEY: KEY }, extra = {}) => {
  const api = fakeApi(answers);
  return { ...api, handler: createAiHandler({ env, fetchImpl: api.fetchImpl, readReference: () => 'REFERENCE', ...extra }) };
};

test('extractCode takes the fenced block or the whole text', () => {
  assert.equal(extractCode('Here:\n```dsl\n' + GOOD + '\n```\nDone'), GOOD);
  assert.equal(extractCode('  ' + GOOD + '  '), GOOD);
});

test('the system prompt lists notations, the reference and the language', () => {
  const ru = buildSystemPrompt('REF', 'ru');
  assert.match(ru, /diagram bpmn/);
  assert.match(ru, /REF/);
  assert.match(ru, /Russian/);
  assert.match(buildSystemPrompt('REF', 'en'), /English/);
});

test('other paths are not answered', async () => {
  const { handler } = make([]);
  assert.equal((await run(handler, { url: '/api/render' })).handled, false);
  assert.equal((await run(handler, { url: '/index.html' })).handled, false);
  assert.equal((await run(handleAi, { url: '/api/ai/nothing' })).status, 404);
});

test('the status tells whether the key is there and never shows it', async () => {
  const on = await run(make([]).handler, { method: 'GET', url: '/api/ai/status' });
  assert.deepEqual(on.json(), { available: true, model: DEFAULT_MODEL, maxImageMb: 5 });
  assert.ok(!on.text.includes(KEY));
  const off = await run(make([], { AI_MODEL: ' custom-model ', AI_MAX_IMAGE_MB: '2' }).handler, { method: 'GET', url: '/api/ai/status' });
  assert.deepEqual(off.json(), { available: false, model: 'custom-model', maxImageMb: 2 });
  const blank = await run(make([], { ANTHROPIC_API_KEY: '  ', AI_MODEL: 5, AI_MAX_IMAGE_MB: 'x' }).handler, { method: 'GET', url: '/api/ai/status' });
  assert.deepEqual(blank.json(), { available: false, model: DEFAULT_MODEL, maxImageMb: 5 });
  assert.equal((await run(make([]).handler, { method: 'POST', url: '/api/ai/status' })).status, 405);
  assert.equal((await run(make([]).handler, { method: 'GET' })).status, 405);
});

test('the default handler reads the real environment and answers 503 without a key', async () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const answer = await run(handleAi, { body: { mode: 'idea', text: 'x' } });
    assert.equal(answer.status, 503);
    assert.equal(answer.json().error.code, 'no-key');
  } finally {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  }
});

test('an idea becomes code in one request with the headers of the API', async () => {
  const { handler, calls } = make([text('```\n' + GOOD + '\n```')]);
  const answer = await run(handler, { body: { mode: 'idea', text: 'online shop', lang: 'en', notation: 'dfd' } });
  assert.equal(answer.status, 200);
  const body = answer.json();
  assert.equal(body.code, GOOD);
  assert.equal(body.notation, 'dfd');
  assert.equal(body.attempts, 1);
  assert.deepEqual(
    body.warnings.filter((item) => item.severity === 'error'),
    [],
  );
  assert.equal(calls[0].url, 'https://api.anthropic.com/v1/messages');
  assert.equal(calls[0].options.headers['x-api-key'], KEY);
  assert.equal(calls[0].options.headers['anthropic-version'], '2023-06-01');
  assert.equal(calls[0].body.model, DEFAULT_MODEL);
  assert.match(calls[0].body.messages[0].content[0].text, /Notation: dfd/);
  assert.ok(!answer.text.includes(KEY));
});

test('a wrong answer goes back with the list of problems, then the second answer is used', async () => {
  const { handler, calls } = make([text(BAD), text(GOOD)]);
  const answer = await run(handler, { body: { mode: 'code', text: 'graph TD; A-->B', notation: 'auto' } });
  assert.equal(answer.status, 200);
  assert.equal(answer.json().attempts, 2);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].body.messages.length, 3);
  assert.match(calls[1].body.messages[2].content, /line 2/);
});

test('three wrong answers give 422 with the code and the problems', async () => {
  const { handler, calls } = make([text(BAD)]);
  const answer = await run(handler, { body: { mode: 'idea', text: 'x' } });
  assert.equal(answer.status, 422);
  assert.equal(answer.json().error.code, 'invalid-dsl');
  assert.equal(answer.json().attempts, 3);
  assert.ok(answer.json().problems.length > 0);
  assert.equal(calls.length, 3);
});

test('a picture is sent as an image block after the checks of type, size and signature', async () => {
  const { handler, calls } = make([text(GOOD)]);
  const answer = await run(handler, { body: { mode: 'image', image: PNG, mediaType: 'image/png', text: 'a shop' } });
  assert.equal(answer.status, 200);
  const content = calls[0].body.messages[0].content;
  assert.deepEqual(content[0], { type: 'image', source: { type: 'base64', media_type: 'image/png', data: PNG } });
  assert.match(content[1].text, /a shop/);
});

test('every kind of picture has its own signature', async () => {
  const kinds = {
    'image/jpeg': Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    'image/webp': Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]),
    'image/gif': Buffer.from('GIF89a....'),
  };
  for (const [mediaType, bytes] of Object.entries(kinds)) {
    const { handler } = make([text(GOOD)]);
    const answer = await run(handler, { body: { mode: 'image', image: bytes.toString('base64'), mediaType } });
    assert.equal(answer.status, 200, mediaType);
  }
  const { handler } = make([text(GOOD)]);
  const mismatch = await run(handler, { body: { mode: 'image', image: PNG, mediaType: 'image/gif' } });
  assert.equal(mismatch.status, 415);
});

test('bad requests are refused before any call to the API', async () => {
  const { handler, calls } = make([text(GOOD)]);
  const cases = [
    [{ mode: 'video', text: 'x' }, 400, 'mode'],
    [{ mode: 'idea', text: 'x', lang: 'de' }, 400, 'lang'],
    [{ mode: 'idea', text: 5 }, 400, 'text'],
    [{ mode: 'idea', text: '   ' }, 400, 'text'],
    [{ mode: 'idea' }, 400, 'text'],
    [{ mode: 'idea', text: 'x', notation: 'nope' }, 400, 'notation'],
    [{ mode: 'idea', text: 'x', notation: 3 }, 400, 'notation'],
    [{ mode: 'idea', text: 'x'.repeat(MAX_TEXT + 1) }, 413, 'too-large'],
    [{ mode: 'image', image: PNG, mediaType: 'image/bmp' }, 415, 'media-type'],
    [{ mode: 'image', image: 'not base64!', mediaType: 'image/png' }, 400, 'image'],
    [{ mode: 'image', mediaType: 'image/png' }, 400, 'image'],
    [{ mode: 'image', image: Buffer.from('plain text here').toString('base64'), mediaType: 'image/png' }, 415, 'media-type'],
    ['[1]', 400, 'body'],
    ['null', 400, 'body'],
    ['{bad', 400, 'json'],
  ];
  for (const [body, status, code] of cases) {
    const answer = await run(handler, { body });
    assert.equal(answer.status, status, JSON.stringify(body).slice(0, 60));
    assert.equal(answer.json().error.code, code);
  }
  assert.equal(calls.length, 0);
});

test('a big picture and a big body are refused', async () => {
  const { handler } = make([text(GOOD)], { ANTHROPIC_API_KEY: KEY, AI_MAX_IMAGE_MB: '0.00001' });
  const big = await run(handler, { body: { mode: 'image', image: PNG, mediaType: 'image/png' } });
  assert.equal(big.status, 413);
  assert.equal(big.json().error.code, 'image-too-large');
  const huge = await run(handler, { body: JSON.stringify({ mode: 'idea', text: 'x'.repeat(200_000) }) });
  assert.equal(huge.status, 413);
});

test('a failure of the API is a 502 without details', async () => {
  for (const answers of [[new Error('secret detail ' + KEY)], [{ ok: false, status: 401 }], [{ content: [] }], [text('   ')], [{}]]) {
    const answer = await run(make(answers).handler, { body: { mode: 'idea', text: 'x' } });
    assert.equal(answer.status, 502);
    assert.equal(answer.json().error.code, 'upstream');
    assert.ok(!answer.text.includes('secret'));
    assert.ok(!answer.text.includes(KEY));
  }
});

test('a missing reference file does not stop the request', async () => {
  const readReference = () => {
    throw new Error('no file');
  };
  const { handler } = make([text(GOOD)], { ANTHROPIC_API_KEY: KEY }, { readReference });
  assert.equal((await run(handler, { body: { mode: 'idea', text: 'x' } })).status, 200);
});

test('the default reference file is read from the docs', async () => {
  const api = fakeApi([text(GOOD)]);
  const handler = createAiHandler({ env: { ANTHROPIC_API_KEY: KEY }, fetchImpl: api.fetchImpl });
  assert.equal((await run(handler, { body: { mode: 'idea', text: 'x' } })).status, 200);
  assert.match(api.calls[0].body.system[0].text, /DSLKit language reference/);
});

test('requests per address are limited in a sliding window', async () => {
  let time = Date.UTC(2026, 0, 1, 12);
  const { handler } = make([text(GOOD)], { ANTHROPIC_API_KEY: KEY }, { now: () => time });
  const send = (ip) => run(handler, { body: { mode: 'idea', text: 'x' }, ip });
  for (let i = 0; i < 6; i += 1) assert.equal((await send('9.9.9.9')).status, 200);
  const limited = await send('9.9.9.9');
  assert.equal(limited.status, 429);
  assert.equal(limited.json().error.code, 'rate-limit');
  assert.ok(Number(limited.headers['Retry-After']) > 0);
  assert.equal((await send('8.8.8.8')).status, 200);
  time += 61_000;
  assert.equal((await send('9.9.9.9')).status, 200);
});

test('the daily ceiling is shared by all addresses and resets the next day', async () => {
  let time = Date.UTC(2026, 0, 1, 12);
  const { handler } = make([text(GOOD)], { ANTHROPIC_API_KEY: KEY, AI_DAILY_LIMIT: '2' }, { now: () => time });
  assert.equal((await run(handler, { body: { mode: 'idea', text: 'x' }, ip: 'a' })).status, 200);
  assert.equal((await run(handler, { body: { mode: 'idea', text: 'x' }, ip: 'b' })).status, 200);
  const over = await run(handler, { body: { mode: 'idea', text: 'x' }, ip: 'c' });
  assert.equal(over.status, 429);
  assert.equal(over.json().error.code, 'daily-limit');
  time += 24 * 3600 * 1000;
  assert.equal((await run(handler, { body: { mode: 'idea', text: 'x' }, ip: 'c' })).status, 200);
});

test('a request without a socket address still works and a broken response is a 500', async () => {
  const { handler } = make([text(GOOD)]);
  const req = Object.assign(Readable.from([Buffer.from(JSON.stringify({ mode: 'idea', text: 'x' }))]), { method: 'POST', url: '/api/ai/generate' });
  const out = {};
  await handler(req, { writeHead: (status) => (out.status = status), end: () => {} });
  assert.equal(out.status, 200);
  const statuses = [];
  const res = {
    writeHead: (status) => {
      statuses.push(status);
      if (statuses.length === 1) throw new Error('broken');
    },
    end: () => {},
  };
  await handler({ url: '/api/ai/status', method: 'GET' }, res);
  assert.deepEqual(statuses, [200, 500]);
});

test('warnings of a correct answer are returned and an unknown header gives 422 without a notation', async () => {
  const { handler } = make([text(GOOD + String.fromCharCode(10) + 'entity lonely "Lonely"')]);
  const answer = await run(handler, { body: { mode: 'idea', text: 'x' } });
  assert.equal(answer.status, 200);
  assert.ok(answer.json().warnings.length > 0);
  const wrong = await run(make([text('diagram zzz')]).handler, { body: { mode: 'idea', text: 'x' } });
  assert.equal(wrong.status, 422);
});
