import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { ENGINES, findEngine } from '../../site/js/engines/engines.js';
import { renderLocal } from '../../site/js/engines/local-engine.js';
import { parseDsl, sanitizeSvg, toMermaid, toPlantUml } from '../../site/js/utils/dataParser.js';

const { DOMParser } = new JSDOM('').window;
const parser = new DOMParser();

const SAMPLE = `diagram idef0 "Order process"
box A0 "Process order" {
 input: Order
 output: Invoice
}
box A1 "Ship goods" {
 input: Invoice
}
box A2 "Archive" {
}
arrow A0.output -> A1.input
arrow A1 -> A2
arrow A0 -> Missing`;

const model = () => parseDsl(SAMPLE);

test('the registry lists three Kroki engines and the own engine and falls back to the first', () => {
  assert.deepEqual(
    ENGINES.map((engine) => engine.id),
    ['graphviz', 'mermaid', 'plantuml', 'local'],
  );
  assert.equal(findEngine('local').type, null);
  assert.equal(findEngine('mermaid').type, 'mermaid');
  assert.equal(findEngine('nonsense').id, 'graphviz');
  assert.equal(findEngine(undefined).id, 'graphviz');
});

test('toMermaid builds a flowchart with numbered nodes, details and labelled arrows', () => {
  const text = toMermaid(model());
  assert.match(text, /^flowchart LR/);
  assert.match(text, /n0\["A0 Process order<br\/>input: Order<br\/>output: Invoice"\]/);
  assert.match(text, /n0 -->\|"from: output to: input"\| n1/);
  assert.match(text, /n1 --> n2/);
  assert.doesNotMatch(text, /Missing/);
});

test('toMermaid replaces double quotes inside labels', () => {
  const text = toMermaid({ boxes: [{ id: 'X', name: 'say "hi"', ports: { input: [], control: [], output: [], mechanism: [] } }], arrows: [] });
  assert.match(text, /say #quot;hi#quot;/);
});

test('toPlantUml builds rectangles and arrows and skips arrows to unknown boxes', () => {
  const text = toPlantUml(model());
  assert.match(text, /^@startuml/);
  assert.match(text, /title Order process/);
  assert.match(text, /rectangle "A0 Process order\\ninput: Order\\noutput: Invoice" as n0/);
  assert.match(text, /n0 --> n1 : from: output to: input/);
  assert.match(text, /n1 --> n2\n/);
  assert.doesNotMatch(text, /Missing/);
  assert.match(text, /@enduml$/);
});

test('toPlantUml works without a title and cleans quotes and line breaks', () => {
  const text = toPlantUml({ title: '', boxes: [{ id: 'X', name: 'a "b"\nc', ports: { input: [], control: [], output: [], mechanism: [] } }], arrows: [] });
  assert.doesNotMatch(text, /title/);
  assert.match(text, /rectangle "X a 'b' c" as n0/);
});

test('the own engine draws boxes, arrows and labels as live SVG elements', () => {
  const svgText = renderLocal(model());
  const svg = sanitizeSvg(svgText, parser);
  assert.ok(svg);
  assert.equal(svg.querySelectorAll('.local-engine__box').length, 3);
  assert.equal(svg.querySelectorAll('.local-engine__edge').length, 2);
  assert.match(svg.textContent, /Order process/);
  assert.match(svg.textContent, /from: output to: input/);
  assert.equal(svg.querySelector('[data-id="A1"] title').textContent, 'A1 Ship goods');
});

test('the own engine puts a box one column to the right of what feeds it', () => {
  const svg = sanitizeSvg(renderLocal(model()), parser);
  const x = (id) => Number(svg.querySelector(`[data-id="${id}"] rect`).getAttribute('x'));
  assert.ok(x('A0') < x('A1'));
  assert.ok(x('A1') < x('A2'));
});

test('boxes in the same column are stacked and a model without a title or arrows still draws', () => {
  const svg = sanitizeSvg(
    renderLocal({
      title: '',
      boxes: [
        { id: 'A', name: 'One', ports: { input: ['x'], control: [], output: [], mechanism: [] } },
        { id: 'B', name: 'Two', ports: { input: [], control: [], output: [], mechanism: [] } },
      ],
      arrows: [],
    }),
    parser,
  );
  const y = (id) => Number(svg.querySelector(`[data-id="${id}"] rect`).getAttribute('y'));
  assert.ok(y('A') < y('B'));
  assert.equal(svg.querySelectorAll('.local-engine__edge').length, 0);
});

test('cycles between boxes do not loop forever and the SVG stays valid', () => {
  const cyclic = parseDsl('box A "a"\nbox B "b"\narrow A -> B\narrow B -> A');
  const svg = sanitizeSvg(renderLocal(cyclic), parser);
  assert.ok(svg);
  assert.equal(svg.querySelectorAll('.local-engine__edge').length, 2);
});

test('text from the model is escaped so it cannot add markup', () => {
  const hostile = parseDsl('box A "<script>alert(1)</script>"');
  const svgText = renderLocal(hostile);
  assert.doesNotMatch(svgText, /<script>/);
  assert.ok(sanitizeSvg(svgText, parser));
  const quoted = renderLocal({
    title: 'a & b',
    boxes: [{ id: "it's", name: 'say "x"', ports: { input: [], control: [], output: [], mechanism: [] } }],
    arrows: [],
  });
  assert.match(quoted, /a &amp; b/);
  assert.match(quoted, /it&#39;s/);
  assert.match(quoted, /say &quot;x&quot;/);
});

test('sanitizeSvg removes namespaced and obfuscated script links, animations, styles and external loads', () => {
  const hostile = [
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="http://www.w3.org/1999/xlink">',
    '<a x:href="javascript:alert(1)"><text>one</text></a>',
    '<a href="java&#9;script:alert(1)"><text>two</text></a>',
    '<a href="https://example.com"><text>three</text></a>',
    '<a href="#local"><text>four</text></a>',
    '<a href="data:text/html,x"><text>five</text></a>',
    '<a href="#"><set attributeName="href" to="javascript:alert(1)"/></a>',
    '<style>@import url(https://evil.test/x.css);</style>',
    '<use href="https://evil.test/x.svg#a"/>',
    '<image href="https://evil.test/pixel.png"/>',
    '<rect style="fill:url(https://evil.test/a)" width="1" height="1"/>',
    '<rect style="fill:red" width="1" height="1"/>',
    '</svg>',
  ].join('');
  const svg = sanitizeSvg(hostile, parser);
  const links = [...svg.querySelectorAll('a')];
  assert.equal(links[0].attributes.length, 0);
  assert.equal(links[1].hasAttribute('href'), false);
  assert.equal(links[2].getAttribute('href'), 'https://example.com');
  assert.equal(links[3].getAttribute('href'), '#local');
  assert.equal(links[4].hasAttribute('href'), false);
  for (const tag of ['set', 'style', 'use', 'image']) assert.equal(svg.querySelector(tag), null, tag);
  const rects = svg.querySelectorAll('rect');
  assert.equal(rects[0].hasAttribute('style'), false);
  assert.equal(rects[1].getAttribute('style'), 'fill:red');
});
