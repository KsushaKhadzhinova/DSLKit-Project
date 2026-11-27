// The thin entry of `npm run eval`; everything that matters is in main.js. Usage: node tools/eval/cli.js [--write] [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import * as adapters from './adapters.js';
import { main } from './main.js';

const dir = new URL('../../docs/eval/', import.meta.url);
const code = main({
  argv: process.argv.slice(2),
  io: {
    readJson: (name) => JSON.parse(readFileSync(new URL(name, dir), 'utf8')),
    writeText: (name, text) => writeFileSync(new URL(name, dir), text),
    log: (text) => console.log(text),
  },
  adapters,
  clock: () => performance.now(),
});
process.exit(code);
