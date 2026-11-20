// Flaky-test detector: runs the unit tests twice (the second time in a random file order) and fails when the outcomes differ.
// Usage: node ci/flaky.mjs
import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';

const PATTERNS = ['labs/**/*.test.js', 'tools/**/*.test.js'];
const files = PATTERNS.flatMap((pattern) => globSync(pattern)).sort();

// A deterministic shuffle (mulberry32), so a failing order can be reproduced with the same seed.
function shuffled(list, seed) {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function run(label, list) {
  const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...list], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    shell: false,
  });
  const out = `${r.stdout}\n${r.stderr}`;
  const num = (name) => Number((out.match(new RegExp(`^ℹ ${name} ([0-9]+)`, 'm')) || [])[1]);
  const result = {
    label,
    status: r.status,
    tests: num('tests'),
    pass: num('pass'),
    fail: num('fail'),
    skipped: num('skipped'),
    failing: [...out.matchAll(/^\s*✖ (.+?) \(/gm)].map((m) => m[1]).sort(),
  };
  console.log(`${label}: exit ${result.status}, tests ${result.tests}, pass ${result.pass}, fail ${result.fail}, skipped ${result.skipped}`);
  return result;
}

const seed = Number(process.env.FLAKY_SEED || Date.now() % 100000);
const first = run('run 1 (sorted order)', files);
const second = run(`run 2 (shuffled order, seed ${seed})`, shuffled(files, seed));

const same = ['status', 'tests', 'pass', 'fail', 'skipped'].every((k) => first[k] === second[k]) && first.failing.join('|') === second.failing.join('|');
if (!same || first.status !== 0 || !(first.tests > 0)) {
  console.error('Results differ between runs (flaky or order-dependent tests), or a run failed.');
  console.error(JSON.stringify({ first, second }, null, 2));
  process.exit(1);
}
console.log('Both runs gave the same result.');
