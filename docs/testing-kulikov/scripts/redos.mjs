import { importDiagram } from '../../../site/js/utils/import-diagram.js';
const cases = { script: '<script>alert(1)</script>', gantt: 'gantt\n title x\n section a\n task :a1, 2024-01-01, 3d', mm: 'graph TD\nA-->B\nB-->C' };
for (const [k, v] of Object.entries(cases)) {
  const t = Date.now();
  const r = importDiagram(v);
  console.log(k, r.ok, r.reason ?? '', Date.now() - t, 'ms');
}
