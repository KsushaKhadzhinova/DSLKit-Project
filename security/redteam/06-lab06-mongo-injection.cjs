// NoSQL-injection attacks on part-2/lab-06-mongodb, started over an in-memory MongoDB (mongodb-memory-server,
// already a devDependency of that lab) through its own test helper. Local only, no real database touched.
// Needs: (cd part-2/lab-06-mongodb && npm install).
// Attacks: operator injection via query string ($ne/$gt/$where as object-shaped params), $where/$function
// JS-injection payloads in string fields, oversized/array-shaped filter params, sort-key injection,
// mass assignment of fields the schema does not declare.
// Run: node security/redteam/06-lab06-mongo-injection.cjs
const { startTestServer, createCaller } = require('../../part-2/lab-06-mongodb/tests/helpers');

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`[${ok ? 'PASS (protected)' : 'FAIL (vulnerable)'}] ${name} ${detail}`);
  if (!ok) failures += 1;
};

(async () => {
  const env = await startTestServer();
  const call = createCaller(env.base);
  try {
    console.log('=== RT-06: lab-06-mongodb NoSQL injection ===');

    // Seed one diagram so a successful injection would have something to leak/match against.
    await call('POST', '/diagrams', { title: 'secret-plan', notation: 'bpmn', sourceCode: 'diagram bpmn', owner: 'victim' });

    // Classic operator injection: ?owner[$ne]=null would normally bypass an equality filter.
    const r1 = await call('GET', '/diagrams?' + encodeURIComponent('owner[$ne]') + '=null');
    check('operator injection owner[$ne] rejected (400), not used as a Mongo operator', r1.res.status === 400, `(status ${r1.res.status})`);

    const r2 = await call('GET', '/diagrams?' + encodeURIComponent('owner[$gt]') + '=');
    check('operator injection owner[$gt] rejected (400)', r2.res.status === 400, `(status ${r2.res.status})`);

    // $where / server-side JS injection attempt through a filter value.
    const r3 = await call('GET', '/diagrams?owner=' + encodeURIComponent("victim'; return true; var x='"));
    check('string-based $where-style payload treated as a literal string, no 500', [200].includes(r3.res.status), `(status ${r3.res.status})`);

    // sort= must be one of a fixed allow-list, not an arbitrary key (sort-key injection / information probing).
    const r4 = await call('GET', '/diagrams?sort=' + encodeURIComponent('$where'));
    check('arbitrary sort key rejected (400)', r4.res.status === 400, `(status ${r4.res.status})`);

    // Mass assignment: fields outside the schema (role/isAdmin-equivalent here: priority out of range, or an extra field).
    await call('POST', '/diagrams', { title: 'x', notation: 'bpmn', sourceCode: 'diagram bpmn', __proto__: { polluted: true } });
    check('prototype-pollution-shaped body does not pollute Object.prototype', Object.prototype.polluted === undefined);

    // Array-shaped query param where a plain string is expected.
    const r6 = await call('GET', '/diagrams?owner=a&owner=b');
    check('repeated/array query param for owner rejected or safely ignored, no 500', r6.res.status !== 500, `(status ${r6.res.status})`);

    // Non-hex / oversized ObjectId in the path.
    const r7 = await call('GET', '/diagrams/' + 'a'.repeat(5000));
    check('oversized id in path rejected (400), no crash', r7.res.status === 400, `(status ${r7.res.status})`);
  } finally {
    await env.stop();
  }
  process.exit(failures ? 1 : 0);
})();
