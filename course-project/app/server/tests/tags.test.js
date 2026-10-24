const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./harness');
const { tagProblem, normalizeTag } = require('../src/middleware/validate');
const { LIMITS } = require('../src/models/diagram.constants');

const DIAGRAM = { title: 'Order flow', notation: 'BPMN', sourceCode: 'a -> b', priority: 'low' };

// Registers an owner with one diagram and returns what the tests need.
const setup = async () => {
  const app = await startServer();
  const owner = await app.tokenFor('owner@example.test');
  const diagram = (await app.call('POST', '/diagrams', { token: owner, body: DIAGRAM })).body;
  return { app, owner, diagram };
};

const attach = (app, token, diagramId, name) => app.call('POST', `/diagrams/${diagramId}/tags`, { token, body: { name } });

test('unit: the tag check accepts short labels and names the problem otherwise', () => {
  assert.equal(tagProblem('billing'), true);
  assert.equal(tagProblem('Сервис 2-го уровня'), true);
  assert.equal(tagProblem('a'.repeat(LIMITS.tag)), true);
  assert.match(tagProblem('a'.repeat(LIMITS.tag + 1)), /at most 30 characters/);
  assert.match(tagProblem('   '), /non-empty/);
  assert.match(tagProblem(undefined), /non-empty/);
  assert.match(tagProblem(7), /non-empty/);
  assert.match(tagProblem('-start'), /start with a letter or a digit/);
  assert.match(tagProblem('a<b>'), /only letters/);
  assert.match(tagProblem('a\nb'), /only letters/);
  assert.equal(normalizeTag('  Order   FLOW '), 'order flow');
});

test('a tag is created on first use: 201, Location, name trimmed and lowercased', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const { res, body } = await attach(app, owner, diagram.id, '  Billing  ');
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('location'), `/diagrams/${diagram.id}/tags`);
    assert.deepEqual(Object.keys(body).sort(), ['createdAt', 'id', 'name', 'updatedAt']);
    assert.equal(body.name, 'billing');
    const list = await app.call('GET', `/diagrams/${diagram.id}/tags`, { token: owner });
    assert.deepEqual(list.body.map((t) => t.name), ['billing']);
  } finally {
    await app.close();
  }
});

test('the same name again is not duplicated: 200 and one link; another diagram reuses the tag', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const first = await attach(app, owner, diagram.id, 'billing');
    const again = await attach(app, owner, diagram.id, 'BILLING');
    assert.equal(again.res.status, 200);
    assert.equal(again.body.id, first.body.id);
    const other = (await app.call('POST', '/diagrams', { token: owner, body: { ...DIAGRAM, title: 'Second' } })).body;
    const reused = await attach(app, owner, other.id, 'billing');
    assert.equal(reused.res.status, 201);
    assert.equal(reused.body.id, first.body.id);
    assert.equal(await app.models.Tag.count(), 1);
    assert.equal(await app.models.DiagramTag.count(), 2);
  } finally {
    await app.close();
  }
});

test('the tag list shows every tag with the number of diagrams, paged and sorted', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const other = (await app.call('POST', '/diagrams', { token: owner, body: { ...DIAGRAM, title: 'Second' } })).body;
    for (const name of ['zeta', 'alpha', 'mid']) await attach(app, owner, diagram.id, name);
    await attach(app, owner, other.id, 'alpha');
    const all = await app.call('GET', '/tags?sort=name', { token: owner });
    assert.equal(all.res.status, 200);
    assert.equal(all.res.headers.get('x-total-count'), '3');
    assert.deepEqual(all.body.map((t) => [t.name, t.diagrams]), [['alpha', 2], ['mid', 1], ['zeta', 1]]);
    const page = await app.call('GET', '/tags?sort=name&order=desc&limit=1&offset=1', { token: owner });
    assert.deepEqual(page.body.map((t) => t.name), ['mid']);
    assert.equal((await app.call('GET', '/tags?sort=secret', { token: owner })).res.status, 400);
  } finally {
    await app.close();
  }
});

test('bad names are refused with 400 and the field, nothing is stored', async () => {
  const { app, owner, diagram } = await setup();
  try {
    for (const name of ['', '   ', 'x'.repeat(31), '<script>', '-lead', 42, null, undefined]) {
      const { res, body } = await attach(app, owner, diagram.id, name);
      assert.equal(res.status, 400, String(name));
      assert.equal(body.details[0].field, 'name');
    }
    assert.equal((await app.call('POST', `/diagrams/${diagram.id}/tags`, { token: owner, body: [] })).res.status, 400);
    assert.equal(await app.models.Tag.count(), 0);
  } finally {
    await app.close();
  }
});

test('a diagram holds at most ten tags, an eleventh gets 400, an existing one is still accepted', async () => {
  const { app, owner, diagram } = await setup();
  try {
    for (let i = 1; i <= LIMITS.tagsPerDiagram; i += 1) assert.equal((await attach(app, owner, diagram.id, `tag${i}`)).res.status, 201);
    const over = await attach(app, owner, diagram.id, 'one-more');
    assert.equal(over.res.status, 400);
    assert.match(over.body.details[0].message, /10 tags/);
    assert.equal((await attach(app, owner, diagram.id, 'tag1')).res.status, 200);
  } finally {
    await app.close();
  }
});

test('only the owner or an admin changes the tags, any signed-in user reads them', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const guest = await app.tokenFor('guest@example.test');
    const admin = await app.tokenFor('admin@example.test', 'admin');
    const tag = (await attach(app, owner, diagram.id, 'mine')).body;
    assert.equal((await attach(app, guest, diagram.id, 'intruder')).res.status, 403);
    assert.equal((await app.call('DELETE', `/diagrams/${diagram.id}/tags/${tag.id}`, { token: guest })).res.status, 403);
    assert.equal((await app.call('GET', `/diagrams/${diagram.id}/tags`, { token: guest })).body.length, 1);
    assert.equal((await attach(app, admin, diagram.id, 'by-admin')).res.status, 201);
    assert.equal((await app.call('DELETE', `/diagrams/${diagram.id}/tags/${tag.id}`, { token: admin })).res.status, 204);
  } finally {
    await app.close();
  }
});

test('detaching removes the link and keeps the tag; a second try is 404', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const tag = (await attach(app, owner, diagram.id, 'temp')).body;
    assert.equal((await app.call('DELETE', `/diagrams/${diagram.id}/tags/${tag.id}`, { token: owner })).res.status, 204);
    assert.equal((await app.call('DELETE', `/diagrams/${diagram.id}/tags/${tag.id}`, { token: owner })).res.status, 404);
    assert.equal(await app.models.Tag.count(), 1);
    assert.equal(await app.models.DiagramTag.count(), 0);
  } finally {
    await app.close();
  }
});

test('deleting a tag is for admins only and removes it from every diagram', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const admin = await app.tokenFor('admin@example.test', 'admin');
    const tag = (await attach(app, owner, diagram.id, 'doomed')).body;
    assert.equal((await app.call('DELETE', `/tags/${tag.id}`, { token: owner })).res.status, 403);
    assert.equal((await app.call('DELETE', `/tags/${tag.id}`)).res.status, 401);
    assert.equal((await app.call('DELETE', `/tags/${tag.id}`, { token: admin })).res.status, 204);
    assert.equal((await app.call('DELETE', `/tags/${tag.id}`, { token: admin })).res.status, 404);
    assert.deepEqual((await app.call('GET', `/diagrams/${diagram.id}/tags`, { token: owner })).body, []);
    assert.equal((await app.call('GET', `/diagrams/${diagram.id}`, { token: owner })).res.status, 200);
  } finally {
    await app.close();
  }
});

test('deleting a diagram removes its links and keeps the tag for others', async () => {
  const { app, owner, diagram } = await setup();
  try {
    const other = (await app.call('POST', '/diagrams', { token: owner, body: { ...DIAGRAM, title: 'Second' } })).body;
    await attach(app, owner, diagram.id, 'shared');
    await attach(app, owner, other.id, 'shared');
    assert.equal((await app.call('DELETE', `/diagrams/${diagram.id}`, { token: owner })).res.status, 204);
    assert.equal(await app.models.DiagramTag.count(), 1);
    assert.equal(await app.models.Tag.count(), 1);
  } finally {
    await app.close();
  }
});

test('the diagram list can be filtered by tag, the name is normalized, an unknown tag gives an empty list', async () => {
  const { app, owner, diagram } = await setup();
  try {
    await app.call('POST', '/diagrams', { token: owner, body: { ...DIAGRAM, title: 'Untagged' } });
    await attach(app, owner, diagram.id, 'shop');
    const hit = await app.call('GET', '/diagrams?tag=SHOP', { token: owner });
    assert.deepEqual(hit.body.map((d) => d.id), [diagram.id]);
    assert.equal(hit.res.headers.get('x-total-count'), '1');
    const combined = await app.call('GET', '/diagrams?tag=shop&notation=UML', { token: owner });
    assert.deepEqual(combined.body, []);
    const none = await app.call('GET', '/diagrams?tag=nothing', { token: owner });
    assert.deepEqual(none.body, []);
    assert.equal(none.res.headers.get('x-total-count'), '0');
    assert.equal((await app.call('GET', '/diagrams?tag=%3Cb%3E', { token: owner })).res.status, 400);
    assert.equal((await app.call('GET', '/diagrams')).res.status, 401);
  } finally {
    await app.close();
  }
});

test('ids are checked, unknown diagrams are 404, the token is required, other methods get 405', async () => {
  const { app, owner, diagram } = await setup();
  try {
    assert.equal((await app.call('GET', '/tags')).res.status, 401);
    assert.equal((await app.call('GET', `/diagrams/${diagram.id}/tags`)).res.status, 401);
    assert.equal((await app.call('GET', '/diagrams/abc/tags', { token: owner })).res.status, 400);
    assert.equal((await app.call('GET', '/diagrams/9999/tags', { token: owner })).res.status, 404);
    assert.equal((await attach(app, owner, 9999, 'x')).res.status, 404);
    assert.equal((await app.call('DELETE', `/diagrams/${diagram.id}/tags/abc`, { token: owner })).res.status, 400);
    assert.equal((await app.call('DELETE', `/diagrams/9999/tags/1`, { token: owner })).res.status, 404);
    assert.equal((await app.call('DELETE', '/tags/0x1', { token: owner })).res.status, 403);
    assert.equal((await app.call('PUT', '/tags', { token: owner, body: {} })).res.status, 405);
    assert.equal((await app.call('PUT', `/diagrams/${diagram.id}/tags`, { token: owner, body: {} })).res.status, 405);
    assert.equal((await app.call('GET', `/diagrams/${diagram.id}/tags/1`, { token: owner })).res.status, 405);
    assert.equal((await app.call('GET', '/tags/1', { token: owner })).res.status, 405);
  } finally {
    await app.close();
  }
});
