const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./harness');

// Stress and resilience of the comment endpoints, in the style of resilience.test.js.

const DIAGRAM = { title: 'Load target', notation: 'UML', sourceCode: 'a -> b' };

// At most 40 requests are in flight at once, like 40 browsers: a few hundred sockets at the same moment would only test the listen backlog.
const inBatches = async (jobs, size = 40) => {
  const results = [];
  for (let i = 0; i < jobs.length; i += size) results.push(...(await Promise.all(jobs.slice(i, i + size).map((job) => job()))));
  return results;
};

test('stress: 40 clients write 200 comments at once, all are stored with distinct ids and nothing answers 5xx', async () => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('writer@example.test');
    const diagram = (await app.call('POST', '/diagrams', { token, body: DIAGRAM })).body;
    const results = await inBatches(Array.from({ length: 200 }, (_, i) => () => app.call('POST', `/diagrams/${diagram.id}/comments`, { token, body: { text: `Comment ${i}` } })));
    assert.ok(results.every((r) => r.res.status === 201), 'some write did not answer 201');
    assert.equal(new Set(results.map((r) => r.body.id)).size, 200);
    assert.equal((await app.call('GET', `/diagrams/${diagram.id}/comments?limit=1`, { token })).res.headers.get('x-total-count'), '200');
  } finally {
    await app.close();
  }
});

test('stress: a mix of valid and hostile comment requests never gives a 5xx', async () => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('mixer@example.test');
    const diagram = (await app.call('POST', '/diagrams', { token, body: DIAGRAM })).body;
    const base = `/diagrams/${diagram.id}/comments`;
    const bad = ['', '   ', 'a\u0000b', 'x'.repeat(5000), null, 7, [], {}];
    const jobs = [];
    for (let i = 0; i < 120; i += 1) {
      jobs.push(() => app.call('POST', base, { token, body: { text: i % 3 === 0 ? bad[i % bad.length] : `ok ${i}` } }));
      jobs.push(() => app.call('GET', `${base}?limit=${(i % 7) * 20}&offset=${i}`, { token }));
      jobs.push(() => app.call('PATCH', `/comments/${(i % 50) + 1}`, { token, body: { text: i % 2 ? 'edited' : '' } }));
      jobs.push(() => app.call('DELETE', `/comments/${(i % 70) - 5}`, { token }));
    }
    const results = await inBatches(jobs);
    assert.ok(results.every(({ res }) => res.status < 500), `a request answered ${results.find(({ res }) => res.status >= 500)?.res.status}`);
    assert.equal((await app.call('GET', '/health')).res.status, 200);
  } finally {
    await app.close();
  }
});

test('volume: 600 comments are paged without gaps or repeats and the total is exact', async () => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('volume@example.test');
    const diagram = (await app.call('POST', '/diagrams', { token, body: DIAGRAM })).body;
    const user = await app.models.User.findOne({ where: { email: 'volume@example.test' } });
    await app.models.Comment.bulkCreate(Array.from({ length: 600 }, (_, i) => ({ diagramId: diagram.id, authorId: user.id, text: `bulk ${i}` })));
    const seen = [];
    for (let offset = 0; offset < 600; offset += 100) {
      const page = await app.call('GET', `/diagrams/${diagram.id}/comments?limit=100&offset=${offset}`, { token });
      assert.equal(page.res.headers.get('x-total-count'), '600');
      seen.push(...page.body.map((c) => c.id));
    }
    assert.equal(seen.length, 600);
    assert.equal(new Set(seen).size, 600);
    assert.deepEqual(seen, [...seen].sort((a, b) => a - b));
    const beyond = await app.call('GET', `/diagrams/${diagram.id}/comments?limit=100&offset=600`, { token });
    assert.deepEqual(beyond.body, []);
  } finally {
    await app.close();
  }
});

test('data integrity: parallel PATCH requests leave a whole comment and the author never changes', async () => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('race@example.test');
    const diagram = (await app.call('POST', '/diagrams', { token, body: DIAGRAM })).body;
    const comment = (await app.call('POST', `/diagrams/${diagram.id}/comments`, { token, body: { text: 'start' } })).body;
    const results = await Promise.all(Array.from({ length: 30 }, (_, i) => app.call('PATCH', `/comments/${comment.id}`, { token, body: { text: `v${i}` } })));
    assert.ok(results.every((r) => r.res.status === 200));
    const stored = await app.models.Comment.findByPk(comment.id);
    assert.match(stored.text, /^v\d+$/);
    assert.equal(stored.authorId, comment.authorId);
    assert.equal(stored.diagramId, diagram.id);
  } finally {
    await app.close();
  }
});

test('data integrity: a PATCH and a DELETE of one comment at once give 200 and 204, or 404 for the later one, never 500', async () => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('race2@example.test');
    const diagram = (await app.call('POST', '/diagrams', { token, body: DIAGRAM })).body;
    for (let i = 0; i < 10; i += 1) {
      const comment = (await app.call('POST', `/diagrams/${diagram.id}/comments`, { token, body: { text: 'x' } })).body;
      const [a, b] = await Promise.all([app.call('PATCH', `/comments/${comment.id}`, { token, body: { text: 'y' } }), app.call('DELETE', `/comments/${comment.id}`, { token })]);
      assert.ok([200, 404].includes(a.res.status) || a.res.status === 204, `PATCH gave ${a.res.status}`);
      assert.ok([204, 404].includes(b.res.status), `DELETE gave ${b.res.status}`);
    }
  } finally {
    await app.close();
  }
});

test('recovery: a diagram deleted while its comments are being written leaves no orphan comments', async () => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('orphan@example.test');
    const diagram = (await app.call('POST', '/diagrams', { token, body: DIAGRAM })).body;
    const writes = Array.from({ length: 40 }, (_, i) => app.call('POST', `/diagrams/${diagram.id}/comments`, { token, body: { text: `c${i}` } }));
    const removal = app.call('DELETE', `/diagrams/${diagram.id}`, { token });
    const results = await Promise.all([...writes, removal]);
    assert.ok(results.every(({ res }) => res.status < 500));
    assert.equal(await app.models.Comment.count({ where: { diagramId: diagram.id } }), 0);
  } finally {
    await app.close();
  }
});

test('i18n: Cyrillic, emoji, right-to-left text and combining marks in a comment survive a round trip', async () => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('i18n@example.test');
    const diagram = (await app.call('POST', '/diagrams', { token, body: DIAGRAM })).body;
    for (const text of ['Привет, мир', 'Диаграмма готова ✅🙂', 'مرحبا بالعالم', 'é combining', '日本語のコメント', 'tab\there\nnew line']) {
      const created = await app.call('POST', `/diagrams/${diagram.id}/comments`, { token, body: { text } });
      assert.equal(created.res.status, 201, text);
      assert.equal(created.body.text, text);
    }
    const list = await app.call('GET', `/diagrams/${diagram.id}/comments`, { token });
    assert.equal(list.body.length, 6);
  } finally {
    await app.close();
  }
});

test('recovery: when the Comments table disappears the routes answer 500 without leaks, and work after the table is back', async () => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('lost@example.test');
    const diagram = (await app.call('POST', '/diagrams', { token, body: DIAGRAM })).body;
    const queryInterface = app.models.sequelize.getQueryInterface();
    await queryInterface.dropTable('Comments');
    const broken = await app.call('GET', `/diagrams/${diagram.id}/comments`, { token });
    assert.equal(broken.res.status, 500);
    assert.deepEqual(broken.body, { error: 'Internal server error' });
    await app.models.Comment.sync();
    assert.equal((await app.call('POST', `/diagrams/${diagram.id}/comments`, { token, body: { text: 'back' } })).res.status, 201);
  } finally {
    await app.close();
  }
});
