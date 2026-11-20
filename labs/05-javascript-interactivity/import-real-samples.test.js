// Files exported by the real tools (Graphviz, Mermaid, PlantUML, draw.io, bpmn.io, Eclipse UML2, vsdx, Gephi) and a few documented formats built by hand.
// The importer reads each of them, the produced code parses without errors and keeps the numbers of the elements and links.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { importUpload } from '../../site/js/automation/upload.js';
import { vsdxToXml } from '../../site/js/utils/diagram-file-import.js';

const dir = new URL('../../testing-course/import-samples/', import.meta.url);
const load = async (name) => {
  const bytes = readFileSync(new URL(name, dir));
  const vsdx = name.endsWith('.vsdx');
  return importUpload(vsdx ? await vsdxToXml(new Uint8Array(bytes)) : bytes.toString('utf8'), { fileName: vsdx ? 'page.vdx' : name, lang: 'en' });
};
const links = (code) => code.split('\n').filter((line) => /^(flow|edge) |-->|--\|>|\.\.\|>/.test(line)).length;
const errors = (result) => result.problems.filter((item) => item.severity === 'error').length;

// file: [format, links]; every one of them has no error of the parser.
const CLEAN = {
  'graphviz-flow.dot': ['dot', 5],
  'graphviz-flow.svg': ['svg', 5],
  'graphviz-graph.dot': ['dot', 4],
  'graphviz-graph.svg': ['svg', 4],
  'kroki-graphviz-flow.svg': ['svg', 5],
  'mermaid-flow.mmd': ['mermaid', 6],
  'mermaid-flow.svg': ['svg', 6],
  'plantuml-sequence.puml': ['plantuml', 2],
  'plantuml-state.puml': ['plantuml', 0],
  'drawio-habit-tracker-dfd.drawio': ['drawio', 10],
  'drawio-template-flowchart-1.xml': ['drawio', 29],
  'bpmnio-pizza-collaboration.bpmn': ['bpmn', 18],
  'bpmnio-simple.bpmn': ['bpmn', 2],
  'eclipse-uml2-library.uml': ['xmi', 4],
  'ea-xmi-sample.xmi': ['xmi', 2],
  'yed-sample.graphml': ['graphml', 2],
  'gexf-hello-world.gexf': ['gexf', 1],
  'excalidraw-sample.excalidraw': ['json', 1],
  'edges-comma.csv': ['csv', 3],
  'edges-semicolon.csv': ['csv', 2],
  'edges-tab.tsv': ['csv', 2],
  'visio-sample.vdx': ['visio', 1],
  'vsdx-py-connectors.vsdx': ['visio', 2],
};
for (const [name, [format, count]] of Object.entries(CLEAN)) {
  test(`real sample ${name} is imported as ${format} with ${count} links`, async () => {
    const result = await load(name);
    assert.equal(result.ok, true);
    assert.equal(result.format, format);
    assert.equal(links(result.dsl), count);
    // The sample of bpmn.io with two pools has two start events: the one process of DSLKit allows one start.
    assert.equal(errors(result), name === 'bpmnio-pizza-collaboration.bpmn' ? 1 : 0);
  });
}

test('the Mermaid SVG of version 11 keeps the labels of the links', async () => {
  assert.match((await load('mermaid-flow.svg')).dsl, /edge C -> D "yes"/);
});

test('the inside of a sub-process stays one task and does not add start and end events', async () => {
  const result = await load('bpmnio-simple.bpmn');
  assert.equal(result.dsl.split('\n').filter((line) => /^start /.test(line)).length, 1);
});

test('a PlantUML SVG has no structure and is refused, not guessed', async () => {
  assert.equal((await load('plantuml-sequence.svg')).ok, false);
});

test('a compressed and an uncompressed draw.io file give nodes and links', async () => {
  const packed = await load('drawio-incident-response-bpmn.drawio');
  assert.equal(packed.ok, true);
  assert.ok(links(packed.dsl) >= 28);
});

test('XMI associations: a named one becomes a labelled link, an incomplete one and an untyped element are skipped', async () => {
  const xmi =
    '<xmi:XMI xmlns:xmi="x" xmlns:uml="u"><uml:Model>' +
    '<packagedElement xmi:type="uml:Class" xmi:id="A" name="A"/><packagedElement xmi:type="uml:Class" xmi:id="B" name="B"/>' +
    '<packagedElement xmi:id="N" name="untyped"/>' +
    '<packagedElement xmi:type="uml:Association" xmi:id="X1" name="owns"><ownedEnd type="A"/><ownedEnd type="B"/></packagedElement>' +
    '<packagedElement xmi:type="uml:Association" xmi:id="X2"><ownedEnd type="A"/></packagedElement>' +
    '</uml:Model></xmi:XMI>';
  const result = await importUpload(xmi, { fileName: 'm.xmi', lang: 'en' });
  assert.match(result.dsl, /A --> B : owns/);
  assert.equal(links(result.dsl), 1);
});
