import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { createAiHandler } from './ai-api.js';
import { MAX_AI_VARIANTS, acceptVariants, buildReviewSystem, buildReviewTask, parseVariants, reviewWithAi } from './ai-review.js';

const NL = String.fromCharCode(10);
const src = (...lines) => lines.join(NL);
const BROKEN = src('diagram bpmn "T"', 'start s', 'task a', 'end e', 'flow s -> a', 'flow a -> ghost');
const FIXED = src('diagram bpmn "T"', 'start s', 'task a', 'end e', 'flow s -> a', 'flow a -> e');
const ALTERNATIVE = src('diagram bpmn "T"', 'start s', 'task a "Do"', 'end e', 'flow s -> a', 'flow a -> e');
const KEY = 'test-key-not-real';

test('the system prompt asks for JSON in the language of the user and carries the reference', () => {
  assert.match(buildReviewSystem('REF', 'ru'), /Russian/);
  assert.match(buildReviewSystem('REF', 'en'), /English/);
  assert.match(buildReviewSystem('REF', 'en'), /JSON ONLY/);
  assert.match(buildReviewSystem('REF', 'en'), /REF/);
});

test('the task lists the problems of the parser in the language and leaves out the remarks', () => {
  const issues = [
    { severity: 'error', line: 6, message: { ru: 'ошибка', en: 'an error' } },
    { severity: 'info', line: 2, message: { ru: 'совет', en: 'a hint' } },
  ];
  const en = buildReviewTask(BROKEN, issues, 'en');
  assert.match(en, /line 6 \[error\] an error/);
  assert.doesNotMatch(en, /a hint/);
  assert.match(en, /flow a -> ghost/);
  assert.match(buildReviewTask(BROKEN, issues, 'ru'), /ошибка/);
  assert.match(buildReviewTask(BROKEN, [], 'en'), /- none/);
});

test('parseVariants finds the JSON however it is wrapped and ignores the rest', () => {
  const list = [{ code: 'x' }];
  assert.deepEqual(parseVariants(JSON.stringify({ variants: list })), list);
  assert.deepEqual(parseVariants('Here you go:' + NL + '```json' + NL + JSON.stringify({ variants: list }) + NL + '```'), list);
  assert.deepEqual(parseVariants(JSON.stringify(list)), list);
  assert.deepEqual(parseVariants('{}'), []);
  assert.deepEqual(parseVariants('no json at all'), []);
  assert.deepEqual(parseVariants('{ broken'), []);
  assert.deepEqual(parseVariants('{ "a": }'), []);
  assert.deepEqual(parseVariants('} before {'), []);
});

test('acceptVariants keeps whole, new, better codes and at most two of them', () => {
  const worse = src('diagram bpmn "T"', 'task a', 'flow a -> ghost', 'flow a -> ghost2');
  const list = [
    null,
    { code: 42 },
    { code: '   ' },
    { code: BROKEN },
    { code: worse },
    { code: FIXED, title: '  Linked to the end  ', changes: ['Linked', '', 7, 'x'.repeat(300)] },
    { code: FIXED },
    { code: ALTERNATIVE },
    { code: src('diagram bpmn "T"', 'start s', 'task a', 'end e', 'flow s -> a', 'flow a -> e', 'task b') },
  ];
  const accepted = acceptVariants(list, BROKEN);
  assert.equal(accepted.length, MAX_AI_VARIANTS);
  assert.equal(accepted[0].id, 'ai-1');
  assert.equal(accepted[0].source, 'ai');
  assert.deepEqual(accepted[0].title, { ru: 'Linked to the end', en: 'Linked to the end' });
  assert.equal(accepted[0].code, FIXED);
  assert.equal(accepted[0].errors, 0);
  assert.equal(accepted[0].changes.length, 2);
  assert.equal(accepted[0].changes[1].en.length, 200);
  assert.deepEqual(accepted[1].title, { ru: 'Вариант ИИ', en: 'AI variant' });
  assert.deepEqual(accepted[1].changes, []);
  assert.deepEqual(acceptVariants('nothing', BROKEN), []);
  assert.deepEqual(acceptVariants([{ code: FIXED }], BROKEN, [FIXED]), []);
  const warned = src('diagram dfd "T"', 'process a', 'process b', 'flow a -> b "x"', 'flow b -> a "y"');
  const lessWarnings = src('diagram dfd "T"', 'process a', 'process b', 'flow a -> b "x"', 'flow b -> a "y"', 'flow a -> a "z"');
  assert.deepEqual(acceptVariants([{ code: lessWarnings }], warned), []);
  const named = src('diagram dfd "T"', 'process a "A"', 'process b "B"', 'flow a -> b "x"', 'flow b -> a "y"');
  assert.equal(acceptVariants([{ code: named }], warned).length, 0);
});

test('without a way to ask, the review is the deterministic one', async () => {
  const result = await reviewWithAi({ code: BROKEN, lang: 'en' });
  assert.equal(result.ai, false);
  assert.ok(result.variants.length > 0);
  assert.equal(result.aiError, undefined);
  assert.ok(result.issues.some((item) => item.rule === 'unknown-ref'));
});

test('the answer of the model adds the variants that pass the validator', async () => {
  const seen = [];
  const ask = async (system, messages) => {
    seen.push({ system, messages });
    return JSON.stringify({ variants: [{ title: 'Own', code: ALTERNATIVE, changes: ['relabelled'] }, { code: BROKEN }] });
  };
  const result = await reviewWithAi({ code: BROKEN, lang: 'en', ask, reference: 'REF', model: 'm' });
  assert.equal(result.ai, true);
  assert.equal(result.model, 'm');
  assert.equal(seen[0].messages[0].role, 'user');
  assert.match(seen[0].system, /REF/);
  const own = result.variants.filter((item) => item.source === 'ai');
  assert.deepEqual(
    own.map((item) => item.code),
    [ALTERNATIVE],
  );
  assert.ok(result.variants.length > own.length, 'the deterministic variants stay');
});

test('a failing service or an answer that is not JSON leaves the deterministic review', async () => {
  const failed = await reviewWithAi({
    code: BROKEN,
    ask: async () => {
      throw new Error('down');
    },
  });
  assert.equal(failed.ai, false);
  assert.equal(failed.aiError, 'upstream');
  assert.ok(failed.variants.length > 0);
  const chatter = await reviewWithAi({ code: BROKEN, ask: async () => 'I cannot help with that' });
  assert.equal(chatter.ai, true);
  assert.ok(chatter.variants.every((item) => item.source === undefined));
});

// ----- through the handler of the server
const run = async (handler, body) => {
  const raw = JSON.stringify(body);
  const req = Object.assign(Readable.from([Buffer.from(raw)]), { method: 'POST', url: '/api/ai/generate', socket: { remoteAddress: '9.9.9.9' } });
  const out = { status: 0, text: '' };
  const res = {
    writeHead: (status) => (out.status = status),
    end: (text) => (out.text = text),
  };
  await handler(req, res);
  return { status: out.status, json: () => JSON.parse(out.text), text: out.text };
};
const apiThat = (answer) => {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, options) => {
      calls.push(JSON.parse(options.body));
      if (answer instanceof Error) throw answer;
      return { ok: true, json: async () => ({ content: [{ type: 'text', text: answer }] }) };
    },
  };
};

test('the mode review of the endpoint returns the review with the variants of the model', async () => {
  const api = apiThat(JSON.stringify({ variants: [{ title: 'Own', code: ALTERNATIVE }] }));
  const handler = createAiHandler({ env: { ANTHROPIC_API_KEY: KEY }, fetchImpl: api.fetchImpl, readReference: () => 'REFERENCE' });
  const answer = await run(handler, { mode: 'review', text: BROKEN, lang: 'en' });
  assert.equal(answer.status, 200);
  const body = answer.json();
  assert.equal(body.ai, true);
  assert.ok(body.issues.length > 0);
  assert.ok(body.variants.some((item) => item.source === 'ai'));
  assert.ok(!answer.text.includes(KEY));
  assert.match(api.calls[0].system[0].text, /REFERENCE/);
  assert.match(api.calls[0].messages[0].content, /ghost/);
});

test('the mode review keeps the checks and the limits of the endpoint and falls back when the service fails', async () => {
  const down = apiThat(new Error('offline'));
  const handler = createAiHandler({ env: { ANTHROPIC_API_KEY: KEY }, fetchImpl: down.fetchImpl, readReference: () => 'R' });
  const fallback = await run(handler, { mode: 'review', text: BROKEN });
  assert.equal(fallback.status, 200);
  assert.equal(fallback.json().ai, false);
  assert.equal(fallback.json().aiError, 'upstream');
  assert.ok(fallback.json().variants.length > 0);
  assert.equal((await run(handler, { mode: 'review' })).status, 400);
  assert.equal((await run(handler, { mode: 'review', text: 'x'.repeat(30_000) })).status, 413);
  const keyless = createAiHandler({ env: {}, fetchImpl: down.fetchImpl });
  assert.equal((await run(keyless, { mode: 'review', text: BROKEN })).status, 503);
});
