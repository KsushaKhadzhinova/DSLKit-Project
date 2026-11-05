import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { renderLocal } from '../../site/js/engines/local-engine.js';
import { TEMPLATES, parseDiagram, renderNotation } from '../../site/js/notations/index.js';
import { sanitizeSvg } from '../../site/js/utils/dataParser.js';

const parser = new new JSDOM('').window.DOMParser();
const draw = (source) => sanitizeSvg(renderNotation(parseDiagram(source)), parser);
const box = (svg, id) => svg.querySelector(`[data-id="${id}"] rect`);
const number = (element, name) => Number(element.getAttribute(name));

test('IDEF0 draws boundary arrows on the standard sides: input left, control top, output right, mechanism bottom', () => {
  const svg = draw('diagram idef0\nbox A1 "Work" {\n input: In\n control: Rule\n output: Out\n mechanism: Tool\n}');
  const rect = box(svg, 'A1');
  const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((name) => number(rect, name));
  const paths = [...svg.querySelectorAll('[data-id="A1"] path')].map((path) => path.getAttribute('d'));
  assert.equal(paths.length, 4);
  const shift = (value) => value;
  assert.ok(
    paths.some((d) => d.startsWith(`M${shift(x - 56)} `) && d.endsWith(`H${x}`)),
    'input comes in from the left',
  );
  assert.ok(
    paths.some((d) => d.includes(`V${y}`) && d.startsWith(`M${x + w / 2} ${y - 56}`)),
    'control comes in from the top',
  );
  assert.ok(
    paths.some((d) => d.startsWith(`M${x + w} `) && d.includes(`H${x + w + 56}`)),
    'output leaves to the right',
  );
  assert.ok(
    paths.some((d) => d.startsWith(`M${x + w / 2} ${y + h + 56}`) && d.endsWith(`V${y + h}`)),
    'mechanism comes in from the bottom',
  );
  ['In', 'Rule', 'Out', 'Tool'].forEach((label) => assert.ok(svg.textContent.includes(label), label));
  assert.match(svg.textContent, /A1/);
});

test('IDEF0 arrows between boxes enter the target on the side of their port and use up the matching labels', () => {
  const source = [
    'diagram idef0',
    'box A1 "One" {',
    ' output: Draft',
    ' output: Spare',
    '}',
    'box A2 "Two" {',
    ' input: Draft',
    ' control: Draft rule',
    '}',
    'box A3 "Three" {',
    '}',
    'arrow A1.output -> A2.input',
    'arrow A1 -> A2.control',
    'arrow A1.output -> A3.mechanism',
    'arrow A2.output -> A3',
    'arrow A1.output -> A2.output',
    'arrow A1 -> Ghost',
  ].join('\n');
  const svg = draw(source);
  assert.equal(svg.querySelectorAll('.local-engine__edge').length, 4);
  const edges = [...svg.querySelectorAll('.local-engine__edge')].map((edge) => edge.getAttribute('d'));
  assert.ok(edges.every((d) => d.startsWith('M')));
  assert.match(edges[0], /^M[\d.]+ [\d.]+H[\d.]+V[\d.]+H[\d.]+$/);
  assert.match(edges[1], /^M[\d.]+ [\d.]+H[\d.]+V[\d.]+$/);
  assert.match(svg.textContent, /Spare/);
  assert.equal(svg.textContent.includes('Draft rule'), false);
  assert.ok(sanitizeSvg(renderNotation(parseDiagram(source)), parser));
});

test('the IDEF0 template and an empty IDEF0 diagram both draw, and a bare legacy model keeps the original renderer', () => {
  const model = parseDiagram(TEMPLATES.idef0);
  const svg = sanitizeSvg(renderNotation(model), parser);
  assert.equal(svg.querySelectorAll('.local-engine__box').length, 3);
  assert.equal(svg.querySelectorAll('.local-engine__edge').length, 2);
  assert.ok(sanitizeSvg(renderNotation(parseDiagram('diagram idef0')), parser));
  assert.match(renderLocal({ title: '', boxes: [], arrows: [] }), /<svg/);
  assert.match(renderLocal(parseDiagram(TEMPLATES.idef0)), /A1/);
});
