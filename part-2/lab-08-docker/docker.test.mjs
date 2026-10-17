import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Static checks of the Docker files, they run without a Docker daemon. The real build and start are described in README.md.
const read = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');
const compose = read('docker-compose.yml');
const backend = read('backend/Dockerfile');
const frontend = read('frontend/Dockerfile');
const nginx = read('frontend/nginx.conf');
const env = read('.env.example');

test('the frontend image is built in two stages and only Nginx with the build output stays in it', () => {
  assert.equal((frontend.match(/^FROM /gm) ?? []).length, 2);
  assert.match(frontend, /AS builder/);
  assert.match(frontend, /COPY --from=builder \/app\/dist/);
  assert.match(frontend, /nginx-unprivileged/);
});

test('the backend image installs production dependencies only, runs as the node user and has a healthcheck', () => {
  assert.match(backend, /npm ci --omit=dev/);
  assert.match(backend, /^USER node$/m);
  assert.match(backend, /HEALTHCHECK[\s\S]*\/health/);
});

test('compose starts the services in order by health and keeps the data in a named volume', () => {
  assert.match(compose, /condition: service_healthy/g);
  assert.equal((compose.match(/condition: service_healthy/g) ?? []).length, 2);
  assert.match(compose, /pgdata:\/var\/lib\/postgresql\/data/);
  assert.match(compose, /^volumes:\n {2}pgdata:/m);
  assert.match(compose, /pg_isready/);
});

test('the database is only on the internal network and the backend has no extra rights', () => {
  assert.match(compose, /internal:\n {4}internal: true/);
  const db = /^ {2}db:[\s\S]*?(?=^ {2}backend:)/m.exec(compose)[0];
  assert.match(db, /networks: \[internal\]/);
  assert.doesNotMatch(db, /ports:/);
  assert.match(compose, /read_only: true/);
  assert.match(compose, /cap_drop: \[ALL\]/);
});

test('secrets come from .env, the example file holds no values and a mirror prefix is supported', () => {
  assert.match(compose, /POSTGRES_PASSWORD:\?/);
  assert.match(compose, /JWT_SECRET:\?/);
  for (const key of ['POSTGRES_PASSWORD', 'JWT_SECRET', 'ADMIN_PASSWORD']) assert.match(env, new RegExp(`^${key}=$`, 'm'));
  assert.match(compose, /REGISTRY/);
  assert.match(backend, /^ARG REGISTRY=$/m);
});

test('Nginx serves the single-page application and proxies /api to the backend service by name', () => {
  assert.match(nginx, /location \/api\/ \{\s*proxy_pass http:\/\/backend:3000\/;/);
  assert.match(nginx, /try_files \$uri \/index\.html/);
});
