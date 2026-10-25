import { writeFileSync } from 'node:fs';
import { validateWaitlist } from '../../site/js/utils/validation.js';
import { CASES } from './cases.js';

const show = (v) => JSON.stringify(v, (k, x) => (typeof x === 'string' && x.length > 24 ? `${x.slice(0, 8)}…(${x.length})` : x));

export const run = () =>
  CASES.map((c) => {
    const actual = validateWaitlist(c.data);
    const pass = JSON.stringify([...actual].sort()) === JSON.stringify([...c.expected].sort());
    return { ...c, actual, status: pass ? 'Passed' : 'Failed' };
  });

if (process.argv[1].endsWith('run.js')) {
  const results = run();
  writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify(results, null, 2));
  for (const r of results) console.log(r.id, r.status, show(r.data), '->', r.actual.join(',') || 'ok');
  const failed = results.filter((r) => r.status === 'Failed').length;
  console.log(`Итого: ${results.length}, Passed ${results.length - failed}, Failed ${failed}`);
  process.exitCode = failed ? 1 : 0;
}
