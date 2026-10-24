const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { startServer, SECRET, PASSWORD } = require('./harness');

// Attacks on the comment endpoints, played from the outside like in attack.test.js. The result is always a clean refusal, never a 500.

const JSON_HEADER = { 'Content-Type': 'application/json' };

const setup = async () => {
  const app = await startServer();
  const alice = await app.tokenFor('alice@example.test');
  const mallory = await app.tokenFor('mallory@example.test');
  const diagram = (await app.call('POST', '/diagrams', { token: alice, body: { title: 'private plan', notation: 'UML', sourceCode: 'a -> b' } })).body;
  const comment = (await app.call('POST', `/diagrams/${diagram.id}/comments`, { token: alice, body: { text: 'alice wrote this' } })).body;
  const users = Object.fromEntries((await app.models.User.findAll()).map((u) => [u.email, u]));
  return { app, alice, mallory, diagram, comment, users };
};

test('IDOR: a stranger cannot change or delete the comment of another user by guessing its id', async () => {
  const { app, mallory, comment } = await setup();
  try {
    for (let id = comment.id; id < comment.id + 3; id += 1) {
      const patch = await app.call('PATCH', `/comments/${id}`, { token: mallory, body: { text: 'pwned' } });
      const remove = await app.call('DELETE', `/comments/${id}`, { token: mallory });
      assert.ok([403, 404].includes(patch.res.status), `PATCH ${id} gave ${patch.res.status}`);
      assert.ok([403, 404].includes(remove.res.status), `DELETE ${id} gave ${remove.res.status}`);
    }
    assert.equal((await app.models.Comment.findByPk(comment.id)).text, 'alice wrote this');
  } finally {
    await app.close();
  }
});

test('IDOR: the answer does not tell a stranger more than a 403, no text and no author data', async () => {
  const { app, mallory, comment } = await setup();
  try {
    const { res, body } = await app.call('PATCH', `/comments/${comment.id}`, { token: mallory, body: { text: 'pwned' } });
    assert.equal(res.status, 403);
    assert.deepEqual(Object.keys(body), ['error']);
    assert.ok(!JSON.stringify(body).includes('alice'));
  } finally {
    await app.close();
  }
});

test('IDOR: a comment cannot be moved to another diagram or given to another author by PATCH', async () => {
  const { app, alice, comment, diagram, users } = await setup();
  try {
    const other = (await app.call('POST', '/diagrams', { token: alice, body: { title: 'second', notation: 'UML', sourceCode: 'x' } })).body;
    const { res, body } = await app.call('PATCH', `/comments/${comment.id}`, {
      token: alice,
      body: { text: 'edited', diagramId: other.id, authorId: users['mallory@example.test'].id, id: 999, createdAt: '2001-01-01T00:00:00.000Z' },
    });
    assert.equal(res.status, 200);
    assert.equal(body.diagramId, diagram.id);
    assert.equal(body.authorId, users['alice@example.test'].id);
    assert.equal(body.id, comment.id);
    assert.notEqual(body.createdAt.slice(0, 4), '2001');
  } finally {
    await app.close();
  }
});

test('mass assignment: authorId, diagramId, id and dates in the POST body are ignored', async () => {
  const { app, mallory, diagram, users } = await setup();
  try {
    const { res, body } = await app.call('POST', `/diagrams/${diagram.id}/comments`, {
      token: mallory,
      body: { text: 'as mallory', authorId: users['alice@example.test'].id, diagramId: 999999, id: 1, createdAt: '2001-01-01T00:00:00.000Z', role: 'admin' },
    });
    assert.equal(res.status, 201);
    assert.equal(body.authorId, users['mallory@example.test'].id);
    assert.equal(body.diagramId, diagram.id);
    assert.notEqual(body.id, 1);
    assert.equal(body.role, undefined);
    assert.notEqual(body.createdAt.slice(0, 4), '2001');
    assert.equal((await app.models.User.findByPk(users['mallory@example.test'].id)).role, 'user');
  } finally {
    await app.close();
  }
});

test('mass assignment: __proto__ and constructor keys in the body do not pollute anything', async () => {
  const { app, mallory, diagram } = await setup();
  try {
    const raw = '{"text":"hi","__proto__":{"isAdmin":true},"constructor":{"prototype":{"polluted":true}}}';
    const { res } = await app.call('POST', `/diagrams/${diagram.id}/comments`, { token: mallory, raw, headers: JSON_HEADER });
    assert.equal(res.status, 201);
    assert.equal({}.isAdmin, undefined);
    assert.equal({}.polluted, undefined);
  } finally {
    await app.close();
  }
});

test('huge text: one megabyte answers 413, 100 kilobytes of text answers 400, the server keeps working', async () => {
  const { app, mallory, diagram } = await setup();
  try {
    const path = `/diagrams/${diagram.id}/comments`;
    const big = await app.call('POST', path, { token: mallory, raw: JSON.stringify({ text: 'a'.repeat(1024 * 1024) }), headers: JSON_HEADER });
    assert.equal(big.res.status, 413);
    assert.equal(typeof big.body.error, 'string');
    const long = await app.call('POST', path, { token: mallory, body: { text: 'a'.repeat(90 * 1024) } });
    assert.equal(long.res.status, 400);
    assert.equal((await app.call('POST', path, { token: mallory, body: { text: 'still alive' } })).res.status, 201);
    assert.equal(await app.models.Comment.count({ where: { authorId: (await app.models.User.findOne({ where: { email: 'mallory@example.test' } })).id } }), 1);
  } finally {
    await app.close();
  }
});

test('huge text: a deeply nested body and a very wide body answer 400, not a crash', async () => {
  const { app, mallory, diagram } = await setup();
  try {
    const path = `/diagrams/${diagram.id}/comments`;
    let nested = 'x';
    for (let i = 0; i < 50; i += 1) nested = { a: nested };
    assert.equal((await app.call('POST', path, { token: mallory, body: { text: nested } })).res.status, 400);
    const wide = Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [`k${i}`, i]));
    const answer = await app.call('POST', path, { token: mallory, body: { text: 'ok', ...wide } });
    assert.equal(answer.res.status, 201);
    assert.equal(Object.keys(answer.body).length, 6);
  } finally {
    await app.close();
  }
});

test('control characters: NUL, escape, bell and DEL in the text answer 400 and nothing is stored', async () => {
  const { app, mallory, diagram, comment } = await setup();
  try {
    for (const bad of ['a\u0000b', 'a\u001b[31mred', 'a\u0007b', 'a\u007fb', '\u0000', 'ok\u0008']) {
      const created = await app.call('POST', `/diagrams/${diagram.id}/comments`, { token: mallory, body: { text: bad } });
      assert.equal(created.res.status, 400, JSON.stringify(bad));
    }
    const changed = await app.call('PATCH', `/comments/${comment.id}`, { token: mallory, body: { text: 'a\u0000b' } });
    assert.ok([400, 403].includes(changed.res.status));
    assert.equal(await app.models.Comment.count(), 1);
  } finally {
    await app.close();
  }
});

test('control characters: a NUL in the id of the URL or in the search of the list never gives 500', async () => {
  const { app, mallory, diagram } = await setup();
  try {
    for (const path of ['/comments/%00', '/comments/1%00', `/diagrams/${diagram.id}%00/comments`, '/diagrams/%00/comments', `/diagrams/${diagram.id}/comments?limit=%00`, `/diagrams/${diagram.id}/comments?sort=%00`]) {
      const { res } = await app.call('DELETE', path, { token: mallory });
      assert.ok(res.status < 500, `${path} gave ${res.status}`);
      const read = await app.call('GET', path, { token: mallory });
      assert.ok(read.res.status < 500, `GET ${path} gave ${read.res.status}`);
    }
  } finally {
    await app.close();
  }
});

test('stored markup comes back as plain data: the server does not change or interpret it', async () => {
  const { app, mallory, diagram } = await setup();
  try {
    const text = '<img src=x onerror=alert(1)> <script>alert(2)</script> \' OR 1=1 --';
    const created = await app.call('POST', `/diagrams/${diagram.id}/comments`, { token: mallory, body: { text } });
    assert.equal(created.res.status, 201);
    const list = await app.call('GET', `/diagrams/${diagram.id}/comments`, { token: mallory });
    assert.equal(list.body.at(-1).text, text);
    assert.match(list.res.headers.get('content-type'), /application\/json/);
    assert.equal(list.res.headers.get('x-content-type-options'), 'nosniff');
  } finally {
    await app.close();
  }
});

test('sort and paging parameters with SQL, arrays or huge numbers answer 400 and the table survives', async () => {
  const { app, mallory, diagram } = await setup();
  try {
    const base = `/diagrams/${diagram.id}/comments`;
    for (const query of ['sort=id;DROP TABLE Comments', 'sort=id&sort=title', 'sort=text', 'order=sideways', 'limit=1000', 'limit=-1', 'limit=1e2', 'offset=99999999999', 'limit=1&limit=2']) {
      const { res } = await app.call('GET', `${base}?${query}`, { token: mallory });
      assert.equal(res.status, 400, query);
    }
    assert.equal((await app.call('GET', base, { token: mallory })).body.length, 1);
  } finally {
    await app.close();
  }
});

test('a token of a deleted user and a forged admin claim are refused on the comment routes', async () => {
  const { app, comment, users } = await setup();
  try {
    const victim = await app.tokenFor('ghost@example.test');
    await app.models.User.destroy({ where: { email: 'ghost@example.test' } });
    assert.equal((await app.call('DELETE', `/comments/${comment.id}`, { token: victim })).res.status, 401);
    const real = jwt.decode((await app.call('POST', '/auth/login', { body: { email: 'mallory@example.test', password: PASSWORD } })).body.token);
    const forged = jwt.sign({ id: users['mallory@example.test'].id, role: 'admin' }, SECRET, { algorithm: 'HS256', issuer: real.iss, subject: real.sub, expiresIn: 600 });
    assert.equal((await app.call('DELETE', `/comments/${comment.id}`, { token: forged })).res.status, 403);
    assert.equal(await app.models.Comment.count(), 1);
  } finally {
    await app.close();
  }
});

test('an account whose role was lowered loses the admin right on comments at once', async () => {
  const { app, alice, comment } = await setup();
  try {
    const boss = await app.tokenFor('boss@example.test', 'admin');
    const stranger = (await app.call('POST', `/diagrams/${comment.diagramId}/comments`, { token: alice, body: { text: 'second' } })).body;
    assert.equal((await app.call('DELETE', `/comments/${stranger.id}`, { token: boss })).res.status, 204);
    await app.models.User.update({ role: 'user' }, { where: { email: 'boss@example.test' } });
    assert.equal((await app.call('DELETE', `/comments/${comment.id}`, { token: boss })).res.status, 403);
  } finally {
    await app.close();
  }
});
