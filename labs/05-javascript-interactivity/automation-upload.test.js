import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACCEPT, MAX_FILE_BYTES, importUpload, pictureType, uploadKind } from '../../site/js/automation/upload.js';

const NL = String.fromCharCode(10);
const MERMAID = ['graph TD', 'A[Start] --> B{Ok?}', 'B -->|yes| C[Done]'].join(NL);

test('the kind of a file comes from its type or its name', () => {
  assert.equal(uploadKind({ name: 'a.PNG', type: '' }), 'picture');
  assert.equal(uploadKind({ name: 'a', type: 'application/pdf' }), 'picture');
  assert.equal(uploadKind({ name: 'a.bmp' }), 'bmp');
  assert.equal(uploadKind({ name: 'a', type: 'image/bmp' }), 'bmp');
  assert.equal(uploadKind({ name: 'a.vsdx' }), 'zip');
  assert.equal(uploadKind({ name: 'a.drawio' }), 'text');
  assert.equal(uploadKind({ name: 'a.bin' }), 'unknown');
  assert.equal(uploadKind({}), 'unknown');
  assert.equal(pictureType({ name: 'a.jpg' }), 'image/jpeg');
  assert.equal(pictureType({ name: 'a', type: 'image/gif' }), 'image/gif');
  assert.equal(pictureType({ name: 'a.txt' }), null);
  assert.equal(pictureType({}), null);
  assert.match(ACCEPT, /\.drawio/);
  assert.match(ACCEPT, /\.pdf/);
  assert.equal(MAX_FILE_BYTES, 10 * 1024 * 1024);
});

test('structured files are imported without a key and checked by the parser', async () => {
  const json = JSON.stringify({ nodes: [{ id: 'a' }, { id: 'b' }], edges: [{ from: 'a', to: 'b' }] });
  const result = await importUpload(json, { fileName: 'g.json', lang: 'en' });
  assert.equal(result.ok, true);
  assert.equal(result.source, 'import');
  assert.equal(result.format, 'json');
  assert.equal(result.notation, 'graph');
  assert.equal(result.valid, true);
  const warned = await importUpload(
    '<mxGraphModel><root><mxCell id="v" vertex="1" value="X"/><mxCell id="g" vertex="1" style="swimlane"/></root></mxGraphModel>',
  );
  assert.equal(warned.problems[0].line, '•');
});

test('Mermaid, PlantUML and DSLKit still go through the existing import', async () => {
  assert.equal((await importUpload(MERMAID)).ok, true);
  assert.equal((await importUpload(`diagram graph${NL}vertex a`)).kind, 'dsl');
  assert.equal((await importUpload('just words', { fileName: 'a.txt' })).reason, 'unknown');
  assert.equal((await importUpload('   ')).reason, 'empty');
});

test('Markdown takes the first diagram block', async () => {
  const block = ['# T', '```mermaid', MERMAID, '```'].join(NL);
  assert.equal((await importUpload(block, { fileName: 'a.md' })).ok, true);
  const dot = ['text', '```dot', 'digraph { a -> b }', '```'].join(NL);
  assert.equal((await importUpload(dot, { fileName: 'a.md' })).format, 'dot');
  assert.equal((await importUpload('no blocks', { fileName: 'a.md' })).reason, 'unknown');
});

test('a file that is too large or has no structure is refused with a reason', async () => {
  assert.equal((await importUpload('x'.repeat(MAX_FILE_BYTES + 1))).reason, 'too-big');
  const none = await importUpload('<svg><rect/></svg>');
  assert.equal(none.ok, false);
  assert.equal(none.reason, 'no-structure');
  assert.equal((await importUpload(undefined)).reason, 'empty');
  assert.equal((await importUpload('{broken', { fileName: 'a.json' })).reason, 'bad-file');
});
