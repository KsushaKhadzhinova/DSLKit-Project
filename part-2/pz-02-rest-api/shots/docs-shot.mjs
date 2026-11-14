// Makes figure 14 of practical 2: the API documentation (a fragment of API.md and a fragment of GET /api/openapi.json
// taken from the real server on port 3962). Run from the folder of the work: node shots/docs-shot.mjs
import fs from 'node:fs';
import path from 'node:path';
import { consolePage, ensureDir, here, isUp, launch, shootHtml, start, waitFor } from './lib.mjs';

const work = here(import.meta.url);
const out = ensureDir(path.join(work, 'figures'));
const ORIGIN = 'http://localhost:3962';
if (await isUp(ORIGIN)) throw new Error(`${ORIGIN} is already in use, stop that server first`);

const server = start(work, ['src/server.js'], { PORT: '3962' });
await waitFor(`${ORIGIN}/health`);
const spec = await (await fetch(`${ORIGIN}/api/openapi.json`)).json();
server.stop();
await server.exited;

const md = fs.readFileSync(path.join(work, 'API.md'), 'utf8').split('\n');
const from = md.findIndex((l) => l.startsWith('## Endpoints'));
const to = md.findIndex((l, i) => i > from && l.startsWith('Extra operations'));
const fragment = md.slice(from, to).join('\n').trimEnd();
const post = JSON.stringify({ '/users': { post: spec.paths['/users'].post } }, null, 2).split('\n').slice(0, 32);

const browser = await launch();
const page = await browser.newPage();
const lines = [
  '# API.md (fragment, section "Endpoints")',
  fragment,
  '',
  '# GET /api/openapi.json (fragment: paths./users.post, the first 32 lines, the rest is cut)',
  ...post,
];
await shootHtml(page, consolePage({ title: 'API documentation', note: 'Text of the file API.md and an answer of the running server (GET /api/openapi.json), shown as text. Not a Swagger UI or Postman window.', lines }), path.join(out, '14-api-docs.png'), 1100);
await browser.close();
console.log('Saved', path.join(out, '14-api-docs.png'));
