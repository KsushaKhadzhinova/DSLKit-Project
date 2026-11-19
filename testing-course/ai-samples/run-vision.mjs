// Sends the pictures of this folder to a running server (node --env-file=.env tools/serve.js site 5199) and prints one row per file.
// The key stays in the server; this script never reads it. Usage: node run-vision.mjs [port]
import { readFileSync } from 'node:fs';
const port = process.argv[2] ?? '5199';
const TYPES = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf' };
const files = process.argv.slice(3).length ? process.argv.slice(3) : ['flow.png', 'erd.webp', 'bpmn.png', 'sketch.jpg', 'flow.pdf'];
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
for (const name of files) {
  const bytes = readFileSync(new URL(name, import.meta.url));
  const body = { mode: 'image', lang: 'en', mediaType: TYPES[name.split('.').pop()], image: bytes.toString('base64') };
  const answer = await fetch(`http://localhost:${port}/api/ai/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await answer.json();
  console.log(`== ${name} -> HTTP ${answer.status} ${json.error?.code ?? ''} notation=${json.notation ?? '-'} attempts=${json.attempts ?? json.error?.attempts ?? '-'}`);
  console.log(json.code ?? json.error?.code ?? json.error?.message ?? '');
  await pause(13000);
}
