const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { startServer } = require('./harness');

// Contract between this server and the React client of lab 5: the fields, headers and error shapes the client reads must be exactly what the server sends.
// The client source is read from the neighbouring folder when it is there, so a rename on either side breaks this test, not the user.
const clientDir = join(__dirname, '..', '..', 'lab-05-react-api', 'src');

const clientFields = () => {
  if (!existsSync(clientDir)) return null;
  const files = [...readdirSync(join(clientDir, 'components')).map((f) => join(clientDir, 'components', f)), ...readdirSync(join(clientDir, 'hooks')).map((f) => join(clientDir, 'hooks', f))].filter((f) => /\.jsx?$/.test(f) && !/\.test\./.test(f));
  const fields = new Set();
  for (const file of files) for (const match of readFileSync(file, 'utf8').matchAll(/\b(?:diagram|item|record)\.([a-zA-Z]+)\b/g)) fields.add(match[1]);
  // pending is the client's own mark of an unsaved record, it never comes from the server.
  fields.delete('pending');
  return [...fields];
};

test('contract: every field of a record that the client reads exists in the list answer, with the right type', async (t) => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('contract@example.test');
    const created = await app.call('POST', '/diagrams', { token, body: { title: 'Контракт', notation: 'UML', sourceCode: 'a -> b', priority: 'low' } });
    assert.equal(created.res.status, 201);
    const { body: list } = await app.call('GET', '/diagrams', { token });
    assert.ok(Array.isArray(list), 'the list answer is not an array');
    const [record] = list;
    const wanted = clientFields();
    if (wanted === null) t.diagnostic('the client folder is not next to this lab, only the fixed contract is checked');
    for (const field of wanted ?? ['id', 'title', 'notation', 'createdAt']) assert.ok(field in record, `the client reads ${field} but the server does not send it`);
    const types = { id: 'number', title: 'string', notation: 'string', sourceCode: 'string', priority: 'string', createdAt: 'string', updatedAt: 'string', ownerId: 'number' };
    for (const [field, type] of Object.entries(types)) assert.equal(typeof record[field], type, `${field} is not a ${type}`);
    assert.ok(!Number.isNaN(Date.parse(record.createdAt)), 'createdAt is not a date');
    assert.deepEqual(Object.keys(record).sort(), Object.keys(types).sort(), 'the record has fields that are not in the contract');
    assert.ok(['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'].includes(record.notation));
  } finally {
    await app.close();
  }
});

test('contract: the page size header, the search parameter and the created record match what the client sends and reads', async () => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('contract2@example.test');
    for (let i = 0; i < 25; i += 1) await app.call('POST', '/diagrams', { token, body: { title: `Order ${i}`, notation: 'UML', sourceCode: 'a', priority: 'low' } });
    const page = await app.call('GET', '/diagrams?limit=20&offset=0', { token });
    assert.equal(page.body.length, 20);
    assert.equal(page.res.headers.get('x-total-count'), '25', 'the client reads X-Total-Count as a string of digits');
    const second = await app.call('GET', '/diagrams?limit=20&offset=20', { token });
    assert.equal(second.body.length, 5);
    const found = await app.call('GET', '/diagrams?search=ORDER%201&limit=20', { token });
    assert.ok(found.body.length >= 1 && found.body.every((d) => /order 1/i.test(d.title)), '?search= is not a case-insensitive part of the title');
    const blank = await app.call('GET', '/diagrams?search=%20%20', { token });
    assert.equal(blank.res.headers.get('x-total-count'), '25', 'a blank search must keep every diagram');
    const fresh = await app.call('POST', '/diagrams', { token, body: { title: 'New', notation: 'BPMN', sourceCode: 'x', priority: 'high' } });
    assert.equal(typeof fresh.body.id, 'number', 'the client replaces its temporary id with this number');
    const put = await app.call('PUT', `/diagrams/${fresh.body.id}`, { token, body: { title: 'Renamed', notation: 'BPMN', sourceCode: 'x', priority: 'high' } });
    assert.equal(put.body.title, 'Renamed');
    assert.equal((await app.call('DELETE', `/diagrams/${fresh.body.id}`, { token })).res.status, 204);
    assert.equal((await app.call('DELETE', `/diagrams/${fresh.body.id}`, { token })).res.status, 404, 'the client treats 404 on delete as already gone');
  } finally {
    await app.close();
  }
});

test('contract: login and registration answers and every error body have the shape the client turns into a message', async () => {
  const app = await startServer();
  try {
    const registered = await app.call('POST', '/auth/register', { body: { email: 'shape@example.test', password: 'correct horse 42' } });
    assert.equal(registered.res.status, 201);
    const login = await app.call('POST', '/auth/login', { body: { email: 'shape@example.test', password: 'correct horse 42' } });
    assert.equal(typeof login.body.token, 'string', 'the client reads data.token');
    const token = login.body.token;
    const errors = [
      await app.call('POST', '/auth/login', { body: { email: 'shape@example.test', password: 'wrong wrong wrong' } }),
      await app.call('POST', '/auth/register', { body: { email: 'bad', password: 'x' } }),
      await app.call('POST', '/diagrams', { token, body: { title: ' ', notation: 'XYZ', sourceCode: 5 } }),
      await app.call('GET', '/diagrams?limit=abc', { token }),
      await app.call('GET', '/diagrams/999999', { token }),
      await app.call('GET', '/diagrams'),
      await app.call('GET', '/users', { token }),
      await app.call('POST', '/diagrams', { token, raw: '{broken' }),
    ];
    for (const { res, body } of errors) {
      assert.ok(res.status >= 400 && res.status < 500, `unexpected ${res.status}`);
      assert.equal(typeof body.error, 'string', `${res.status}: the client reads error as a string`);
      assert.ok(body.error.length > 0);
      if (body.details !== undefined) {
        assert.ok(Array.isArray(body.details), 'details is not a list');
        for (const detail of body.details) {
          assert.equal(typeof detail.field, 'string', 'the client joins details as "field: message"');
          assert.equal(typeof detail.message, 'string');
        }
      }
    }
    // 401 must clear the client session only when a token was sent, so a wrong password is a plain 401 with a message.
    assert.equal(errors[0].res.status, 401);
    assert.equal(errors[5].res.status, 401);
  } finally {
    await app.close();
  }
});

test('contract: the CORS answer lets the client origin read the total header and refuses another origin', async () => {
  const app = await startServer({ corsOrigin: 'http://localhost:5178' });
  try {
    const token = await app.tokenFor('cors@example.test');
    const allowed = await fetch(`http://127.0.0.1:${app.port}/diagrams`, { headers: { Origin: 'http://localhost:5178', Authorization: `Bearer ${token}` } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5178');
    assert.match(allowed.headers.get('access-control-expose-headers') ?? '', /x-total-count/i);
    const foreign = await fetch(`http://127.0.0.1:${app.port}/diagrams`, { headers: { Origin: 'https://evil.test', Authorization: `Bearer ${token}` } });
    assert.equal(foreign.headers.get('access-control-allow-origin'), null);
    const preflight = await fetch(`http://127.0.0.1:${app.port}/diagrams`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5178', 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'authorization,content-type' } });
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get('access-control-allow-methods') ?? '', /PUT/);
    assert.match(preflight.headers.get('access-control-allow-headers') ?? '', /authorization/i);
  } finally {
    await app.close();
  }
});
