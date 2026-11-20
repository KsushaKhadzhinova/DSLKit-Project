// Attacks on part-2/lab-03-auth (Express + Sequelize + JWT), started in-process over a temporary SQLite file
// through the lab's own test harness. Needs: (cd part-2/lab-03-auth && npm install). Local only.
// Attacks: JWT alg=none, token signed with a wrong key, expired token, forged id, mass assignment of role on
// register, SQL injection in login, IDOR (user B edits user A's diagram), CORS with a hostile Origin,
// login lockout bypass via X-Forwarded-For, error/stack leakage.
// Run: node security/redteam/05-lab03-auth-attacks.cjs
const path = require('node:path');
const jwt = require(path.resolve(__dirname, '../../part-2/lab-03-auth/node_modules/jsonwebtoken'));
const { startServer, SECRET } = require('../../part-2/lab-03-auth/tests/harness');

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`[${ok ? 'PASS (protected)' : 'FAIL (vulnerable)'}] ${name} ${detail}`);
  if (!ok) failures += 1;
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

(async () => {
  const s = await startServer({ loginMaxAttempts: 3, loginRateMax: 10000 });
  try {
    const alice = await s.tokenFor('alice@example.test');
    const bob = await s.tokenFor('bob@example.test');
    const me = (await s.call('GET', '/profile', { token: alice })).body;
    console.log('=== RT-05: lab-03-auth ===');

    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ id: 1, role: 'admin' })}.`;
    check('JWT alg=none rejected', (await s.call('GET', '/users', { token: none })).res.status === 401);
    const wrong = jwt.sign({ id: me.id, role: 'admin' }, 'wrong-secret-wrong-secret-wrong-secret', { algorithm: 'HS256', issuer: 'x' });
    check('JWT with wrong key rejected', (await s.call('GET', '/users', { token: wrong })).res.status === 401);
    const noIss = jwt.sign({ id: me.id, role: 'admin' }, SECRET, { algorithm: 'HS256' });
    check('JWT signed with right key but forged role/no issuer is not admin', (await s.call('GET', '/users', { token: noIss })).res.status !== 200);
    const exp = jwt.sign({ id: me.id }, SECRET, { algorithm: 'HS256', expiresIn: -10 });
    check('expired JWT rejected', (await s.call('GET', '/profile', { token: exp })).res.status === 401);
    check('role claim in token does not grant admin', (await s.call('GET', '/users', { token: alice })).res.status === 403);

    const reg = await s.call('POST', '/auth/register', { body: { email: 'mallory@example.test', password: 'correct horse 42', role: 'admin', id: 999 } });
    check('mass assignment: role=admin on register ignored', reg.body?.role !== 'admin', `(role=${reg.body?.role})`);

    const sqli = await s.call('POST', '/auth/login', { body: { email: "' OR 1=1 --@x.y", password: 'x' } });
    check('SQL injection in login email gives no token', !sqli.body?.token, `(status ${sqli.res.status})`);

    const d = await s.call('POST', '/diagrams', { token: alice, body: { title: 'A', notation: 'BPMN', sourceCode: 'diagram bpmn' } });
    const id = d.body?.id;
    if (id) {
      const idor = await s.call('DELETE', `/diagrams/${id}`, { token: bob });
      check('IDOR: bob cannot delete alice diagram', idor.res.status === 403 || idor.res.status === 404, `(status ${idor.res.status})`);
      const put = await s.call('PATCH', `/diagrams/${id}`, { token: bob, body: { title: 'pwn' } });
      check('IDOR: bob cannot edit alice diagram', [403, 404].includes(put.res.status), `(status ${put.res.status})`);
    } else console.log('[SKIP] could not create a diagram', JSON.stringify(d.body));

    const cors = await fetch(`http://localhost:${s.port}/profile`, { headers: { Origin: 'http://evil.example' } });
    check('CORS: hostile Origin gets no Allow-Origin', !cors.headers.get('access-control-allow-origin'));

    let locked = false;
    for (let i = 0; i < 6 && !locked; i += 1) locked = (await s.call('POST', '/auth/login', { body: { email: 'alice@example.test', password: 'bad-bad-bad-1' } })).res.status === 429;
    const spoof = await s.call('POST', '/auth/login', { body: { email: 'alice@example.test', password: 'bad-bad-bad-1' }, headers: { 'X-Forwarded-For': '9.9.9.9' } });
    check('lockout not bypassed by X-Forwarded-For', locked && spoof.res.status === 429, `(locked=${locked}, spoof=${spoof.res.status})`);

    const bad = await fetch(`http://localhost:${s.port}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
    const txt = await bad.text();
    check('malformed JSON gives no stack trace', !/at .*\.js:\d+|node_modules/.test(txt), `(status ${bad.status})`);
    check('no X-Powered-By header', !bad.headers.get('x-powered-by'));
  } finally {
    await s.close();
  }
  process.exit(failures ? 1 : 0);
})();
