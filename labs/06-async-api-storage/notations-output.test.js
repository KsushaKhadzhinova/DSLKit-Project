import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initDiagramRunner } from '../../site/js/components/diagram-runner.js';
import { initEditor } from '../../site/js/components/editor.js';
import { showProblems } from '../../site/js/components/problems-panel.js';
import { ENGINES, engineForFormat } from '../../site/js/engines/engines.js';
import { renderLocal } from '../../site/js/engines/local-engine.js';
import {
  TEMPLATES,
  analyzeDag,
  analyzeGraph,
  dijkstra,
  enabledTransitions,
  fire,
  generate,
  initialMarking,
  isDeadlock,
  parseDiagram,
  renderNotation,
  topologicalOrder,
} from '../../site/js/notations/index.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const model = (key, extra = '') => parseDiagram(TEMPLATES[key] + extra);

test('Petri token game: enabled transitions, firing, weights and deadlock', () => {
  const net = parseDiagram(TEMPLATES.petri);
  const start = initialMarking(net);
  assert.deepEqual(start, { free: 2, used: 0 });
  assert.deepEqual(enabledTransitions(net, start), ['put']);
  const next = fire(net, start, 'put');
  assert.deepEqual(next, { free: 1, used: 2 });
  assert.deepEqual(start, { free: 2, used: 0 });
  assert.deepEqual(enabledTransitions(net, next), ['put', 'take']);
  assert.deepEqual(fire(net, next, 'take'), { free: 2, used: 1 });
  assert.throws(() => fire(net, start, 'take'), /not enabled/);
  assert.throws(() => fire(net, start, 'nope'), /not enabled/);
  assert.equal(isDeadlock(net, start), false);
  assert.equal(isDeadlock(net, { free: 0, used: 0 }), true);
});

test('graph analysis: components, cycles, trees, bipartite, order, spanning tree and Dijkstra', () => {
  const graph = (body) => parseDiagram(`diagram graph\n${body}`);
  const tree = analyzeGraph(graph('vertex A\nvertex B\nvertex C\nedge A -- B\nedge A -- C'));
  assert.deepEqual([tree.isTree, tree.cyclic, tree.bipartite, tree.connected, tree.components], [true, false, true, true, 1]);
  assert.deepEqual(tree.matrix, [
    [0, 1, 1],
    [1, 0, 0],
    [1, 0, 0],
  ]);
  assert.equal(tree.mst.weight, 2);
  const triangle = analyzeGraph(graph('vertex A\nvertex B\nvertex C\nedge A -- B\nedge B -- C\nedge C -- A'));
  assert.deepEqual([triangle.cyclic, triangle.bipartite, triangle.isTree], [true, false, false]);
  const loop = analyzeGraph(graph('vertex A\nedge A -- A\nvertex B'));
  assert.deepEqual([loop.loops, loop.components, loop.bipartite, loop.connected], [1, 2, false, false]);
  const multi = analyzeGraph(graph('vertex A\nvertex B\nedge A -- B\nedge B -- A'));
  assert.equal(multi.multi, true);
  assert.equal(analyzeGraph(graph('vertex A\nvertex B\nedge A -- B')).multi, false);
  const dag = analyzeGraph(graph('mode directed\nvertex A\nvertex B\nvertex C\nedge A -> B\nedge A -> C\nedge B -> C'));
  assert.deepEqual([dag.isDag, dag.order, dag.isTree, dag.mst], [true, ['A', 'B', 'C'], false, null]);
  const arbor = analyzeGraph(graph('mode directed\nvertex A\nvertex B\nvertex C\nedge A -> B\nedge A -> C'));
  assert.equal(arbor.isTree, true);
  const cyc = analyzeGraph(graph('mode directed\nvertex A\nvertex B\nedge A -> B\nedge B -> A'));
  assert.deepEqual([cyc.isDag, cyc.cyclic, cyc.order], [false, true, null]);
  const weighted = graph('vertex A\nvertex B\nvertex C\nvertex D\nedge A -- B weight=1\nedge B -- C weight=1\nedge A -- C weight=5\nedge C -- D weight=2');
  assert.deepEqual(dijkstra(weighted, 'A', 'D'), { distance: 4, path: ['A', 'B', 'C', 'D'] });
  assert.equal(dijkstra(weighted, 'A', 'A').distance, 0);
  assert.equal(dijkstra(graph('vertex A\nvertex B'), 'A', 'B'), null);
  assert.equal(analyzeGraph(weighted).mst.weight, 4);
  assert.deepEqual(
    topologicalOrder(
      ['a', 'b'],
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
      ],
    ),
    null,
  );
  const text = graph('mode directed\nvertex A\nvertex B\nedge A -> B weight=2\npath A -> B').problems.map((item) => item.params);
  assert.ok(text.some((params) => params.path === 'A -> B' && params.distance === 2));
});

test('DAG analysis: layers, roots, leaves, critical path with durations', () => {
  const dag = parseDiagram(TEMPLATES.dag);
  const info = analyzeDag(dag);
  assert.deepEqual(info.order, ['fetch', 'compile', 'lint', 'test', 'package']);
  assert.deepEqual(
    info.layers,
    [['fetch'], ['compile', 'lint'], ['test', 'package']]
      .map((layer, index) => (index === 2 ? ['test', 'package'] : layer))
      .slice(0, 3)
      .map((layer, index) => (index === 2 ? ['test'] : layer))
      .concat([['package']]),
  );
  assert.deepEqual([info.roots, info.leaves], [['fetch'], ['package']]);
  assert.deepEqual(info.critical, ['fetch', 'compile', 'test', 'package']);
  assert.equal(info.length, 17);
  assert.equal(info.redundant.length, 0);
  const lone = analyzeDag(parseDiagram('diagram dag\ntask a duration=bad'));
  assert.equal(lone.length, 1);
  assert.equal(analyzeDag({ nodes: [], edges: [] }).length, 0);
});

test('generators write native syntax for each format', () => {
  const cls = model('uml-class');
  assert.match(generate(cls, 'mermaid'), /classDiagram[\s\S]*Person <\|-- Customer/);
  assert.match(generate(cls, 'mermaid'), /Payable <\|\.\. Order/);
  assert.match(generate(cls, 'mermaid'), /Customer "1" --> "0\.\.\*" Order : places/);
  assert.match(generate(cls, 'plantuml'), /abstract class "Person" as Person \{/);
  assert.match(generate(cls, 'plantuml'), /Customer --\|> Person/);
  assert.match(generate(cls, 'graphviz'), /taillabel="1"/);
  assert.match(generate(cls, 'graphviz'), /arrowtail=diamond/);
  assert.match(generate(cls, 'graphviz'), /arrowhead=empty/);
  const assoc = parseDiagram('diagram uml class\nclass A\nclass B\nA -- B\nA "1" --> "*" B');
  assert.match(generate(assoc, 'graphviz'), /arrowhead=none/);
  assert.match(generate(assoc, 'mermaid'), /A -- B/);
  assert.match(generate(assoc, 'plantuml'), /A -- B/);

  const erd = model('erd');
  assert.match(generate(erd, 'mermaid'), /erDiagram[\s\S]*Customer \|\|--o\{ Order : "places"/);
  assert.match(generate(erd, 'mermaid'), /Order \}o--o\{ Product/);
  assert.match(generate(erd, 'plantuml'), /entity "Customer" as e0 \{\n {2}\* id : int\n {2}--/);
  assert.match(generate(erd, 'graphviz'), /<TABLE/);
  assert.match(generate(erd, 'graphviz'), /arrowtail=teetee, arrowhead=crow/);
  const idef1x = model('idef1x');
  assert.match(generate(idef1x, 'mermaid'), /Customer \|\|\.\.o\{ Order/);
  assert.match(generate(idef1x, 'mermaid'), /Order \|\|--\|\{ OrderLine/);
  assert.match(generate(idef1x, 'graphviz'), /STYLE="ROUNDED"/);
  assert.match(generate(idef1x, 'graphviz'), /style=dashed/);
  assert.match(generate(idef1x, 'plantuml'), /circle "kind" as/);

  assert.match(generate(model('uml-state'), 'mermaid'), /stateDiagram-v2[\s\S]*\[\*\] --> n1[\s\S]*n2 --> \[\*\] : stop/);
  assert.match(generate(model('uml-state'), 'plantuml'), /@startuml\ntitle Player\nstate "Idle" as n1/);
  assert.doesNotMatch(generate(parseDiagram('diagram uml state\ninitial i\nstate a\ntransition i -> a'), 'plantuml'), /title/);
  assert.match(generate(model('uml-sequence'), 'mermaid'), /sequenceDiagram[\s\S]*pCustomer->>pShop: place order[\s\S]*pShop-\)pCustomer|pShop->>/);
  assert.match(generate(model('uml-sequence'), 'plantuml'), /pShop ->> pCustomer : confirmation email/);
  assert.match(generate(model('uml-sequence'), 'mermaid'), /pBank-->>pShop: approved/);
  assert.match(generate(parseDiagram('diagram uml sequence\nparticipant A\nA -> A'), 'mermaid'), /: -$/);
  assert.match(generate(model('uml-timing'), 'plantuml'), /robust "Traffic light" as light\n[\s\S]*@0\nlight is "Red"\ncar is "Stopped"/);
  assert.match(generate(model('petri'), 'graphviz'), /Free slots \(2\)/);
  assert.match(generate(model('petri'), 'graphviz'), /label="2"/);
  assert.match(generate(model('dfd'), 'mermaid'), /n0\["Customer"\]/);
  assert.match(generate(model('bpmn'), 'mermaid'), /\{"In stock\?"\}/);
  assert.match(generate(model('bpmn'), 'plantuml'), /diamond "In stock\?" as n2/);
  assert.match(generate(model('uml-usecase'), 'plantuml'), /n[0-9]+ \.\.> n[0-9]+ : «include»/);
  assert.match(generate(model('gost'), 'mermaid'), /\(\["Начало"\]\)/);
  assert.match(generate(model('gost'), 'graphviz'), /shape=parallelogram/);
  assert.match(generate(model('graph'), 'graphviz'), /^graph diagram/);
  assert.match(generate(model('graph'), 'mermaid'), /v0 ---\|"4"\| v1/);
  const directed = parseDiagram('diagram graph "T"\nmode directed\nvertex A\nvertex B\nedge A -> B "x"');
  assert.match(generate(directed, 'graphviz'), /^digraph diagram[\s\S]*label="T"[\s\S]*v0 -> v1 \[label="x"\]/);
  assert.match(generate(directed, 'mermaid'), /v0 -->\|"x"\| v1/);
  assert.match(generate(model('idef3'), 'graphviz'), /dir=both|style=dashed/);
});

test('local renderers draw the characteristic shapes of each notation', () => {
  const svg = (key, extra) => renderNotation(model(key, extra));
  assert.match(svg('dfd'), /<circle[^>]*r="48"/);
  assert.match(svg('bpmn'), /<polygon/);
  assert.match(svg('bpmn'), /M[\d. ]+L[\d. ]+M/);
  assert.match(svg('petri'), /<circle[^>]*r="3.5"/);
  assert.match(svg('petri', '\nplace big "Big" tokens=9\narc big -> put'), />9<\/text>/);
  assert.match(svg('uml-activity'), /<circle[^>]*fill="#1e293b"/);
  assert.match(svg('uml-state'), /rx="12"/);
  assert.match(svg('uml-sequence'), /stroke-dasharray="5 5"/);
  assert.match(svg('uml-sequence'), /marker-end="url\(#m-open\)"/);
  assert.match(svg('uml-class'), /«interface»/);
  assert.match(svg('erd'), /marker-start="url\(#m-one\)"/);
  assert.match(svg('erd'), /PK id : int/);
  assert.match(svg('idef1x'), /rx="14"/);
  assert.match(svg('idef1x'), /<circle[^>]*r="17"/);
  assert.match(svg('gost'), /rx="2\d/);
  assert.match(svg('gost'), /marker-end="url\(#m-arrow\)"/);
  assert.match(svg('uml-timing'), /<text[^>]*>Green<\/text>/);
  assert.match(svg('graph'), /<circle/);
  assert.match(svg('dag'), /Compile \(5\)/);
  assert.match(renderNotation(parseDiagram('diagram graph\nmode directed\nvertex A\nedge A -> A')), /marker-end="url\(#m-arrow\)"/);
  assert.match(renderNotation(parseDiagram('diagram uml state\ninitial i\nstate a\nflow')), /<svg/);
  const parallel = renderNotation(parseDiagram('diagram dfd\nprocess 1\nprocess 2\nflow 1 -> 2 "a"\nflow 2 -> 1 "b"\nflow 1 -> 1 "c"'));
  assert.equal((parallel.match(/class="notation__edge"/g) ?? []).length, 3);
  assert.match(renderNotation(parseDiagram('diagram uml sequence\nparticipant A\nparticipant B\nA -> A : self\nB --> A : r')), /V\d+H/);
  assert.match(renderNotation(parseDiagram('diagram uml timing\nlifeline l states A, B')), /<svg/);
  assert.match(renderLocal(parseDiagram(TEMPLATES.erd)), /<svg/);
  assert.match(renderLocal(parseDiagram(TEMPLATES.idef0)), /local-engine__box/);
});

test('the engine registry can find the engine of a format', () => {
  assert.equal(engineForFormat('plantuml').id, 'plantuml');
  assert.equal(engineForFormat('nothing'), undefined);
  const timing = parseDiagram(TEMPLATES['uml-timing']);
  assert.match(ENGINES.find((engine) => engine.id === 'graphviz').build(timing), /@startuml/);
  assert.match(ENGINES.find((engine) => engine.id === 'mermaid').build(parseDiagram(TEMPLATES.dfd)), /^%%.init: .*htmlLabels.*flowchart/s);
});

// ---------- page behaviour ----------
const ruHtml = readFileSync('site/app/editor.html', 'utf8');
const enHtml = readFileSync('site/en/app/editor.html', 'utf8');
const memory = () => createStorage(createMemoryBackend());
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="5" height="5"/></svg>';

const page = (html = ruHtml, engine = 'local') => {
  const window = new JSDOM(html, { url: 'http://localhost/' }).window;
  const storage = memory();
  storage.set('settings', { 'diagram-engine': engine });
  const api = { renderDiagram: mock.fn(async () => SVG), checkHealth: mock.fn(async () => ({})) };
  const runner = initDiagramRunner({ root: window.document, storage, api, logger: { error() {} }, autoRun: false, isOnline: () => true });
  const editor = initEditor({ root: window.document, storage });
  return {
    window,
    document: window.document,
    api,
    runner,
    editor,
    $: (selector) => window.document.querySelector(selector),
    $$: (selector) => [...window.document.querySelectorAll(selector)],
  };
};

test('loading a template replaces the code, highlights keywords and draws the diagram', async () => {
  const { window, $, $$, editor, document } = page();
  assert.equal(editor.loadTemplate('dfd'), true);
  await flush();
  assert.equal($$('.code__line').length, TEMPLATES.dfd.split('\n').length);
  assert.equal($('.code__line .code__keyword').textContent, 'diagram');
  assert.equal($$('.code__line')[5].querySelector('.code__keyword').textContent, 'store');
  assert.equal($$('.code__line')[1].textContent, 'entity Customer');
  assert.match($('.canvas__remote').innerHTML, /notation__node/);
  assert.equal($('.editor-status__type').textContent, 'DFD');
  assert.equal($('[data-notation-label]').textContent, 'Диаграмма: DFD');
  assert.equal($('.problems__status').textContent, 'Проблем: 0 (ошибки: 0, предупреждения: 0)'.replace(/.*/, 'Проблем нет'));
  assert.equal($('.editor-banner').hidden, true);
  assert.equal($('.button--run').getAttribute('aria-disabled'), 'false');
  assert.equal(editor.loadTemplate('nope'), false);
  $$('.templates__item')[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await flush();
  assert.equal($('.editor-status__type').textContent, 'ERD');
  assert.equal(document.querySelectorAll('.code__line--error').length, 0);
});

test('the notation list offers every notation and loads its template in either language', async () => {
  const ru = page();
  const options = [...ru.$('[data-notation-select]').options];
  assert.equal(options.length, 27);
  assert.match(options[0].textContent, /IDEF0/);
  ru.$('[data-notation-select]').value = 'uml-timing';
  ru.$('[data-notation-select]').dispatchEvent(new ru.window.Event('change'));
  await flush();
  assert.equal(ru.$('.editor-status__type').textContent, 'UML · Timing');
  assert.equal(ru.$('[data-notation-select]').getAttribute('aria-label'), 'Шаблон диаграммы');
  const en = page(enHtml);
  assert.match([...en.$('[data-notation-select]').options][4].textContent, /object-oriented/);
  assert.equal(en.$('[data-notation-select]').getAttribute('aria-label'), 'Diagram template');
  en.editor.loadTemplate('uml-class');
  await flush();
  assert.equal(en.$('[data-notation-label]').textContent, 'Diagram: UML · Class');
});

test('errors reach the problems panel, the status bar, the banner, the code lines and the Run button', async () => {
  const { $, $$, runner, document } = page(ruHtml, 'local');
  const lines = $$('.code__line code');
  lines[0].textContent = 'diagram dfd';
  lines.slice(1).forEach((line, index) => (line.textContent = index === 0 ? 'flow A -> B' : ''));
  await runner.run();
  assert.match($('.problems__status').textContent, /^Проблем: \d+ \(ошибки: \d+, предупреждения: \d+\)$/);
  const items = $$('.problems__item');
  assert.ok(items.length >= 2);
  assert.equal(items[0].querySelector('.problems__location').getAttribute('href'), '#line-2');
  assert.equal(items[0].querySelector('.problems__location').textContent, 'order.dsl:2');
  assert.equal($('.button--run').getAttribute('aria-disabled'), 'true');
  assert.equal($('.editor-banner').hidden, false);
  assert.match($('.editor-banner__text').textContent, /^Ошибок: /);
  assert.match($('.editor-status__problems').textContent, /⊗ 2/);
  assert.equal($('.problems__count').textContent, String(items.length));
  assert.ok(document.querySelector('#line-2').classList.contains('code__line--error'));
  assert.match(document.querySelector('#line-2').getAttribute('aria-describedby'), /^problem-/);
  assert.equal(document.querySelector('#line-1').hasAttribute('aria-describedby'), false);
  assert.equal($('#run-reason').hidden, false);
});

test('an unknown notation is reported and nothing is drawn', async () => {
  const { $, $$, runner } = page();
  $$('.code__line code')[0].textContent = 'diagram wiring';
  assert.equal(await runner.run(), false);
  assert.equal($('.editor-status__type').textContent, '?');
  assert.match($('.problems__message').textContent, /Неизвестная нотация «wiring»/);
});

test('the English page shows English problem texts', async () => {
  const { $, $$, runner } = page(enHtml);
  $$('.code__line code')[0].textContent = 'diagram uml';
  await runner.run();
  assert.match($('.problems__message').textContent, /Give the UML diagram kind/);
  assert.match($('.problems__status').textContent, /^Problems: 1 \(errors: 1, warnings: 0\)$/);
  assert.equal($('.problems__tab').getAttribute('aria-label'), 'Problems: 1');
});

test('an engine that cannot draw the notation is replaced and the user is told', async () => {
  const { $, $$, api, runner } = page(ruHtml, 'graphviz');
  $$('.code__line code').forEach((line, index) => (line.textContent = TEMPLATES['uml-timing'].split('\n')[index] ?? ''));
  assert.equal(await runner.run(), true);
  assert.equal(api.renderDiagram.mock.calls[0].arguments[1].type, 'plantuml');
  assert.match(api.renderDiagram.mock.calls[0].arguments[0], /^@startuml/);
  assert.match($('.canvas__status').textContent, /Выбранный движок не рисует эту нотацию, использован Kroki · PlantUML\./);
  assert.equal(await runner.run(), true);
  assert.equal(api.renderDiagram.mock.calls.length, 1);
  assert.match($('.canvas__status').textContent, /Выбранный движок не рисует/);
  const same = page(ruHtml, 'graphviz');
  assert.equal(await same.runner.run(), true);
  assert.equal(same.api.renderDiagram.mock.calls[0].arguments[1].type, 'graphviz');
  assert.doesNotMatch(same.$('.canvas__status').textContent, /Выбранный движок/);
  const failing = page(ruHtml, 'graphviz');
  failing.api.renderDiagram.mock.mockImplementation(async () => '<svg');
  failing.$$('.code__line code').forEach((line, index) => (line.textContent = TEMPLATES['uml-timing'].split('\n')[index] ?? ''));
  assert.equal(await failing.runner.run(), false);
});

test('showProblems works on a page with only part of the panel', () => {
  const window = new JSDOM('<!doctype html><html><body><main class="app-page--editor"></main></body></html>').window;
  const main = window.document.querySelector('main');
  showProblems({
    root: window.document,
    page: main,
    problems: [{ line: 1, severity: 'info', code: 'dag-order', params: { order: 'a' } }],
    lang: 'ru',
    file: 'x.dsl',
  });
  showProblems({ root: window.document, page: main, problems: [], lang: 'en', file: 'x.dsl' });
  assert.equal(main.children.length, 0);
});

test('info and warning problems get their own icons and do not block running', async () => {
  const { $, $$, runner } = page(ruHtml, 'local');
  TEMPLATES.dag.split('\n').forEach((text, index) => {
    const line = $$('.code__line code')[index];
    if (line) line.textContent = text;
  });
  $$('.code__line code')
    .slice(TEMPLATES.dag.split('\n').length)
    .forEach((line) => (line.textContent = ''));
  await runner.run();
  assert.equal($('.button--run').getAttribute('aria-disabled'), 'false');
  assert.match($('.problems__list').innerHTML, /problems__icon"/);
  assert.match($('.problems__list').innerHTML, /Критический путь/);
});
