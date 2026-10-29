// Runs every part, then writes results.json and the markdown table (30-api-test-run.md).
// Usage: node docs/testing-kulikov/scripts/run-all.mjs   (env PORT=5190 HOST=localhost)
import { writeFileSync } from 'node:fs';
import { results } from './lib.mjs';

for (const part of ['part-a-endpoints', 'part-b-sizes', 'part-c-notations-xss', 'part-d-load-static']) {
  const before = results.length;
  await import(`./${part}.mjs`);
  console.log(`${part}: ${results.length - before} checks`);
}
writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify(results, null, 1));
const fails = results.filter((x) => !x.pass);
console.log(`checks: ${results.length}, pass: ${results.length - fails.length}, fail: ${fails.length}`);
for (const x of fails) console.log(`FAIL ${x.id} ${x.title} -> ${x.actual}`);
