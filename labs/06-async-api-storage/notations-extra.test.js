import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generate, parseDiagram, renderNotation } from '../../site/js/notations/index.js';

const svg = (source) => renderNotation(parseDiagram(source));

test('BPMN draws intermediate events, parallel gateways and end events with their own marks', () => {
  const out = svg(
    'diagram bpmn\nstart s\nintermediate m "wait"\nparallel p\ntask a\ntask b\nparallel q\nend e\nflow s -> m\nflow m -> p\nflow p -> a\nflow p -> b\nflow a -> q\nflow b -> q\nflow q -> e',
  );
  assert.match(out, /<circle[^>]*r="18"[^>]*\/><circle[^>]*r="14"/);
  assert.match(out, /M[\d.]+ [\d.]+H[\d.]+M[\d.]+ [\d.]+V/);
  assert.match(out, /stroke-width="4"/);
});

test('GOST flowchart draws every symbol of the standard', () => {
  const out = svg(
    [
      'diagram gost',
      'start s',
      'predefined f "Sort"',
      'manual m "Enter"',
      'document d "Report"',
      'storage st "Archive"',
      'offpage o1 "A"',
      'offpage o2 "A"',
      'connector c1 "1"',
      'connector c2 "1"',
      'comment k "Note"',
      'process p',
      'end e',
      'flow s -> f',
      'flow f -> m',
      'flow m -> d',
      'flow d -> st',
      'flow st -> o1',
      'flow o2 -> c1',
      'flow c2 -> p',
      'flow p -> e',
      'note k -> p',
    ].join('\n'),
  );
  assert.match(out, /V[\d.]+M[\d.]+ [\d.]+V/);
  assert.match(out, /Q[\d.]+ [\d.]+ [\d.]+ [\d.]+T/);
  assert.match(out, /A[\d.]+ 8 0 0 1/);
  assert.match(out, /stroke-dasharray="6 4"/);
  assert.equal(parseDiagram('diagram gost\nstart s\nend e\nflow s -> e').problems.length, 0);
});

test('self loops, titles and untitled diagrams render and export', () => {
  assert.match(
    svg('diagram dfd "Loops"\nprocess 1\nprocess 2\nflow 1 -> 1 "again"\nflow 1 -> 2 "next"\nflow 2 -> 1 "back"'),
    /C[\d.]+ [\d.-]+ [\d.]+ [\d.-]+ [\d.]+ [\d.-]+/,
  );
  assert.doesNotMatch(svg('diagram dfd\nprocess 1'), /font-size="16"/);
  assert.doesNotMatch(generate(parseDiagram('diagram uml sequence\nparticipant A\nparticipant B\nA -> B'), 'plantuml'), /title/);
  assert.doesNotMatch(generate(parseDiagram('diagram uml timing\nlifeline l states A, B\nat 0 l A'), 'plantuml'), /title/);
  assert.match(generate(parseDiagram('diagram uml timing "T"\nlifeline l states A, B\nat 0 l A'), 'plantuml'), /title T/);
  assert.match(generate(parseDiagram('diagram uml sequence "S"\nparticipant A\nparticipant B\nA -> B'), 'plantuml'), /title S/);
});

test('class diagram exports members with and without return types and plain associations', () => {
  const model = parseDiagram('diagram uml class\nclass A {\n + f(x: int)\n + g(): int\n + h\n}\nclass B\nA -- B\nA --> B : uses');
  assert.match(generate(model, 'mermaid'), /\+f\(x: int\)\n/);
  assert.match(generate(model, 'mermaid'), /\+g\(\) int/);
  assert.match(generate(model, 'mermaid'), /\+h\n/);
  assert.match(generate(model, 'plantuml'), /\+f\(x: int\)/);
  assert.match(generate(model, 'graphviz'), /label="uses"/);
  const out = renderNotation(model);
  assert.match(out, /\+g\(\): int/);
  assert.match(out, /<path class="notation__edge"[^>]*marker-start="url\(#m-open\)"/);
});

test('ER exports cover relationships without labels, mandatory attributes and complete categories', () => {
  const model = parseDiagram(
    'diagram erd\nentity A {\n id: int pk\n n: int notnull\n m: int\n}\nentity B {\n id: int pk\n a: int fk -> A\n}\nrelationship A 1:1 B\nrelationship B N:1 A "owner"',
  );
  assert.match(generate(model, 'mermaid'), /: "has"/);
  assert.match(generate(model, 'plantuml'), /\* n : int/);
  assert.match(generate(model, 'plantuml'), /<<FK>>/);
  assert.match(generate(model, 'plantuml'), /e0 \|\|--\|\| e1/);
  assert.match(generate(model, 'graphviz'), /label="owner"/);
  const incomplete = parseDiagram('diagram idef1x\nentity P {\n id: int pk\n}\nentity S {\n id: int pk fk\n}\ncategory P incomplete d: S');
  assert.doesNotMatch(renderNotation(incomplete), /stroke-width="1.2"\/><text/);
  assert.match(
    renderNotation(parseDiagram('diagram idef1x\nentity P {\n id: int pk\n}\nentity S {\n id: int pk fk\n}\ncategory P complete d: S')),
    /H[\d.]+M[\d.]+ [\d.]+H/,
  );
});

test('graph exports label edges by text, weight or nothing', () => {
  const model = parseDiagram('diagram graph\nvertex A\nvertex B\nvertex C\nedge A -- B\nedge B -- C weight=3 "x"');
  assert.match(generate(model, 'graphviz'), /label="x 3"/);
  assert.match(generate(model, 'mermaid'), /v0 ---\|"1"\| v1|v0 --- v1/);
  const plain = parseDiagram('diagram graph\nvertex A\nvertex B\nedge A -- B');
  assert.match(generate(plain, 'mermaid'), /v0 --- v1/);
  assert.match(renderNotation(plain), /<svg/);
});

test('alternate keys are shown in IDEF1X tables and invalid weights fall back to one', () => {
  const ak = parseDiagram('diagram idef1x\nentity P {\n id: int pk\n code: string ak1\n}');
  assert.match(renderNotation(ak), /\(AK1\) code : string/);
  assert.match(generate(ak, 'graphviz'), /\(AK1\) code/);
  const net = parseDiagram('diagram petri\nplace p\ntransition t\narc p -> t weight=x');
  assert.doesNotMatch(renderNotation(net), /undefined|NaN/);
});

test('a local engine that returns an unusable image tells the user instead of failing silently', async () => {
  const { JSDOM } = await import('jsdom');
  const { readFileSync } = await import('node:fs');
  const { ENGINES } = await import('../../site/js/engines/engines.js');
  const { initDiagramRunner } = await import('../../site/js/components/diagram-runner.js');
  const { createMemoryBackend, createStorage } = await import('../../site/js/utils/storage.js');
  const window = new JSDOM(readFileSync('site/app/editor.html', 'utf8'), { url: 'http://localhost/' }).window;
  const storage = createStorage(createMemoryBackend());
  storage.set('settings', { 'diagram-engine': 'local' });
  const local = ENGINES.find((engine) => engine.id === 'local');
  const original = local.build;
  local.build = () => '<svg';
  try {
    const runner = initDiagramRunner({ root: window.document, storage, api: { renderDiagram: async () => '', checkHealth: async () => ({}) }, autoRun: false });
    assert.equal(await runner.run(), false);
    assert.equal(window.document.querySelector('.canvas__status').textContent, 'Не удалось построить изображение диаграммы.');
  } finally {
    local.build = original;
  }
});
