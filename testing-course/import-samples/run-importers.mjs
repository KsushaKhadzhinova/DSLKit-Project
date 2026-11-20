// Runs the project importers over every sample of this folder and prints one row per file:
// the detected format, the notation, the counts of elements and links of the produced code, and whether it parses without errors.
// Usage: node testing-course/import-samples/run-importers.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importUpload } from '../../site/js/automation/upload.js';
import { vsdxToXml } from '../../site/js/utils/diagram-file-import.js';
import { parseDiagram } from '../../site/js/notations/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const SKIP = /\.(png|md|txt|out\.dot)$|^run-|^build-|^expected/;
const rows = [];
for (const name of readdirSync(here).sort()) {
  if (SKIP.test(name)) continue;
  const bytes = readFileSync(join(here, name));
  const text = /\.vsdx$/.test(name) ? await vsdxToXml(new Uint8Array(bytes)) : bytes.toString('utf8');
  const result = await importUpload(text, { fileName: /\.vsdx$/.test(name) ? 'page.vdx' : name, lang: 'en' });
  const code = result.dsl ?? '';
  const model = code ? parseDiagram(code) : null;
  const lines = code.split('\n');
  const links = lines.filter((line) => /^\s*(flow|edge|message|transition|->)|-->|--|->/.test(line) && !/^diagram|^mode/.test(line)).length;
  rows.push({
    file: name,
    ok: result.ok,
    format: result.format ?? result.source ?? result.reason,
    notation: model?.notation ?? '-',
    lines: lines.length,
    links,
    errors: model ? model.problems.filter((item) => item.severity === 'error').length : '-',
  });
}
console.table(rows);
