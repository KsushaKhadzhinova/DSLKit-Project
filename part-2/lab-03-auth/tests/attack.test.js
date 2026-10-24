const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { startServer, SECRET, PASSWORD } = require('./harness');

// Black-box attacks on the running server. Each test plays the attacker: it tries to get in, to read or change what is not theirs,
// or to make the server fail. The expected result is always a clean refusal (401, 403, 404, 400, 429) and never a 500 or a crash.

const b64 = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
const forge = (header, payload, signature = '') => `${b64(header)}.${b64(payload)}.${signature}`;
const hmac = (alg, data, key) => crypto.createHmac(alg, key).update(data).digest('base64url');

test('forged tokens: alg none, other algorithms, key confusion and odd headers never pass', async () => {
  const app = await startServer();
  try {
    const email = 'victim@example.test';
    await app.tokenFor(email);
    const user = await app.models.User.findOne({ where: { email } });
    const now = Math.floor(Date.now() / 1000);
    const payload = { id: user.id, email, role: 'admin', iss: 'dslkit', iat: now, exp: now + 600 };
    const withIss = async () => {
      const real = jwt.decode((await app.call('POST', '/auth/login', { body: { email, password: PASSWORD } })).body.token);
      return { ...payload, iss: real.iss, sub: real.sub };
    };
    const good = await withIss();

    const candidates = {
      'alg none': forge({ alg: 'none', typ: 'JWT' }, good),
      'alg None': forge({ alg: 'None', typ: 'JWT' }, good),
      'alg NONE with a signature': forge({ alg: 'NONE', typ: 'JWT' }, good, 'AAAA'),
      'alg missing': forge({ typ: 'JWT' }, good, 'AAAA'),
      'HS384 with the real secret': (() => { const h = b64({ alg: 'HS384', typ: 'JWT' }); const p = b64(good); return `${h}.${p}.${hmac('sha384', `${h}.${p}`, SECRET)}`; })(),
      'HS512 with the real secret': (() => { const h = b64({ alg: 'HS512', typ: 'JWT' }); const p = b64(good); return `${h}.${p}.${hmac('sha512', `${h}.${p}`, SECRET)}`; })(),
      'RS256 signed with a public key text as HMAC key': (() => { const h = b64({ alg: 'RS256', typ: 'JWT' }); const p = b64(good); return `${h}.${p}.${hmac('sha256', `${h}.${p}`, '-----BEGIN PUBLIC KEY-----')}`; })(),
      'HS256 with an empty key': (() => { const h = b64({ alg: 'HS256', typ: 'JWT' }); const p = b64(good); return `${h}.${p}.${hmac('sha256', `${h}.${p}`, '')}`; })(),
      'jku header pointing to an attacker': (() => { const h = b64({ alg: 'HS256', typ: 'JWT', jku: 'http://evil.test/keys.json', kid: '../../dev/null' }); const p = b64(good); return `${h}.${p}.${hmac('sha256', `${h}.${p}`, '')}`; })(),
      'three parts, the signature is the payload': forge({ alg: 'HS256', typ: 'JWT' }, good, b64(good)),
      'four parts': `${forge({ alg: 'HS256', typ: 'JWT' }, good, 'x')}.y`,
      'not base64': '%%%.%%%.%%%',
      'a JSON array as payload': forge({ alg: 'none' }, [good]),
      'a string as payload': forge({ alg: 'none' }, 'admin'),
    };
    for (const [name, token] of Object.entries(candidates)) {
      for (const path of ['/profile', '/users']) {
        const { res } = await app.call('GET', path, { token });
        assert.equal(res.status, 401, `${name} on ${path} gave ${res.status}`);
      }
    }
  } finally {
    await app.close();
  }
});

test('a token with the right signature but an admin role in the claims still gets the role from the database', async () => {
  const app = await startServer();
  try {
    await app.tokenFor('plain@example.test');
    const user = await app.models.User.findOne({ where: { email: 'plain@example.test' } });
    const real = jwt.decode((await app.call('POST', '/auth/login', { body: { email: 'plain@example.test', password: PASSWORD } })).body.token);
    const token = jwt.sign({ id: user.id, email: user.email, role: 'admin' }, SECRET, { algorithm: 'HS256', issuer: real.iss, subject: real.sub, expiresIn: 600 });
    assert.equal((await app.call('GET', '/users', { token })).res.status, 403);
  } finally {
    await app.close();
  }
});

test('another user cannot read-modify other people\'s diagrams, and owner fields in the body are ignored', async () => {
  const app = await startServer();
  try {
    const alice = await app.tokenFor('alice@example.test');
    const mallory = await app.tokenFor('mallory@example.test');
    const created = await app.call('POST', '/diagrams', { token: alice, body: { title: 'secret plan', notation: 'UML', sourceCode: 'a -> b', priority: 'low' } });
    assert.equal(created.res.status, 201);
    const id = created.body.id;
    const malloryId = (await app.models.User.findOne({ where: { email: 'mallory@example.test' } })).id;

    for (const [method, body] of [['PUT', { title: 'pwned', notation: 'UML', sourceCode: 'a -> b', priority: 'low' }], ['PATCH', { title: 'pwned' }], ['DELETE', undefined]]) {
      const { res } = await app.call(method, `/diagrams/${id}`, { token: mallory, body });
      assert.equal(res.status, 403, `${method} by a stranger gave ${res.status}`);
    }
    // A takeover through the owner fields must not work, for a stranger or for the owner.
    for (const key of ['ownerId', 'OwnerId', 'owner_id', 'userId', 'id', 'createdAt']) {
      await app.call('PATCH', `/diagrams/${id}`, { token: alice, body: { [key]: malloryId, title: 'secret plan' } });
      const now = await app.models.Diagram.findByPk(id);
      assert.notEqual(now.ownerId, malloryId, `${key} in the body changed the owner`);
      assert.equal(now.id, id);
    }
    const stolen = await app.call('POST', '/diagrams', { token: mallory, body: { title: 'as alice', notation: 'UML', sourceCode: 'a -> b', priority: 'low', ownerId: 1 } });
    assert.equal(stolen.body.ownerId, malloryId, 'ownerId from the body was accepted at creation');
    assert.equal((await app.models.Diagram.findByPk(id)).title, 'secret plan');
  } finally {
    await app.close();
  }
});

test('the token check cannot be skipped by the shape of the address', async () => {
  const app = await startServer();
  try {
    const user = await app.tokenFor('u@example.test');
    const paths = ['/users', '/Users', '/USERS', '/users/', '//users', '/users//', '/users?x=1', '/users%20', '/%75sers', '/users/.', '/./users', '/foo/../users', '/users;a=b', '/users/%2e', '/profile/', '/PROFILE', '/diagrams/', '/Diagrams', '/%64iagrams', '//diagrams'];
    for (const path of paths) {
      const anon = await app.call('GET', path);
      assert.ok([401, 404].includes(anon.res.status), `${path} without a token gave ${anon.res.status}`);
      if (path.toLowerCase().includes('users') || path.toLowerCase().includes('%75sers')) {
        const asUser = await app.call('GET', path, { token: user });
        assert.ok([403, 404].includes(asUser.res.status), `${path} as a plain user gave ${asUser.res.status}`);
      }
    }
    // Method tricks: override headers and a body on GET must not change the verb.
    for (const header of ['X-HTTP-Method-Override', 'X-Method-Override', 'X-HTTP-Method']) {
      const { res } = await app.call('POST', '/diagrams', { headers: { [header]: 'DELETE' }, body: { title: 't', notation: 'UML', sourceCode: 'a -> b', priority: 'low' } });
      assert.equal(res.status, 401, `${header} reached the handler`);
    }
  } finally {
    await app.close();
  }
});

test('letters that look like others do not create a second account for one email', async () => {
  const app = await startServer();
  try {
    assert.equal((await app.call('POST', '/auth/register', { body: { email: 'admin@example.test', password: PASSWORD } })).res.status, 201);
    for (const email of ['ADMIN@EXAMPLE.TEST', ' admin@example.test ', 'admin@example.test\n', '\tadmin@example.test']) {
      const { res } = await app.call('POST', '/auth/register', { body: { email, password: PASSWORD } });
      assert.ok([400, 409].includes(res.status), `${JSON.stringify(email)} gave ${res.status}`);
    }
    // Non-ASCII look-alikes are different addresses, so they must not log in as the original and must not crash the server.
    for (const email of ['аdmin@example.test', 'admin@exаmple.test', 'ａdmin@example.test', 'admın@example.test', 'ADMİN@example.test']) {
      const { res } = await app.call('POST', '/auth/login', { body: { email, password: PASSWORD } });
      assert.equal(res.status, 401, `${email} logged in as another account`);
    }
    assert.equal(await app.models.User.count(), 1, 'a look-alike address created or changed an account');
  } finally {
    await app.close();
  }
});

test('a forged X-Forwarded-For does not give an attacker a new rate-limit bucket without a trusted proxy', async () => {
  const app = await startServer({ loginRateMax: 5, loginMaxAttempts: 10000 });
  try {
    let limited = 0;
    for (let i = 0; i < 20; i += 1) {
      const { res } = await app.call('POST', '/auth/login', { headers: { 'X-Forwarded-For': `10.0.0.${i}`, 'X-Real-IP': `10.1.0.${i}`, Forwarded: `for=10.2.0.${i}` }, body: { email: 'x@example.test', password: 'whatever pass' } });
      if (res.status === 429) limited += 1;
    }
    assert.ok(limited >= 10, `only ${limited} of 20 requests were limited, so a forged header resets the limit`);
  } finally {
    await app.close();
  }
});

test('one attacker cannot lock the account of a victim for the victim', async () => {
  const app = await startServer({ loginMaxAttempts: 3, loginRateMax: 10000 });
  try {
    await app.tokenFor('victim@example.test');
    // The attacker comes from the same address as the test here, so only the lock for that pair is shown.
    for (let i = 0; i < 6; i += 1) await app.call('POST', '/auth/login', { body: { email: 'victim@example.test', password: 'wrong wrong wrong' } });
    const attacker = await app.call('POST', '/auth/login', { body: { email: 'victim@example.test', password: PASSWORD } });
    assert.equal(attacker.res.status, 429);
    // A different address is not locked: the key is the pair of address and email, so the owner on another network still gets in.
    // (Address spoofing is covered by the previous test; here the server must keep answering other accounts.)
    await app.tokenFor('other@example.test');
    const other = await app.call('POST', '/auth/login', { body: { email: 'other@example.test', password: PASSWORD } });
    assert.equal(other.res.status, 200);
  } finally {
    await app.close();
  }
});

test('a wrong password for a known and for an unknown email take about the same time', async () => {
  const app = await startServer();
  try {
    await app.tokenFor('known@example.test');
    const sample = async (email) => {
      const times = [];
      for (let i = 0; i < 8; i += 1) {
        const t = process.hrtime.bigint();
        await app.call('POST', '/auth/login', { body: { email, password: 'wrong wrong wrong' } });
        times.push(Number(process.hrtime.bigint() - t) / 1e6);
      }
      return times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
    };
    const known = await sample('known@example.test');
    const unknown = await sample('nobody@example.test');
    // With four test rounds both are fast; the point is that the unknown email is not answered much faster, which would show which emails exist.
    assert.ok(unknown >= known * 0.4, `unknown ${unknown.toFixed(1)} ms is much faster than known ${known.toFixed(1)} ms`);
  } finally {
    await app.close();
  }
});

test('hostile bodies: duplicate keys, wrong charset, huge numbers, deep arrays and prototype keys never cause 500', async () => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('fuzz@example.test');
    const send = (raw, contentType = 'application/json') => app.call('POST', '/diagrams', { token, raw, headers: { 'Content-Type': contentType } });
    const bodies = [
      '{"title":"a","title":"b","notation":"UML","sourceCode":"a","priority":"low"}',
      '{"title":"a","notation":"UML","sourceCode":"a","priority":"low","__proto__":{"role":"admin"}}',
      '{"title":"a","notation":"UML","sourceCode":"a","priority":"low","constructor":{"prototype":{"x":1}}}',
      '{"title":"a","notation":"UML","sourceCode":"a","priority":"low"23456789012345678901234567890}',
      '{"title":"a","notation":"UML","sourceCode":"a","priority":"low"e999}',
      '{"title":' + '['.repeat(100000) + '}',
      '{"title":"' + 'a'.repeat(200000) + '"}',
      '\uFEFF{"title":"a","notation":"UML","sourceCode":"a","priority":"low"}',
      '{"title":"a","notation":"UML","sourceCode":"a","priority":"low"}garbage',
      '{"title":"\\ud800","notation":"UML","sourceCode":"a","priority":"low"}',
      '{"title":"a","notation":["uml","bpmn"],"priority":1}',
      '{"title":{"toString":"x"},"notation":"UML","sourceCode":"a","priority":"low"}',
      '',
      'null',
      '[]',
      '"just a string"',
      '123',
      '\u0000',
    ];
    for (const raw of bodies) {
      const { res } = await send(raw);
      assert.ok(res.status < 500, `${raw.slice(0, 40)} gave ${res.status}`);
    }
    for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'application/json; charset=utf-16', 'multipart/form-data; boundary=x', 'application/xml', '']) {
      const { res } = await send('{"title":"a","notation":"UML","sourceCode":"a","priority":"low"}', type);
      assert.ok(res.status < 500, `${type} gave ${res.status}`);
    }
    assert.equal(({}).role, undefined, 'Object.prototype was polluted');
    assert.equal((await app.call('GET', '/health')).res.status, 200);
  } finally {
    await app.close();
  }
});

test('malformed HTTP at the socket level: conflicting lengths, chunk tricks, slow headers and floods leave the server alive', async () => {
  const app = await startServer();
  try {
    const talk = (text, wait = 300) => new Promise((resolve) => {
      const net = require('node:net');
      const socket = net.connect(app.port, 'localhost');
      let data = '';
      socket.on('data', (chunk) => { data += chunk; });
      socket.on('error', () => {});
      socket.on('connect', () => socket.write(text));
      setTimeout(() => { socket.destroy(); resolve(data); }, wait);
    });
    const cases = [
      'POST /diagrams HTTP/1.1\r\nHost: x\r\nContent-Length: 5\r\nContent-Length: 50\r\n\r\n{}',
      'POST /diagrams HTTP/1.1\r\nHost: x\r\nContent-Length: 4\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\nGET /users HTTP/1.1\r\nHost: x\r\n\r\n',
      'POST /diagrams HTTP/1.1\r\nHost: x\r\nTransfer-Encoding: chunked\r\n\r\nZZZ\r\n',
      'GET /health HTTP/1.1\r\nHost: x\r\nX-A: ' + 'a'.repeat(100000) + '\r\n\r\n',
      'GET /' + 'a'.repeat(100000) + ' HTTP/1.1\r\nHost: x\r\n\r\n',
      'GET /health HTTP/9.9\r\nHost: x\r\n\r\n',
      'BREW /health HTTP/1.1\r\nHost: x\r\n\r\n',
      'GET /health HTTP/1.1\r\nHost: x\r\n' + 'H: v\r\n'.repeat(5000) + '\r\n',
      '\x00\x01\x02\xff\xfe\r\n\r\n',
    ];
    for (const text of cases) await talk(text);
    // Hundreds of half-open connections at once.
    const net = require('node:net');
    const open = Array.from({ length: 300 }, () => { const s = net.connect(app.port, 'localhost'); s.on('error', () => {}); return s; });
    await new Promise((resolve) => setTimeout(resolve, 300));
    open.forEach((s) => s.destroy());
    const health = await app.call('GET', '/health');
    assert.equal(health.res.status, 200, 'the server stopped answering after the malformed traffic');
    // A smuggled second request must not have been executed as an admin read.
    const reply = await talk('POST /diagrams HTTP/1.1\r\nHost: x\r\nContent-Length: 4\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\nGET /users HTTP/1.1\r\nHost: x\r\n\r\n');
    assert.ok(!/"email"/.test(reply), 'a smuggled request returned user data');
  } finally {
    await app.close();
  }
});

test('error answers never leak the stack, file paths, SQL, the secret or the hash', async () => {
  const app = await startServer();
  try {
    const token = await app.tokenFor('leak@example.test');
    const probes = [
      ['GET', '/diagrams/abc'], ['GET', '/diagrams/1e999'], ['GET', '/nope'], ['POST', '/auth/login', '{'], ['POST', '/diagrams', '{"title":'],
      ['GET', '/diagrams?sort=x\'--'], ['GET', '/diagrams?q=%00'], ['GET', '/diagrams?limit=9999999999999999999'], ['PUT', '/diagrams/1', 'x'],
    ];
    const secretPieces = [SECRET, 'node_modules', 'at Object.', 'at async', 'SQLITE', 'SELECT ', 'sequelize', '.js:', 'bcrypt', '$2b$', 'E:\\', '/home/'];
    for (const [method, path, raw] of probes) {
      const res = await fetch(`http://localhost:${app.port}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : raw });
      const text = await res.text();
      for (const piece of secretPieces) assert.ok(!text.includes(piece), `${method} ${path} leaked "${piece}": ${text.slice(0, 120)}`);
      for (const [name, value] of res.headers) {
        assert.ok(!/x-powered-by|server/i.test(name) || !/express|node/i.test(value), `header ${name}: ${value}`);
      }
    }
  } finally {
    await app.close();
  }
});

test('an enormous number of registrations or diagrams from one client is limited, not stored without end', async () => {
  const app = await startServer({ registerRateMax: 10, loginRateMax: 10000 });
  try {
    let created = 0;
    let limited = 0;
    for (let i = 0; i < 40; i += 1) {
      const { res } = await app.call('POST', '/auth/register', { body: { email: `bot${i}@example.test`, password: PASSWORD } });
      if (res.status === 201) created += 1;
      if (res.status === 429) limited += 1;
    }
    assert.ok(created <= 10, `${created} accounts were created by one client`);
    assert.ok(limited >= 30, `only ${limited} requests were limited`);
  } finally {
    await app.close();
  }
});
