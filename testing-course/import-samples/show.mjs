// Prints the DSLKit code and the problems the importer produces for one sample: node testing-course/import-samples/show.mjs <file> [xml]
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importUpload } from '../../site/js/automation/upload.js';
import { vsdxToXml } from '../../site/js/utils/diagram-file-import.js';

const name = process.argv[2];
const bytes = readFileSync(join(dirname(fileURLToPath(import.meta.url)), name));
const isVsdx = /\.vsdx$/.test(name);
const text = isVsdx ? await vsdxToXml(new Uint8Array(bytes)) : bytes.toString('utf8');
if (process.argv[3] === 'xml') console.log(text.slice(0, Number(process.argv[4] ?? 3000)));
const result = await importUpload(text, { fileName: isVsdx ? 'page.vdx' : name, lang: 'en' });
console.log(
  result.ok,
  result.reason,
  result.format,
  (result.problems ?? []).map((item) => `${item.line}:${item.code}:${item.message}`),
);
console.log(result.dsl);
