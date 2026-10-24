const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { startServer } = require('./harness');

// Contract between the comment endpoints and the React client of this project: the fields, headers and error shapes the client reads
// must be exactly what the server sends. The client source is read from the neighbouring folder when it is there.
const componentsDir = join(__dirname, '..', '..', 'client', 'src', 'components');

const clientFields = () => {
  if (!existsSync(componentsDir)) return null;
  const files = readdirSync(componentsDir).filter((f) => /^Comment.*\.jsx$/.test(f));
  const fields = new Set();
  for (const file of files) for (const match of readFileSync(join(componentsDir, file), 'utf8').matchAll(/\bcomment\.([a-zA-Z]+)\b/g)) fields.add(match[1]);
  fields.delete('pending');
  return [...fields];
};

test('contract: a comment has exactly the fields and types the client reads', async (t) => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('contract@example.test');
    const diagram = (await app.call('POST', '/diagrams', { token, body: { title: 'Контракт', notation: 'UML', sourceCode: 'a' } })).body;
    await app.call('POST', `/diagrams/${diagram.id}/comments`, { token, body: { text: 'Первый комментарий' } });
    const { body: list, res } = await app.call('GET', `/diagrams/${diagram.id}/comments`, { token });
    assert.ok(Array.isArray(list), 'the list answer is not an array');
    assert.equal(res.headers.get('x-total-count'), '1', 'the client reads X-Total-Count as a string of digits');
    const [record] = list;
    const types = { id: 'number', diagramId: 'number', authorId: 'number', text: 'string', createdAt: 'string', updatedAt: 'string' };
    for (const [field, type] of Object.entries(types)) assert.equal(typeof record[field], type, `${field} is not a ${type}`);
    assert.deepEqual(Object.keys(record).sort(), Object.keys(types).sort(), 'the record has fields that are not in the contract');
    assert.ok(!Number.isNaN(Date.parse(record.createdAt)));
    const wanted = clientFields();
    if (wanted === null || wanted.length === 0) t.diagnostic('the client comment components are not next to the server, only the fixed contract is checked');
    for (const field of wanted ?? []) assert.ok(field in record, `the client reads ${field} but the server does not send it`);
  } finally {
    await app.close();
  }
});

test('contract: create, change and delete answers match what the client does with them', async () => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('contract2@example.test');
    const diagram = (await app.call('POST', '/diagrams', { token, body: { title: 'D', notation: 'UML', sourceCode: 'a' } })).body;
    const created = await app.call('POST', `/diagrams/${diagram.id}/comments`, { token, body: { text: 'one' } });
    assert.equal(created.res.status, 201);
    assert.equal(typeof created.body.id, 'number', 'the client replaces its temporary id with this number');
    const patched = await app.call('PATCH', `/comments/${created.body.id}`, { token, body: { text: 'two' } });
    assert.equal(patched.res.status, 200);
    assert.equal(patched.body.text, 'two');
    assert.equal((await app.call('DELETE', `/comments/${created.body.id}`, { token })).res.status, 204);
    assert.equal((await app.call('DELETE', `/comments/${created.body.id}`, { token })).res.status, 404, 'the client treats 404 on delete as already gone');
  } finally {
    await app.close();
  }
});

test('contract: every error of the comment routes has the shape { error, details? } the client turns into a message', async () => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('contract3@example.test');
    const other = await app.tokenFor('contract4@example.test');
    const diagram = (await app.call('POST', '/diagrams', { token, body: { title: 'D', notation: 'UML', sourceCode: 'a' } })).body;
    const comment = (await app.call('POST', `/diagrams/${diagram.id}/comments`, { token, body: { text: 'one' } })).body;
    const errors = [
      await app.call('POST', `/diagrams/${diagram.id}/comments`, { token, body: { text: ' ' } }),
      await app.call('POST', `/diagrams/${diagram.id}/comments`, { token, body: { text: 'a\u0000' } }),
      await app.call('GET', `/diagrams/${diagram.id}/comments?limit=abc`, { token }),
      await app.call('GET', '/diagrams/999999/comments', { token }),
      await app.call('PATCH', '/comments/999999', { token, body: { text: 'x' } }),
      await app.call('PATCH', `/comments/${comment.id}`, { token: other, body: { text: 'x' } }),
      await app.call('DELETE', `/comments/${comment.id}`, { token: other }),
      await app.call('GET', `/diagrams/${diagram.id}/comments`),
    ];
    assert.deepEqual(
      errors.map((e) => e.res.status),
      [400, 400, 400, 404, 404, 403, 403, 401],
    );
    for (const { res, body } of errors) {
      assert.equal(typeof body.error, 'string', `${res.status}: the client reads error as a string`);
      if (body.details !== undefined) {
        assert.ok(Array.isArray(body.details));
        for (const detail of body.details) {
          assert.equal(typeof detail.field, 'string');
          assert.equal(typeof detail.message, 'string');
        }
      }
    }
  } finally {
    await app.close();
  }
});

test('contract: the preflight for PATCH on a comment is allowed for the client origin', async () => {
  const app = await startServer({ corsOrigin: 'http://localhost:5178' });
  try {
    const preflight = await fetch(`http://127.0.0.1:${app.port}/comments/1`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5178', 'Access-Control-Request-Method': 'PATCH', 'Access-Control-Request-Headers': 'authorization,content-type' },
    });
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get('access-control-allow-methods') ?? '', /PATCH/);
  } finally {
    await app.close();
  }
});
