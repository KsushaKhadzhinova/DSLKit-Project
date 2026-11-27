import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { SOURCES, sourceHash, staleFigures } from './figures.js';
import { imagesOf, isMarked, markPlaceholder, MARK, placeholderFigures } from './figure-files.js';

const folder = () => {
  const dir = mkdtempSync(join(tmpdir(), 'figs-'));
  for (const d of ['src/inner', 'views', 'public', 'test', 'figures']) mkdirSync(join(dir, d), { recursive: true });
  writeFileSync(join(dir, 'src/app.js'), 'a\r\nb\r\n');
  writeFileSync(join(dir, 'src/inner/x.js'), 'x');
  writeFileSync(join(dir, 'views/index.ejs'), '<p>');
  writeFileSync(join(dir, 'public/logo.png'), Buffer.from([1, 2, 3, 13, 10]));
  writeFileSync(join(dir, 'test/a.test.js'), 't');
  writeFileSync(join(dir, 'limits.json'), '{}');
  return dir;
};

test('the source hash ignores line ends in text, counts every source file and changes with a content change', () => {
  const dir = folder();
  const first = sourceHash(dir);
  writeFileSync(join(dir, 'src/app.js'), 'a\nb\n');
  assert.equal(sourceHash(dir), first);
  writeFileSync(join(dir, 'src/inner/x.js'), 'y');
  assert.notEqual(sourceHash(dir), first);
  assert.deepEqual(SOURCES, ['src', 'views', 'public', 'test', 'limits.json']);
  const binary = sourceHash(dir);
  writeFileSync(join(dir, 'public/logo.png'), Buffer.from([1, 2, 3, 13, 11]));
  assert.notEqual(sourceHash(dir), binary);
});

test('figures are stale without a manifest, with a broken one and after a change of the sources', () => {
  const dir = folder();
  assert.match(staleFigures(dir), /manifest\.json is missing/);
  writeFileSync(join(dir, 'figures/manifest.json'), '{');
  assert.match(staleFigures(dir), /missing or broken/);
  writeFileSync(join(dir, 'figures/manifest.json'), JSON.stringify({ sourceHash: sourceHash(dir) }));
  assert.equal(staleFigures(dir), '');
  writeFileSync(join(dir, 'views/index.ejs'), '<p>changed');
  assert.match(staleFigures(dir), /changed after the screenshots were made/);
  assert.equal(
    staleFigures(dir, () => JSON.stringify({ sourceHash: sourceHash(dir) })),
    '',
  );
});

const png = () => {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const iend = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  return Buffer.concat([header, iend]);
};

test('a placeholder PNG carries a mark, a real one does not', () => {
  const marked = markPlaceholder(png());
  assert.ok(isMarked(marked));
  assert.ok(!isMarked(png()));
  assert.ok(marked.includes(Buffer.from(MARK)));
  assert.deepEqual([...marked.subarray(marked.length - 12)], [0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
});

test('placeholders are found by the mark and by the file name', () => {
  const md = [
    '![a](figures/a.png)',
    '',
    'text',
    '![b](figures/owner-403.png)',
    '![c](figures/placeholder-1.png)',
    '![d](figures/m.png)',
    '![e](figures/x.png)',
  ].join('\n');
  assert.deepEqual(imagesOf(md), ['figures/a.png', 'figures/owner-403.png', 'figures/placeholder-1.png', 'figures/m.png', 'figures/x.png']);
  const files = {
    'd/figures/a.png': png(),
    'd/figures/owner-403.png': png(),
    'd/figures/placeholder-1.png': png(),
    'd/figures/m.png': markPlaceholder(png()),
    'd/figures/x.png': png(),
  };
  assert.deepEqual(
    placeholderFigures(md, 'd', (p) => files[p]),
    ['figures/owner-403.png', 'figures/placeholder-1.png', 'figures/m.png'],
  );
});
