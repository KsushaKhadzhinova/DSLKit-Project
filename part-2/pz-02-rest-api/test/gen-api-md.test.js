import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FILES, RU, describeSchema, fetchSpec, renderApiMd, TEXT } from '../tools/gen-api-md.mjs';

const spec = await fetchSpec();
const sentences = () => {
  const found = new Set();
  for (const item of Object.values(spec.paths)) {
    for (const op of Object.values(item)) {
      found.add(op.summary);
      for (const p of op.parameters ?? []) if (p.description) found.add(p.description);
      for (const res of Object.values(op.responses)) found.add(res.description);
    }
  }
  return [...found];
};

test('every sentence of the document has a Russian wording', () => {
  assert.deepEqual(sentences().filter((s) => !(s in RU)), []);
});

test('there is no unused Russian wording', () => {
  const used = new Set(sentences());
  assert.deepEqual(Object.keys(RU).filter((s) => !used.has(s)), []);
});

test('every operation of the document is in both files', () => {
  for (const lang of ['en', 'ru']) {
    const text = renderApiMd(spec, lang);
    for (const [route, item] of Object.entries(spec.paths)) {
      for (const method of Object.keys(item)) assert.ok(text.includes(`### ${method.toUpperCase()} \`/api${route}\``), `${lang} ${method} ${route}`);
    }
    for (const name of Object.keys(spec.components.schemas)) assert.ok(text.includes(`### ${name}\n`), `${lang} schema ${name}`);
  }
});

test('the Russian file has Russian labels and the English file has none', () => {
  assert.match(renderApiMd(spec, 'ru'), /## Операции[\s\S]*\*\*Ответы\*\*/);
  assert.doesNotMatch(renderApiMd(spec, 'en'), /[А-Яа-я]/);
});

test('required fields and allowed values come from the document', () => {
  const text = renderApiMd(spec, 'en');
  assert.match(text, /\| `name` \| yes \| string, up to 60 characters \|/);
  assert.match(text, /one of: `owner`, `editor`, `viewer`, default `viewer`/);
  assert.match(text, /other statuses \| An unexpected error \| Error/);
});

test('describeSchema handles arrays, references, formats and empty input', () => {
  assert.equal(describeSchema(undefined, TEXT.en), '');
  assert.equal(describeSchema({ $ref: '#/components/schemas/User' }, TEXT.en), 'User');
  assert.equal(describeSchema({ type: 'array', items: { type: 'integer' } }, TEXT.en), 'array of integer');
  assert.equal(describeSchema({ type: 'string', format: 'date-time', readOnly: true }, TEXT.en), 'string (date-time), read only');
  assert.equal(describeSchema({}, TEXT.ru), 'object');
});

test('the committed files are what the server describes now', () => {
  for (const lang of ['en', 'ru']) assert.equal(fs.readFileSync(new URL(`../${FILES[lang]}`, import.meta.url), 'utf8'), renderApiMd(spec, lang), `${FILES[lang]} is stale: node tools/gen-api-md.mjs`);
});

test('a pipe and a line break inside a cell cannot break a table', () => {
  const odd = structuredClone(spec);
  odd.paths['/users'].get.parameters[2].description = 'a|b\nc';
  assert.match(renderApiMd(odd, 'en'), /a\\| ?b c/);
});
