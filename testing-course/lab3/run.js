import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { staticServer } from '../../tools/server.js';
import { smoke, critical } from './checklists.js';

const server = staticServer(fileURLToPath(new URL('../../site', import.meta.url))).listen(0);
await new Promise((r) => server.once('listening', r));
const base = `http://localhost:${server.address().port}`;
const get = async (p) => {
  const r = await fetch(base + p);
  return { status: r.status, headers: r.headers, type: r.headers.get('content-type') ?? '', text: await r.text() };
};

const exec = async (list) => {
  const out = [];
  for (const [id, req, title, fn] of list) {
    try {
      await fn({ get, base });
      out.push({ id, req, title, status: 'Passed', note: '' });
    } catch (e) {
      out.push({ id, req, title, status: 'Failed', note: e.message.slice(0, 200) });
    }
  }
  return out;
};

const s = await exec(smoke);
// The critical path is blocked when the smoke run fails.
const c = s.every((x) => x.status === 'Passed')
  ? await exec(critical)
  : critical.map(([id, req, title]) => ({ id, req, title, status: 'Blocked', note: 'дымовой тест не пройден' }));
server.close();

const all = [...s, ...c];
const count = (st) => all.filter((x) => x.status === st).length;
const reqs = new Set(all.map((x) => x.req));
const covered = new Set(all.filter((x) => x.status === 'Passed').map((x) => x.req));
const executed = all.length - count('Blocked');
const metrics = {
  total: all.length,
  passed: count('Passed'),
  failed: count('Failed'),
  blocked: count('Blocked'),
  executedPct: +((executed / all.length) * 100).toFixed(1),
  passedPct: +((count('Passed') / executed) * 100).toFixed(1),
  defectDensity: +(count('Failed') / all.length).toFixed(3),
  coveragePct: +((covered.size / reqs.size) * 100).toFixed(1),
  requirements: reqs.size,
};
writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify({ smoke: s, critical: c, metrics }, null, 2));
for (const x of all.filter((x) => x.status !== 'Passed')) console.log(x.id, x.status, x.note);
console.log(metrics);
process.exitCode = metrics.failed ? 1 : 0;
