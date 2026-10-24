#!/usr/bin/env node
// Mutation testing without dependencies: changes one operator or number at a time in a source file, runs the tests,
// and reports the mutants the tests did NOT notice ("survivors"). A survivor means a line that no test really checks.
//
//   node tools/mutate.cjs <source-file> --cwd <folder with package.json> [--cmd "node --test tests/*.test.js"] [--max 60] [--timeout 120]
//
// The file is restored after every mutant and at the end, also on Ctrl+C.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const args = process.argv.slice(2);
const file = path.resolve(args[0] ?? '');
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const cwd = path.resolve(opt('--cwd', path.dirname(file)));
const command = opt('--cmd', 'node --test "tests/*.test.js"');
const max = Number(opt('--max', 60));
const timeout = Number(opt('--timeout', 120)) * 1000;

if (!args[0] || !fs.existsSync(file)) {
  console.error('usage: node tools/mutate.cjs <source-file> --cwd <folder> [--cmd "..."] [--max N] [--timeout seconds]');
  process.exit(2);
}

const original = fs.readFileSync(file, 'utf8');
const restore = () => fs.writeFileSync(file, original);
process.on('SIGINT', () => {
  restore();
  process.exit(130);
});

// Only code lines are mutated: comments and strings are skipped by a simple scan.
const swaps = [
  ['===', '!=='],
  ['!==', '==='],
  ['<=', '<'],
  ['>=', '>'],
  ['&&', '||'],
  ['||', '&&'],
  [' < ', ' <= '],
  [' > ', ' >= '],
  ['true', 'false'],
  ['false', 'true'],
  ['.length', '.length + 1'],
];
const mutants = [];
original.split('\n').forEach((line, index) => {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed === '') return;
  const code = line.replace(/\/\/.*$/, '');
  for (const [from, to] of swaps) {
    let at = code.indexOf(from);
    while (at >= 0) {
      const before = code.slice(0, at);
      const quotes = (before.match(/['"`]/g) ?? []).length;
      if (quotes % 2 === 0 && !(from === 'return ' && /^\s*return\s*$/.test(code))) mutants.push({ line: index, at, from, to });
      at = code.indexOf(from, at + from.length);
    }
  }
  for (const match of code.matchAll(/\b(\d+)\b/g)) {
    const before = code.slice(0, match.index);
    if ((before.match(/['"`]/g) ?? []).length % 2 === 0 && Number(match[1]) > 1)
      mutants.push({ line: index, at: match.index, from: match[1], to: String(Number(match[1]) + 1) });
  }
});

// A fixed seed picks the same sample every run.
let seed = 42;
const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const sample = mutants.sort(() => random() - 0.5).slice(0, max);

const env = { ...process.env };
delete env.NODE_TEST_CONTEXT; // set inside a test run, it would turn the child into a silent worker that always exits 0
const run = () => spawnSync(command, { cwd, shell: true, timeout, encoding: 'utf8', env });
const baseline = run();
if (baseline.status !== 0) {
  console.error('The tests fail before any change, fix them first.\n', (baseline.stdout ?? '').slice(-800));
  process.exit(2);
}

const survivors = [];
let killed = 0;
let broken = 0;
for (const [number, mutant] of sample.entries()) {
  const lines = original.split('\n');
  const line = lines[mutant.line];
  lines[mutant.line] = line.slice(0, mutant.at) + mutant.to + line.slice(mutant.at + mutant.from.length);
  fs.writeFileSync(file, lines.join('\n'));
  const result = run();
  restore();
  if (result.error && result.error.code === 'ETIMEDOUT')
    killed += 1; // a hang is noticed too
  else if (result.status === 0) survivors.push({ ...mutant, text: line.trim() });
  else killed += 1;
  if (/SyntaxError/.test(`${result.stderr}${result.stdout}`)) broken += 1;
  process.stdout.write(`\r${number + 1}/${sample.length} mutants, ${survivors.length} survived`);
}
restore();
const score = sample.length === 0 ? 100 : Math.round((killed / sample.length) * 100);
console.log(
  `\n\nFile: ${path.relative(process.cwd(), file)}\nMutants tried: ${sample.length} (of ${mutants.length}), killed: ${killed}, survived: ${survivors.length}, syntax-broken: ${broken}\nMutation score: ${score} percent\n`,
);
for (const s of survivors) console.log(`  line ${s.line + 1}: "${s.from}" -> "${s.to}"   ${s.text.slice(0, 100)}`);
process.exit(0);
