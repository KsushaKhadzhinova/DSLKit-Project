// Compose smoke test: builds and starts the stack, waits until every service is healthy, asks /api/health through Nginx,
// and stops the stack again. It needs a running Docker daemon and a filled .env (see README). Data volumes are kept:
// the script never uses "down -v".
import { spawnSync } from 'node:child_process';

const port = process.env.FRONTEND_PORT || '8080';
const url = `http://127.0.0.1:${port}/api/health`;

const compose = (...args) => spawnSync('docker', ['compose', ...args], { stdio: 'inherit' }).status === 0;

if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
  console.error('smoke: the Docker daemon is not running, start Docker Desktop first');
  process.exit(2);
}

let ok = false;
try {
  // --wait returns when every service with a healthcheck is healthy and fails on a service that stops or turns unhealthy.
  if (!compose('up', '-d', '--build', '--wait', '--wait-timeout', '180')) throw new Error('docker compose up failed or a service is not healthy');
  for (let attempt = 1; attempt <= 10 && !ok; attempt += 1) {
    try {
      const response = await fetch(url);
      const body = await response.text();
      console.log(`smoke: GET ${url} -> ${response.status} ${body}`);
      ok = response.status === 200;
    } catch (failure) {
      console.log(`smoke: attempt ${attempt}: ${failure.message}`);
    }
    if (!ok) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!ok) console.error('smoke: /api/health did not answer 200 through Nginx');
} catch (failure) {
  console.error(`smoke: ${failure.message}`);
} finally {
  compose('down');
}
console.log(ok ? 'smoke: OK' : 'smoke: FAILED');
process.exit(ok ? 0 : 1);
