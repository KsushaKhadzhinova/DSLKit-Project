import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Container and configuration checks without a Docker daemon: image tags, secrets, rights, networks, healthchecks and Nginx header inheritance.
// What needs a running Docker (restart after a crash, a stopped database, a killed container) is described in README.md.
const read = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');
const compose = read('docker-compose.yml');
const backend = read('backend/Dockerfile');
const frontend = read('frontend/Dockerfile');
// Comments are dropped, so a word in a comment is never taken for a directive.
const nginx = read('frontend/nginx.conf')
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n');
const env = read('.env.example');
const ignoreBack = read('backend/Dockerfile.dockerignore');
const ignoreFront = read('frontend/Dockerfile.dockerignore');

// The services block of the compose file split into one text per service (two-space indent keys under "services:").
const services = (() => {
  const body = compose.split(/^services:\n/m)[1].split(/^networks:/m)[0].split(/^volumes:/m)[0];
  const result = {};
  let name = null;
  for (const line of body.split('\n')) {
    const header = /^ {2}([a-z][\w-]*):\s*$/.exec(line);
    if (header) {
      name = header[1];
      result[name] = '';
    } else if (name) result[name] += `${line}\n`;
  }
  return result;
})();

test('the compose file has the four services and every one of them is parsed', () => {
  assert.deepEqual(Object.keys(services).sort(), ['backend', 'db', 'frontend', 'pgadmin', 'redis']);
});

test('every image is pinned to a version, none uses the latest tag or no tag', () => {
  const images = [...compose.matchAll(/^\s+image:\s*(\S+)/gm)].map((m) => m[1]);
  const froms = [...backend.matchAll(/^FROM\s+(\S+)/gm), ...frontend.matchAll(/^FROM\s+(\S+)/gm)].map((m) => m[1]);
  assert.ok(images.length >= 3 && froms.length >= 4);
  for (const reference of [...images, ...froms]) {
    const withoutRegistry = reference.replace(/^\$\{REGISTRY[^}]*\}/, '');
    assert.match(withoutRegistry, /:[\w][\w.-]*$/, `${reference} has no tag`);
    assert.doesNotMatch(withoutRegistry, /:latest$/, `${reference} uses latest`);
  }
});

test('no Dockerfile bakes a password, secret or token into an image through ENV or ARG', () => {
  for (const [name, text] of [['backend', backend], ['frontend', frontend]]) {
    for (const line of text.split('\n').filter((l) => /^(ENV|ARG)\s/.test(l))) {
      assert.doesNotMatch(line, /(PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE)/i, `${name}: ${line}`);
    }
    assert.doesNotMatch(text, /(curl|wget)[^\n]*\|\s*(sh|bash)/, `${name}: pipes a download into a shell`);
    assert.doesNotMatch(text, /--privileged|chmod\s+777|sudo\s/, `${name}: dangerous command`);
  }
});

test('the files with real values never reach an image: .env, keys and databases are in both ignore files', () => {
  assert.match(ignoreBack, /^\.env$/m);
  assert.match(ignoreFront, /^\.env$/m);
  assert.match(ignoreBack, /^node_modules$/m);
  assert.match(ignoreFront, /^node_modules$/m);
  assert.match(ignoreBack, /\*\.sqlite/);
});

test('.env.example holds no ready-made secret, password or admin account', () => {
  for (const line of env.split('\n').filter((l) => /^[A-Z_]+=/.test(l))) {
    const [key, value] = line.split('=');
    if (/(PASSWORD|SECRET|TOKEN)/.test(key)) assert.equal(value, '', `${key} has a value in the example file`);
  }
});

test('no service uses host networking, privileged mode, the Docker socket or an added capability', () => {
  assert.doesNotMatch(compose, /network_mode:\s*host/);
  assert.doesNotMatch(compose, /privileged:\s*true/);
  assert.doesNotMatch(compose, /docker\.sock/);
  assert.doesNotMatch(compose, /cap_add/);
  assert.doesNotMatch(compose, /pid:\s*host|ipc:\s*host/);
});

test('every published port is either the public web port or bound to this computer only', () => {
  for (const [name, text] of Object.entries(services)) {
    for (const port of [...text.matchAll(/^\s+- ['"]?([^'"\n]*\d+:\d+)['"]?\s*$/gm)].map((m) => m[1])) {
      if (name === 'frontend') continue;
      assert.match(port, /^127\.0\.0\.1:/, `${name} publishes ${port} to the whole network`);
    }
  }
  assert.doesNotMatch(services.db, /^\s+ports:/m, 'the database publishes a port');
  assert.doesNotMatch(services.redis, /^\s+ports:/m, 'redis publishes a port');
});

test('every service that is started by default restarts after a crash and the ones others wait for have a healthcheck', () => {
  for (const name of ['db', 'backend', 'frontend']) assert.match(services[name], /restart:\s*unless-stopped/, `${name} has no restart policy`);
  for (const waited of [...compose.matchAll(/^\s+(\w+):\n\s+condition: service_healthy/gm)].map((m) => m[1])) {
    // The API and the web server get their healthcheck from the HEALTHCHECK line of their Dockerfile, the database from compose.
    const hasOwn = /healthcheck:/.test(services[waited]) || (waited === 'backend' && /HEALTHCHECK/.test(backend)) || (waited === 'frontend' && /HEALTHCHECK/.test(frontend));
    assert.ok(hasOwn, `${waited} is waited for by health but has no healthcheck`);
  }
  assert.match(backend, /HEALTHCHECK/);
  assert.match(frontend, /HEALTHCHECK/);
});

test('the web server and the API drop every capability and cannot gain new rights', () => {
  for (const name of ['backend', 'frontend']) {
    assert.match(services[name], /cap_drop:\s*\[ALL\]/, `${name} keeps the default capabilities`);
    assert.match(services[name], /no-new-privileges:true/, `${name} can gain new privileges`);
  }
});

test('the database and the cache are on the internal network only', () => {
  for (const name of ['db', 'redis']) {
    assert.match(services[name], /networks:\s*\[internal\]/, `${name} is reachable from a public network`);
  }
});

test('Nginx: a location with its own add_header repeats every header of the server block, because add_header is not inherited then', () => {
  const server = nginx.split(/^\s*location /m)[0];
  const serverHeaders = [...server.matchAll(/add_header\s+(\S+)/g)].map((m) => m[1]);
  assert.ok(serverHeaders.length >= 4);
  const locations = nginx.split(/^\s*location /m).slice(1);
  for (const block of locations) {
    const own = [...block.matchAll(/add_header\s+(\S+)/g)].map((m) => m[1]);
    if (own.length === 0) continue;
    for (const header of serverHeaders) {
      assert.ok(own.includes(header), `location ${block.split(' ')[0]} sets add_header but drops ${header}`);
    }
  }
});

test('Nginx: the proxy sets the forwarded address itself and a body limit and a request limit are on', () => {
  assert.match(nginx, /server_tokens off/);
  assert.match(nginx, /client_max_body_size\s+\d+k/);
  assert.match(nginx, /limit_req\s+zone=api/);
  assert.match(nginx, /proxy_set_header\s+X-Forwarded-For\s+\$proxy_add_x_forwarded_for/);
  assert.match(nginx, /proxy_read_timeout/);
});
