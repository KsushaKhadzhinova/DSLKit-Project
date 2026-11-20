import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PDF_MESSAGE, checkBaseUrl, createAsk, toGeminiBody, toOpenAiMessages } from './ai-provider.js';
import { createAiHandler } from './ai-api.js';

const SECRET = 'sk-secret-key-123';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]).toString('base64');
const GOOD = ['diagram dfd "Shop"', 'entity buyer "Buyer"', 'process p1 "Order"', 'flow buyer -> p1 "order"', 'flow p1 -> buyer "receipt"'].join('\n');

const fake = (replies) => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    const next = replies[Math.min(calls.length - 1, replies.length - 1)];
    if (next instanceof Error) throw next;
    return next.ok === false ? { ok: false, status: next.status, json: async () => ({}) } : { ok: true, json: async () => next };
  };
  return { fetchImpl, calls };
};
const chat = (content) => ({ choices: [{ message: { content } }] });
const openai = (fetchImpl, extra = {}) =>
  createAsk({ provider: 'openai', key: SECRET, baseUrl: 'https://gemini.example/v1beta/openai/', model: 'm', fetchImpl, ...extra });

test('the base URL must be https; http only for localhost, no credentials', () => {
  for (const good of ['https://a.example/v1', 'http://localhost:1/v1', 'http://127.0.0.1/v1', 'http://[::1]:5/v1'])
    assert.equal(checkBaseUrl(good), true, good);
  for (const bad of ['http://a.example/v1', 'ftp://a.example', 'https://u:p@a.example', 'https://u@a.example', 'nonsense', ''])
    assert.equal(checkBaseUrl(bad), false, bad);
  assert.throws(() => openai(fake([]).fetchImpl, { baseUrl: 'http://evil.example' }), /https/);
  assert.throws(() => createAsk({ provider: 'nope' }), /unknown/);
});

test('openai: the system message goes first, the request is a chat completion with a bearer header and no redirects', async () => {
  const api = fake([chat('hello')]);
  const messages = [
    { role: 'user', content: [{ type: 'text', text: 'hi' }] },
    { role: 'assistant', content: 'plain' },
  ];
  assert.equal(await openai(api.fetchImpl)('SYS', messages), 'hello');
  const [call] = api.calls;
  assert.equal(call.url, 'https://gemini.example/v1beta/openai/chat/completions');
  assert.equal(call.options.headers.authorization, `Bearer ${SECRET}`);
  assert.equal(call.options.redirect, 'error');
  assert.deepEqual(call.body.messages, [{ role: 'system', content: 'SYS' }, ...messages]);
  assert.equal(call.body.model, 'm');
});

test('openai: an image block becomes an image_url data URL', () => {
  const messages = toOpenAiMessages('S', [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'QUJD' } }] }]);
  assert.deepEqual(messages[1].content, [{ type: 'image_url', image_url: { url: 'data:image/png;base64,QUJD' } }]);
});

test('openai: a PDF document block is rejected with a clear message', async () => {
  const api = fake([chat('x')]);
  const pdf = [{ role: 'user', content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'QQ==' } }] }];
  await assert.rejects(openai(api.fetchImpl)('S', pdf), (error) => error.message === PDF_MESSAGE && error.code === 'pdf-provider');
  assert.equal(api.calls.length, 0);
});

test('openai: the answer may be a string or an array of parts; empty and HTTP errors fail without the key', async () => {
  assert.equal(await openai(fake([chat([{ type: 'text', text: 'a' }, 'b', { type: 'x' }, null])]).fetchImpl)('S', []), 'ab');
  for (const reply of [chat(''), chat(null), { choices: [] }, {}, { ok: false, status: 429 }, { ok: false, status: 500 }, new Error('timeout')]) {
    await assert.rejects(openai(fake([reply]).fetchImpl)('S', []), (error) => !error.message.includes(SECRET));
  }
});

test('anthropic: the request keeps the old shape', async () => {
  const api = fake([{ content: [{ type: 'text', text: 'ok' }] }]);
  const ask = createAsk({ key: SECRET, model: 'claude-x', fetchImpl: api.fetchImpl });
  assert.equal(await ask('SYS', [{ role: 'user', content: 'q' }]), 'ok');
  const [call] = api.calls;
  assert.equal(call.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(call.options.headers['x-api-key'], SECRET);
  assert.equal(call.body.system[0].text, 'SYS');
  for (const reply of [{ content: [] }, {}, { content: [{ type: 'text', text: ' ' }] }, { ok: false, status: 529 }])
    await assert.rejects(createAsk({ key: 'k', model: 'm', fetchImpl: fake([reply]).fetchImpl })('S', []));
});

const run = async (handler, { method = 'GET', url, body } = {}) => {
  const out = { status: 0, text: '' };
  const res = { writeHead: (status) => (out.status = status), end: (text) => (out.text = text) };
  const req = {
    method,
    url,
    socket: { remoteAddress: '1.1.1.1' },
    on(name, fn) {
      if (name === 'data' && body) fn(Buffer.from(JSON.stringify(body)));
      if (name === 'end') fn();
      return this;
    },
  };
  await handler(req, res);
  return { ...out, json: () => JSON.parse(out.text) };
};
const ENV = { AI_PROVIDER: 'openai', AI_API_KEY: SECRET, AI_BASE_URL: 'https://gemini.example/v1beta/openai', AI_MODEL: 'gemini-2.0-flash' };
const make = (env, replies = [chat(GOOD)]) => {
  const api = fake(replies);
  return { ...api, handler: createAiHandler({ env, fetchImpl: api.fetchImpl, readReference: () => 'R' }) };
};
const generate = (handler, body) => run(handler, { method: 'POST', url: '/api/ai/generate', body: { mode: 'idea', text: 'a flow', ...body } });

test('status reports provider and model, never the key', async () => {
  const on = await run(make(ENV).handler, { url: '/api/ai/status' });
  assert.deepEqual([on.json().available, on.json().provider, on.json().model], [true, 'openai', 'gemini-2.0-flash']);
  assert.ok(!on.text.includes(SECRET));
  const claude = await run(make({ ANTHROPIC_API_KEY: SECRET }).handler, { url: '/api/ai/status' });
  assert.equal(claude.json().provider, 'anthropic');
  assert.ok(!claude.text.includes(SECRET));
  const broken = [
    { ...ENV, AI_API_KEY: '' },
    { ...ENV, AI_MODEL: '' },
    { ...ENV, AI_BASE_URL: 'http://evil.example' },
    { ...ENV, AI_BASE_URL: undefined },
    { ...ENV, AI_PROVIDER: 'other' },
    { ANTHROPIC_API_KEY: SECRET, AI_PROVIDER: 'openai' },
  ];
  for (const env of broken) {
    const off = await run(make(env).handler, { url: '/api/ai/status' });
    assert.equal(off.json().available, false);
    assert.ok(!off.text.includes(SECRET));
  }
});

test('generate works through the openai provider and the key never appears in an answer', async () => {
  const { handler, calls } = make(ENV);
  const done = await generate(handler, {});
  assert.equal(done.status, 200);
  assert.equal(done.json().model, 'gemini-2.0-flash');
  assert.ok(!done.text.includes(SECRET));
  assert.match(calls[0].url, /gemini\.example\/v1beta\/openai\/chat\/completions$/);
  const off = await generate(make({ ...ENV, AI_API_KEY: '' }).handler, {});
  assert.equal(off.status, 503);
});

test('an upstream failure is a 502 without the key; an image reaches the model as image_url; a PDF gets a clear 415', async () => {
  const down = await generate(make(ENV, [{ ok: false, status: 429 }]).handler, {});
  assert.equal(down.status, 502);
  assert.ok(!down.text.includes(SECRET));
  const api = make(ENV);
  const shot = await generate(api.handler, { mode: 'image', mediaType: 'image/png', image: PNG });
  assert.equal(shot.status, 200);
  assert.equal(api.calls[0].body.messages[1].content[0].image_url.url, `data:image/png;base64,${PNG}`);
  const pdf = Buffer.from('%PDF-1.4 test data here').toString('base64');
  const refused = await generate(make(ENV).handler, { mode: 'image', mediaType: 'application/pdf', image: pdf });
  assert.equal(refused.status, 415);
  assert.equal(refused.json().error.code, 'pdf-provider');
  assert.match(refused.json().error.message, /PDF needs the Anthropic or the Gemini provider/);
  assert.ok(!refused.text.includes(SECRET));
});

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const gemini = (fetchImpl, model = 'gemini-3.1-flash-lite') => createAsk({ provider: 'openai', key: SECRET, baseUrl: GEMINI_BASE, model, fetchImpl });
const PDF_BLOCK = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'JVBERg==' } };

test('gemini: a PDF goes through the native generateContent API as inlineData, the key in the header only', async () => {
  const api = fake([{ candidates: [{ content: { parts: [{ text: 'diagram graph' }, {}, { text: '\nvertex a' }] } }] }]);
  const messages = [
    { role: 'user', content: [{ type: 'text', text: 'read' }, PDF_BLOCK] },
    { role: 'assistant', content: 'earlier' },
  ];
  assert.equal(await gemini(api.fetchImpl, 'models/gemini-x')('SYS', messages), 'diagram graph\nvertex a');
  const [call] = api.calls;
  assert.equal(call.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-x:generateContent');
  assert.equal(call.options.headers['x-goog-api-key'], SECRET);
  assert.equal(call.options.redirect, 'error');
  assert.ok(!call.url.includes(SECRET) && !call.options.body.includes(SECRET));
  assert.deepEqual(call.body.systemInstruction, { parts: [{ text: 'SYS' }] });
  assert.deepEqual(call.body.contents[0].parts, [{ text: 'read' }, { inlineData: { mimeType: 'application/pdf', data: 'JVBERg==' } }]);
  assert.deepEqual(call.body.contents[1], { role: 'model', parts: [{ text: 'earlier' }] });
});

test('gemini: a request without a PDF still uses the OpenAI-compatible endpoint; native failures stay clean', async () => {
  const plain = fake([chat('ok')]);
  assert.equal(await gemini(plain.fetchImpl)('S', [{ role: 'user', content: 'hi' }, { role: 'user', content: [{ type: 'text', text: 'x' }] }]), 'ok');
  assert.equal(plain.calls[0].url, `${GEMINI_BASE}chat/completions`);
  const pdf = [{ role: 'user', content: [PDF_BLOCK] }];
  await assert.rejects(gemini(fake([{ ok: false, status: 429 }]).fetchImpl)('S', pdf), /upstream status/);
  await assert.rejects(gemini(fake([{ candidates: [] }]).fetchImpl)('S', pdf), /upstream empty/);
  await assert.rejects(gemini(fake([{}]).fetchImpl)('S', pdf), /upstream empty/);
  assert.deepEqual(toGeminiBody('S', [{ role: 'user', content: 'a' }]).contents, [{ role: 'user', parts: [{ text: 'a' }] }]);
});
