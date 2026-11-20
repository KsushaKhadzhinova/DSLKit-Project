import { readFileSync } from 'node:fs';
import { importUpload } from '../../site/js/automation/upload.js';
for (const f of process.argv.slice(2)) {
  const r = await importUpload(readFileSync(f, 'utf8'), { fileName: f.split('/').pop(), lang: 'en' });
  console.log('==', f, r.ok, r.reason, r.format);
  for (const p of (r.problems || []).filter((p) => p.severity === 'error')) console.log(' ', p.line, p.message);
  if (process.env.SHOW) console.log(r.dsl);
}
