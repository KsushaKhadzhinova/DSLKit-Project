import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { createAiHandler } from './ai-api.js';

const GOOD = 'diagram dfd "Shop"\nentity buyer "Buyer"\nprocess p1 "Order"\nflow buyer -> p1 "order"\nflow p1 -> buyer "receipt"';
const PDF = Buffer.from('%PDF-1.7 test data').toString('base64');

const run = async (handler, body) => {
  const req = Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]), {
    method: 'POST',
    url: '/api/ai/generate',
    socket: { remoteAddress: '2.2.2.2' },
  });
  const out = { status: 0, text: '' };
  const res = { writeHead: (status) => (out.status = status), end: (text) => (out.text = text) };
  await handler(req, res);
  return { status: out.status, json: JSON.parse(out.text) };
};
const make = (answers) => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(JSON.parse(options.body));
    const text = answers[Math.min(calls.length - 1, answers.length - 1)];
    return { ok: true, json: async () => ({ content: [{ type: 'text', text }] }) };
  };
  return { calls, handler: createAiHandler({ env: { ANTHROPIC_API_KEY: 'k' }, fetchImpl, readReference: () => 'REF' }) };
};

test('a PDF goes to the model as a document block', async () => {
  const { calls, handler } = make([GOOD]);
  const answer = await run(handler, { mode: 'image', image: PDF, mediaType: 'application/pdf' });
  assert.equal(answer.status, 200);
  assert.equal(calls[0].messages[0].content[0].type, 'document');
  assert.match(calls[0].messages[0].content[1].text, /Recognise the diagram/);
});

test('a file that is not a PDF is refused', async () => {
  const { handler } = make([GOOD]);
  const answer = await run(handler, { mode: 'image', image: Buffer.from('not a pdf').toString('base64'), mediaType: 'application/pdf' });
  assert.equal(answer.status, 415);
});

test('a recognised picture with prose instead of code is sent back once and then accepted', async () => {
  const { calls, handler } = make(['I see a shop diagram.', GOOD]);
  const answer = await run(handler, { mode: 'image', image: PDF, mediaType: 'application/pdf' });
  assert.equal(answer.status, 200);
  assert.equal(answer.json.attempts, 2);
  assert.match(calls[1].messages[2].content, /Look at the picture again/);
});

test('a picture that never gives code ends with 422 and the reason', async () => {
  const { handler } = make(['prose']);
  const answer = await run(handler, { mode: 'image', image: PDF, mediaType: 'application/pdf' });
  assert.equal(answer.status, 422);
  assert.match(JSON.stringify(answer.json.problems), /header/);
});
