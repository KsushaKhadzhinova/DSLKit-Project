const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./harness');
const { commentProblem } = require('../src/middleware/validate');
const { LIMITS } = require('../src/models/diagram.constants');

const DIAGRAM = { title: 'Order flow', notation: 'BPMN', sourceCode: 'a -> b', priority: 'low' };

// Registers an owner with one diagram and returns what the tests need.
const setup = async () => {
  const app = await startServer();
  const owner = await app.tokenFor('owner@example.test');
  const diagram = (await app.call('POST', '/diagrams', { token: owner, body: DIAGRAM })).body;
  return { app, owner, diagram };
};

test('unit: the comment check accepts normal text and names the problem otherwise', () => {
  assert.equal(commentProblem('Looks good'), true);
  assert.equal(commentProblem('line one\nline two\ttab'), true);
  assert.equal(commentProblem('x'.repeat(LIMITS.comment)), true);
  assert.match(commentProblem('x'.repeat(LIMITS.comment + 1)), /at most 1000 characters/);
  assert.match(commentProblem('   '), /non-empty/);
  assert.match(commentProblem('​‍'), /non-empty/);
  assert.match(commentProblem(undefined), /non-empty/);
  assert.match(commentProblem(42), /non-empty/);
  assert.match(commentProblem('a\u0000b'), /control characters/);
  assert.match(commentProblem('a\u001bb'), /control characters/);
  assert.match(commentProblem('a\u007fb'), /control characters/);
});

test('a comment is created for a diagram: 201, Location, author from the token, text trimmed', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const { res, body } = await app.call('POST', `/diagrams/${diagram.id}/comments`, { token: owner, body: { text: '  First!  ' } });
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('location'), `/comments/${body.id}`);
    const me = await app.models.User.findOne({ where: { email: 'owner@example.test' } });
    assert.deepEqual({ diagramId: body.diagramId, authorId: body.authorId, text: body.text }, { diagramId: diagram.id, authorId: me.id, text: 'First!' });
    assert.deepEqual(Object.keys(body).sort(), ['authorId', 'createdAt', 'diagramId', 'id', 'text', 'updatedAt']);
  } finally {
    await app.close();
  }
});

test('any signed-in user may read and write comments on any diagram', async () => {
  const { app, diagram } = await setup();
  try {
    const guest = await app.tokenFor('reader@example.test');
    assert.equal((await app.call('POST', `/diagrams/${diagram.id}/comments`, { token: guest, body: { text: 'From another user' } })).res.status, 201);
    const list = await app.call('GET', `/diagrams/${diagram.id}/comments`, { token: guest });
    assert.equal(list.res.status, 200);
    assert.equal(list.body.length, 1);
  } finally {
    await app.close();
  }
});

test('the list is paged, oldest first, with the total in X-Total-Count', async () => {
  const { app, owner, diagram } = await setup();
  try {
    for (let i = 1; i <= 25; i += 1) await app.call('POST', `/diagrams/${diagram.id}/comments`, { token: owner, body: { text: `Comment ${i}` } });
    const first = await app.call('GET', `/diagrams/${diagram.id}/comments?limit=10&offset=0`, { token: owner });
    assert.equal(first.body.length, 10);
    assert.equal(first.res.headers.get('x-total-count'), '25');
    assert.equal(first.body[0].text, 'Comment 1');
    const last = await app.call('GET', `/diagrams/${diagram.id}/comments?limit=10&offset=20`, { token: owner });
    assert.deepEqual(
      last.body.map((c) => c.text),
      ['Comment 21', 'Comment 22', 'Comment 23', 'Comment 24', 'Comment 25'],
    );
    const newest = await app.call('GET', `/diagrams/${diagram.id}/comments?limit=1&sort=id&order=desc`, { token: owner });
    assert.equal(newest.body[0].text, 'Comment 25');
    const all = await app.call('GET', `/diagrams/${diagram.id}/comments`, { token: owner });
    assert.equal(all.body.length, 25);
  } finally {
    await app.close();
  }
});

test('the list shows only the comments of the asked diagram', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const other = (await app.call('POST', '/diagrams', { token: owner, body: { ...DIAGRAM, title: 'Other' } })).body;
    await app.call('POST', `/diagrams/${diagram.id}/comments`, { token: owner, body: { text: 'here' } });
    await app.call('POST', `/diagrams/${other.id}/comments`, { token: owner, body: { text: 'there' } });
    const { body, res } = await app.call('GET', `/diagrams/${diagram.id}/comments`, { token: owner });
    assert.deepEqual(
      body.map((c) => c.text),
      ['here'],
    );
    assert.equal(res.headers.get('x-total-count'), '1');
  } finally {
    await app.close();
  }
});

test('the author changes their comment with PATCH; the author and the diagram stay', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const created = (await app.call('POST', `/diagrams/${diagram.id}/comments`, { token: owner, body: { text: 'old' } })).body;
    const { res, body } = await app.call('PATCH', `/comments/${created.id}`, { token: owner, body: { text: ' new ' } });
    assert.equal(res.status, 200);
    assert.equal(body.text, 'new');
    assert.equal(body.authorId, created.authorId);
    assert.equal(body.diagramId, created.diagramId);
  } finally {
    await app.close();
  }
});

test('the author deletes their comment: 204, then 404', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const created = (await app.call('POST', `/diagrams/${diagram.id}/comments`, { token: owner, body: { text: 'bye' } })).body;
    assert.equal((await app.call('DELETE', `/comments/${created.id}`, { token: owner })).res.status, 204);
    assert.equal((await app.call('DELETE', `/comments/${created.id}`, { token: owner })).res.status, 404);
    assert.equal((await app.call('PATCH', `/comments/${created.id}`, { token: owner, body: { text: 'x' } })).res.status, 404);
  } finally {
    await app.close();
  }
});

test('an admin may change and delete the comment of another user', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const admin = await app.tokenFor('root@example.test', 'admin');
    const created = (await app.call('POST', `/diagrams/${diagram.id}/comments`, { token: owner, body: { text: 'rude' } })).body;
    assert.equal((await app.call('PATCH', `/comments/${created.id}`, { token: admin, body: { text: '[removed]' } })).body.text, '[removed]');
    assert.equal((await app.call('DELETE', `/comments/${created.id}`, { token: admin })).res.status, 204);
  } finally {
    await app.close();
  }
});

test('a stranger gets 403 on PATCH and DELETE and the comment stays as it was', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const stranger = await app.tokenFor('stranger@example.test');
    const created = (await app.call('POST', `/diagrams/${diagram.id}/comments`, { token: owner, body: { text: 'mine' } })).body;
    assert.equal((await app.call('PATCH', `/comments/${created.id}`, { token: stranger, body: { text: 'hacked' } })).res.status, 403);
    assert.equal((await app.call('DELETE', `/comments/${created.id}`, { token: stranger })).res.status, 403);
    assert.equal((await app.models.Comment.findByPk(created.id)).text, 'mine');
  } finally {
    await app.close();
  }
});

test('every comment route needs a token', async () => {
  const { app, diagram } = await setup();
  try {
    for (const [method, path, body] of [
      ['GET', `/diagrams/${diagram.id}/comments`],
      ['POST', `/diagrams/${diagram.id}/comments`, { text: 'x' }],
      ['PATCH', '/comments/1', { text: 'x' }],
      ['DELETE', '/comments/1'],
    ]) {
      const { res, body: answer } = await app.call(method, path, { body });
      assert.equal(res.status, 401, `${method} ${path}`);
      assert.equal(answer.error, 'Missing Bearer token');
    }
  } finally {
    await app.close();
  }
});

test('negative: an unknown diagram or comment answers 404, a bad id answers 400', async () => {
  const { app, owner } = await setup();
  try {
    assert.equal((await app.call('GET', '/diagrams/9999/comments', { token: owner })).res.status, 404);
    assert.equal((await app.call('POST', '/diagrams/9999/comments', { token: owner, body: { text: 'x' } })).res.status, 404);
    assert.equal((await app.call('PATCH', '/comments/9999', { token: owner, body: { text: 'x' } })).res.status, 404);
    assert.equal((await app.call('DELETE', '/comments/9999', { token: owner })).res.status, 404);
    for (const id of ['0', '-1', 'abc', '1e0', '0x1', '99999999999']) {
      assert.equal((await app.call('GET', `/diagrams/${id}/comments`, { token: owner })).res.status, 400, `diagram id ${id}`);
      assert.equal((await app.call('DELETE', `/comments/${id}`, { token: owner })).res.status, 400, `comment id ${id}`);
    }
  } finally {
    await app.close();
  }
});

test('negative: empty, blank, wrong-typed and too long text answers 400 with the field named', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const path = `/diagrams/${diagram.id}/comments`;
    for (const text of [undefined, '', '   ', '​', 5, null, true, ['a'], { a: 1 }, 'x'.repeat(LIMITS.comment + 1)]) {
      const { res, body } = await app.call('POST', path, { token: owner, body: { text } });
      assert.equal(res.status, 400, JSON.stringify(text)?.slice(0, 30));
      assert.equal(body.details[0].field, 'text');
    }
    for (const body of [[], 'text', 12, null]) {
      assert.equal((await app.call('POST', path, { token: owner, body })).res.status, 400);
    }
    assert.equal((await app.call('POST', path, { token: owner, raw: '{broken', headers: { 'Content-Type': 'application/json' } })).res.status, 400);
    assert.equal(await app.models.Comment.count(), 0);
  } finally {
    await app.close();
  }
});

test('the largest allowed text (1000 characters) is stored; line breaks, Cyrillic and emoji survive', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const path = `/diagrams/${diagram.id}/comments`;
    assert.equal((await app.call('POST', path, { token: owner, body: { text: 'x'.repeat(LIMITS.comment) } })).res.status, 201);
    const text = 'Первая строка\nВторая строка 🙂';
    assert.equal((await app.call('POST', path, { token: owner, body: { text } })).body.text, text);
  } finally {
    await app.close();
  }
});

test('unsupported methods answer 405 with an Allow header', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const put = await app.call('PUT', `/diagrams/${diagram.id}/comments`, { token: owner, body: { text: 'x' } });
    assert.equal(put.res.status, 405);
    assert.match(put.res.headers.get('allow'), /GET/);
    const get = await app.call('GET', '/comments/1', { token: owner });
    assert.equal(get.res.status, 405);
    assert.match(get.res.headers.get('allow'), /PATCH/);
  } finally {
    await app.close();
  }
});

test('a deleted diagram takes its comments along; a deleted user takes theirs', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const guest = await app.tokenFor('guest@example.test');
    await app.call('POST', `/diagrams/${diagram.id}/comments`, { token: owner, body: { text: 'a' } });
    await app.call('POST', `/diagrams/${diagram.id}/comments`, { token: guest, body: { text: 'b' } });
    const admin = await app.tokenFor('root@example.test', 'admin');
    const guestUser = await app.models.User.findOne({ where: { email: 'guest@example.test' } });
    assert.equal((await app.call('DELETE', `/users/${guestUser.id}`, { token: admin })).res.status, 204);
    assert.equal(await app.models.Comment.count(), 1);
    assert.equal((await app.call('DELETE', `/diagrams/${diagram.id}`, { token: owner })).res.status, 204);
    assert.equal(await app.models.Comment.count(), 0);
  } finally {
    await app.close();
  }
});
