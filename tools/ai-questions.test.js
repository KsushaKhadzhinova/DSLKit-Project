import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { createAiHandler } from './ai-api.js';
import { CLARIFY_LIMITS, checkClarify, parseExtra } from './ai-questions.js';

const KEY = 'test-key-not-real';
const BPMN = 'diagram bpmn "x"\ntask a "A"\ntask b "B"\nflow a -> b';
const NL = String.fromCharCode(10);

const run = async (handler, { method = 'POST', body, ip = '2.2.2.2' } = {}) => {
  const raw = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
  const req = Object.assign(Readable.from(raw === '' ? [] : [Buffer.from(raw)]), {
    method,
    url: '/api/ai/clarify',
    socket: ip === null ? undefined : { remoteAddress: ip },
  });
  const out = { status: 0, headers: {}, text: '' };
  const res = { writeHead: (status, headers) => Object.assign(out, { status, headers }), end: (text) => (out.text = text) };
  await handler(req, res);
  return { ...out, json: () => JSON.parse(out.text) };
};
const fakeApi = (answers) => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(JSON.parse(options.body));
    const next = answers[Math.min(calls.length - 1, answers.length - 1)];
    if (next instanceof Error) throw next;
    return { ok: true, json: async () => ({ content: [{ type: 'text', text: next }] }) };
  };
  return { fetchImpl, calls };
};
const make = (answers = [], env = { ANTHROPIC_API_KEY: KEY }) => {
  const api = fakeApi(answers);
  return { ...api, handler: createAiHandler({ env, fetchImpl: api.fetchImpl, readReference: () => 'REFERENCE' }) };
};
const noKey = () => make([], {}).handler;

test('without a key the questions and the completion come from the rules', async () => {
  const asked = await run(noKey(), { body: { step: 'questions', code: BPMN } });
  assert.equal(asked.status, 200);
  const body = asked.json();
  assert.equal(body.source, 'rules');
  assert.deepEqual(
    body.questions.map((item) => item.id),
    ['flow-start', 'flow-end'],
  );
  assert.equal('apply' in body.questions[0], false);
  const done = await run(noKey(), { body: { step: 'complete', code: BPMN, answers: [{ id: 'flow-start', answer: 'yes' }], notation: 'bpmn' } });
  assert.equal(done.json().source, 'rules');
  assert.match(done.json().code, /start start "Start"/);
});

test('with a key the model adds questions after the ones of the rules', async () => {
  const reply = 'Here: [{"text":"Who pays?","kind":"choice","options":["client","bank"]},{"text":"  "},{"text":"When?","kind":"yesno"},7]';
  const { handler, calls } = make([reply]);
  const body = (await run(handler, { body: { step: 'questions', code: BPMN, lang: 'en' } })).json();
  assert.equal(body.source, 'ai');
  assert.deepEqual(
    body.questions.map((item) => item.id),
    ['flow-start', 'flow-end', 'ai-1', 'ai-2'],
  );
  assert.equal(body.questions[2].options[1].value, 'bank');
  assert.equal(body.questions[3].kind, 'yesno');
  assert.match(calls[0].messages[0].content, /Diagram:\ndiagram bpmn/);
  assert.ok(!JSON.stringify(body).includes(KEY));
});

test('a model that fails or talks nonsense leaves the questions of the rules', async () => {
  const failing = make([new Error('down')]);
  const body = (await run(failing.handler, { body: { step: 'questions', code: BPMN } })).json();
  assert.equal(body.fallback, true);
  assert.equal(body.source, 'rules');
  const nonsense = (await run(make(['no json here']).handler, { body: { step: 'questions', code: BPMN } })).json();
  assert.equal(nonsense.questions.length, 2);
  assert.equal(nonsense.source, 'ai');
});

test('answers to the questions of the model refine the code, which must not get worse', async () => {
  const better = BPMN + NL + 'task c "C"' + NL + 'flow b -> c';
  const { handler, calls } = make(['```\n' + better + '\n```']);
  const answer = await run(handler, {
    body: {
      step: 'complete',
      code: BPMN,
      answers: [
        { id: 'flow-start', answer: 'yes' },
        { id: 'ai-1', answer: 'add C', text: 'More?' },
      ],
    },
  });
  const body = answer.json();
  assert.equal(body.source, 'ai');
  assert.equal(body.ok, true);
  assert.deepEqual(body.applied, ['flow-start', 'ai-1']);
  assert.match(calls[0].messages[0].content, /start start "Start"/);
  assert.match(calls[0].messages[0].content, /Q: More\?\nA: add C/);
});

test('a worse code is sent back once and then the result of the rules is used', async () => {
  const worse = BPMN + NL + 'flow a -> ghost';
  const retry = make([worse, worse]);
  const body = (await run(retry.handler, { body: { step: 'complete', code: BPMN, answers: [{ id: 'ai-1', answer: 'x' }] } })).json();
  assert.equal(retry.calls.length, 2);
  assert.match(retry.calls[1].messages[2].content, /more errors/);
  assert.equal(body.fallback, true);
  assert.equal(body.source, 'rules');
  const fixed = make([worse, BPMN]);
  const second = (await run(fixed.handler, { body: { step: 'complete', code: BPMN, answers: [{ id: 'ai-1', answer: 'x' }] } })).json();
  assert.equal(second.attempts, 2);
  const broken = make([new Error('down')]);
  assert.equal((await run(broken.handler, { body: { step: 'complete', code: BPMN, answers: [{ id: 'ai-1', answer: 'x' }] } })).json().fallback, true);
});

test('answers without a question of the model need no request to it', async () => {
  const { handler, calls } = make(['unused']);
  const body = (
    await run(handler, {
      body: {
        step: 'complete',
        code: BPMN,
        answers: [
          { id: 'flow-start', answer: 'yes' },
          { id: 'ai-1', answer: '  ' },
        ],
      },
    })
  ).json();
  assert.equal(calls.length, 0);
  assert.equal(body.source, 'rules');
});

test('the body is checked', async () => {
  const { handler } = make();
  const code = async (body, extra) => (await run(handler, { body, ...extra })).json().error?.code;
  assert.equal((await run(handler, { method: 'GET' })).status, 405);
  assert.equal(await code('{broken'), 'json');
  assert.equal(await code([]), 'body');
  assert.equal(await code({ step: 'x', code: BPMN }), 'step');
  assert.equal(await code({ step: 'questions', code: BPMN, lang: 'de' }), 'lang');
  assert.equal(await code({ step: 'questions', code: '  ' }), 'code');
  assert.equal(await code({ step: 'questions', code: 'x'.repeat(CLARIFY_LIMITS.code + 1) }), 'too-large');
  assert.equal(await code({ step: 'complete', code: BPMN }), 'answers');
  assert.equal(await code({ step: 'complete', code: BPMN, answers: [null] }), 'answers');
  assert.equal(await code({ step: 'complete', code: BPMN, answers: [{ id: 'a', answer: 'x'.repeat(501) }] }), 'answers');
  assert.equal((await run(handler, { body: 'x'.repeat(CLARIFY_LIMITS.body + 10) })).status, 413);
  assert.equal(checkClarify({ step: 'complete', code: BPMN, answers: [] }), null);
});

test('the limits of requests apply to the model but not to the rules', async () => {
  const { handler } = make(['[]']);
  const ask = () => run(handler, { body: { step: 'questions', code: BPMN } });
  for (let n = 0; n < 6; n += 1) assert.equal((await ask()).status, 200);
  const limited = await ask();
  assert.equal(limited.status, 429);
  assert.ok(limited.headers['Retry-After']);
  const daily = createAiHandler({ env: { ANTHROPIC_API_KEY: KEY, AI_DAILY_LIMIT: '1' }, fetchImpl: fakeApi(['[]']).fetchImpl, readReference: () => '' });
  await run(daily, { body: { step: 'questions', code: BPMN } });
  assert.equal((await run(daily, { body: { step: 'questions', code: BPMN } })).json().error.code, 'daily-limit');
  assert.equal((await run(noKey(), { body: { step: 'questions', code: BPMN } })).status, 200);
});

test('a request without a socket address is still counted', async () => {
  const { handler } = make(['[]']);
  assert.equal((await run(handler, { ip: null, body: { step: 'questions', code: BPMN } })).status, 200);
});

test('parseExtra keeps at most three sane questions', () => {
  assert.deepEqual(parseExtra('nothing'), []);
  assert.deepEqual(parseExtra('{"a":1}'), []);
  const list = parseExtra(JSON.stringify([1, 2, 3, 4].map((n) => ({ text: `q${n}`, kind: 'choice', options: ['one'] }))));
  assert.equal(list.length, 3);
  assert.equal(list[0].kind, 'text');
  assert.deepEqual(list[0].options, []);
  assert.equal(parseExtra('[{"text":"q","kind":"choice","options":"no"}]')[0].kind, 'text');
});
