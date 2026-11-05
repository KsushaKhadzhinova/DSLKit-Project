const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

// Found by mutation testing (tools/mutate.cjs): no test checked that the one-line fields refuse line breaks and control characters,
// while the multi-line source code must keep its line breaks.
let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

const post = (body) => fetch(`${base}/diagrams`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const valid = { title: 'Flow', notation: 'UML', sourceCode: 'a -> b', priority: 'low', owner: 'carol' };

test('the title refuses a line break, a tab-like control character and NUL, and names the field', async () => {
  for (const title of ['two\nlines', 'bell\u0007', 'nul\u0000', 'esc\u001b[31m']) {
    const res = await post({ ...valid, title });
    assert.equal(res.status, 400, JSON.stringify(title));
    const body = await res.json();
    assert.ok(body.details.some((d) => d.field === 'title' && /control characters/.test(d.message)), JSON.stringify(body));
  }
});

test('the owner refuses a line break and control characters too', async () => {
  for (const owner of ['anna\nboris', 'x\u0000']) {
    const res = await post({ ...valid, owner });
    assert.equal(res.status, 400, JSON.stringify(owner));
    const body = await res.json();
    assert.ok(body.details.some((d) => d.field === 'owner'), JSON.stringify(body));
  }
});

test('the source code keeps its line breaks', async () => {
  const sourceCode = 'start\n  -> check\n  -> end';
  const res = await post({ ...valid, sourceCode });
  assert.equal(res.status, 201);
  assert.equal((await res.json()).sourceCode, sourceCode);
});
