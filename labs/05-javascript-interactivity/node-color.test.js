import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTATIONS, NOTATION_KEYS, TEMPLATES, parseDiagram } from '../../site/js/notations/index.js';
import { inkOn, isColor, normalizeColor } from '../../site/js/utils/color.js';
import { contrast } from '../../tools/contrast.js';
import { colorSupported, propertiesOf, setColor } from '../../site/js/utils/node-properties.js';
import { formatProblem } from '../../site/js/notations/messages.js';
import { exportText } from '../../site/js/export/text-formats.js';

const DFD = TEMPLATES.dfd;
const painted = (color) => DFD.replace('process 2 "Take payment"', `process 2 "Take payment" color=${color}`);

test('only #rgb and #rrggbb are colours', () => {
  for (const good of ['#fff', '#FFF', '#ff8800', '#AbCdEf']) assert.equal(isColor(good), true, good);
  const bad = [
    '',
    '#',
    '#ff',
    '#ffff',
    '#fffff',
    '#fffffff',
    '#ggg',
    'ff8800',
    'red',
    'rgb(0,0,0)',
    'red;background:url(http://x)',
    '#fff;x',
    '#fff"',
    "#fff'",
    '#fff</style>',
    '#fff\n',
    '#fff\u0000',
    ' #fff',
    '#fff ',
    `#${'f'.repeat(5000)}`,
    null,
    undefined,
    255,
    {},
  ];
  for (const value of bad) assert.equal(isColor(value), false, String(value));
});

test('a colour is normalised to six lower-case digits', () => {
  assert.equal(normalizeColor('#FA0'), '#ffaa00');
  assert.equal(normalizeColor('#AbCdEf'), '#abcdef');
});

test('the text ink has a contrast of at least 4.5 on every colour of the 4096 short ones', () => {
  for (let value = 0; value < 4096; value += 1) {
    const color = `#${value.toString(16).padStart(3, '0')}`;
    const full = normalizeColor(color);
    assert.ok(contrast(inkOn(color), full) >= 4.5, color);
  }
  assert.equal(inkOn('#ffffff'), '#000000');
  assert.equal(inkOn('#000'), '#ffffff');
});

test('a block with a colour on its line is read with it; the code of the colour is checked by the strict rules', () => {
  const model = parseDiagram(painted('#ff8800'));
  assert.equal(model.nodes.find((node) => node.id === '2').attrs.color, '#ff8800');
  assert.equal(model.problems.filter((item) => item.severity === 'error').length, 0);
});

test('a wrong colour is an error with a clear message in both languages', () => {
  for (const value of ['red', '#12', '#ggg', '#fffffff']) {
    const found = parseDiagram(painted(value)).problems.find((item) => item.code === 'strict-color');
    assert.ok(found, value);
    assert.equal(found.severity, 'error');
    assert.match(formatProblem(found, 'ru'), /неверный цвет .*color=#ff8800/);
    assert.match(formatProblem(found, 'en'), /wrong colour .*color=#ff8800/);
  }
  // Values with brackets or quotes do not even read as an attribute: an error all the same.
  for (const value of ['rgb(1,2,3)', 'red;background:url(x)', '#fff"x'])
    assert.ok(
      parseDiagram(painted(value)).problems.some((item) => item.severity === 'error'),
      value,
    );
});

test('the drawing paints the block with the colour and picks a readable text', () => {
  const svg = NOTATIONS.dfd.render(parseDiagram(painted('#102030')));
  assert.match(svg, /<g class="notation__node" data-id="2"[^>]*>[\s\S]*?fill="#102030"[\s\S]*?<\/g>/);
  const block = /<g class="notation__node" data-id="2"[\s\S]*?<\/g>/.exec(svg)[0];
  assert.match(block, /<text[^>]*fill="#ffffff"/);
  const light = /<g class="notation__node" data-id="2"[\s\S]*?<\/g>/.exec(NOTATIONS.dfd.render(parseDiagram(painted('#ffee99'))))[0];
  assert.match(light, /<text[^>]*fill="#000000"/);
});

test('a colour that is not valid never reaches the drawing', () => {
  const attacks = ['red;background:url(http://evil)', '#fff"onload="alert(1)', '#fff</style><script>', 'x'.repeat(3000), '#12345'];
  for (const attack of attacks) {
    const svg = NOTATIONS.dfd.render(parseDiagram(painted(attack)));
    assert.equal(svg.includes('evil'), false, attack);
    assert.equal(svg.includes('onload'), false, attack);
    assert.equal(svg.includes('<script'), false, attack);
    assert.equal(svg.includes('xxxxxxxx'), false, attack);
  }
});

test('shapes of every graph notation take the colour, and the text keeps its contrast', () => {
  for (const key of NOTATION_KEYS.filter((item) => colorSupported(item))) {
    const code = TEMPLATES[key];
    const id = parseDiagram(code).nodes.find((node) => propertiesOf(code, node.id))?.id;
    if (id === undefined) continue;
    const next = setColor(code, id, '#336699');
    assert.ok(next, key);
    const svg = NOTATIONS[key].render(parseDiagram(next));
    assert.ok(svg.includes('#336699'), key);
  }
});

test('colour support: graph notations have it, class and entity-relationship do not', () => {
  assert.equal(colorSupported('dfd'), true);
  assert.equal(colorSupported('bpmn'), true);
  assert.equal(colorSupported('uml-class'), false);
  assert.equal(colorSupported('erd'), false);
  assert.equal(colorSupported('nothing'), false);
  assert.equal(colorSupported(undefined), false);
});

test('the properties of a block tell its colour and whether its notation can have one', () => {
  assert.equal(propertiesOf(DFD, '2').colorSupported, true);
  assert.equal(propertiesOf(DFD, '2').color, null);
  assert.equal(propertiesOf(painted('#ABC'), '2').color, '#ABC');
});

test('the colour is written into the line of the block as color=#rrggbb and replaces an old one', () => {
  const next = setColor(DFD, '2', '#FF8800');
  assert.match(next, /^process 2 "Take payment" color=#ff8800$/m);
  assert.equal(next.split('\n').length, DFD.split('\n').length);
  const again = setColor(next, '2', '#00f');
  assert.match(again, /^process 2 "Take payment" color=#0000ff$/m);
  assert.equal(again.match(/color=/g).length, 1);
});

test('the colour goes before pos=, so pos= stays last as the editor writes it', () => {
  const placed = DFD.replace('process 2 "Take payment"', 'process 2 "Take payment" pos=10x20');
  const next = setColor(placed, '2', '#123456');
  assert.match(next, /^process 2 "Take payment" color=#123456 pos=10x20$/m);
});

test('clearing the colour removes the attribute; clearing a block without one changes nothing', () => {
  const next = setColor(setColor(DFD, '2', '#ff8800'), '2', null);
  assert.equal(next, DFD);
  assert.equal(setColor(DFD, '2', null), DFD);
});

test('setColor refuses a wrong colour, an unknown block and a notation without colour', () => {
  for (const attack of ['red', 'red;background:url(x)', '#fff"', '#fff\n', '#12', `#${'f'.repeat(999)}`, '', 12])
    assert.equal(setColor(DFD, '2', attack), null, String(attack));
  assert.equal(setColor(DFD, 'nobody', '#fff'), null);
  const classCode = 'diagram uml class "T"\nclass A "a"';
  assert.equal(colorSupported('uml-class'), false);
  assert.equal(setColor(classCode, 'A', '#fff'), null);
});

test('a colour in a label is not a colour: only the attribute outside quotes counts', () => {
  const code = DFD.replace('process 2 "Take payment"', 'process 2 "say color=#ff0000"');
  assert.equal(propertiesOf(code, '2').color, null);
  assert.match(setColor(code, '2', '#00ff00'), /^process 2 "say color=#ff0000" color=#00ff00$/m);
});

test('the Mermaid text carries the colour as a style line; the PlantUML text as a colour of the element', () => {
  const code = setColor(DFD, '2', '#ff8800');
  const mermaid = exportText(code, 'mermaid');
  assert.equal(mermaid.ok, true);
  assert.match(mermaid.text, /^ {2}style \S+ fill:#ff8800,color:#000000$/m);
  const plantuml = exportText(code, 'plantuml');
  assert.match(plantuml.text, /^.+ as \S+ #ff8800$/m);
  assert.equal(exportText(DFD, 'mermaid').text.includes('style '), false);
});

test('a notation whose text format has no colour exports without it and says so', () => {
  assert.equal(exportText(TEMPLATES['uml-sequence'], 'mermaid').colorIgnored, false);
  assert.equal(exportText(setColor(DFD, '2', '#ff8800'), 'mermaid').colorIgnored, false);
  const state = TEMPLATES['uml-state'];
  const id = parseDiagram(state).nodes.find((node) => node.kind === 'state').id;
  for (const format of ['mermaid', 'plantuml']) {
    const result = exportText(setColor(state, id, '#ff8800'), format);
    assert.equal(result.ok, true);
    assert.equal(result.colorIgnored, true, format);
    assert.equal(result.text.includes('#ff8800'), false);
  }
});
